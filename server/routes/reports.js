// server/routes/reports.js
const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const rateLimit = require('express-rate-limit');

const mutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please slow down.' }
});

const authMiddleware = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// multer setup storing in uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${unique}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimetypes = ['image/jpeg','image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimetypes.includes(file.mimetype)) {
    cb(null, true);
  }
  else{
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, GIF and WEBP images are allowed.'), false);
  }
}
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: fileFilter }); // 5MB limit

// helper
function computeTimeOfDay(date = new Date()) {
  const h = date.getHours();
  return (h >= 18 || h < 6) ? 'night' : 'day';
}

// GET /api/reports/admin/all - ADMIN ONLY - Get ALL reports including deleted
// MUST be before GET / route
router.get('/admin/all', async (req, res) => {
  try {
    // Check admin password
    const adminPassword = req.headers['x-admin-password'];
    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    const { bbox, categories, since, limit = 2000 } = req.query;
    const filter = {}; // No status filter - include ALL reports
    
    if (categories) filter.category = { $in: categories.split(',') };
    if (since) filter.timestamp = { $gte: new Date(since) };
    if (bbox) {
      const [lng1, lat1, lng2, lat2] = bbox.split(',').map(Number);
      filter.location = { $geoWithin: { $box: [[lng1, lat1], [lng2, lat2]] } };
    }
    const reports = await Report.find(filter).limit(Math.min(parseInt(limit, 10), 5000)).sort({ timestamp: -1 }).lean();
    const features = reports.map(r => ({
      type: 'Feature',
      geometry: r.location,
      properties: r
    }));
    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error('GET /api/reports/admin/all', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports
router.get('/', async (req, res) => {
  try {
    const { bbox, categories, since, limit = 100 } = req.query;
    const filter = { status: { $ne: 'deleted' } }; // Exclude deleted reports
    
    if (categories) filter.category = { $in: categories.split(',') };
    if (since) filter.timestamp = { $gte: new Date(since) };
    if (bbox) {
      const [lng1, lat1, lng2, lat2] = bbox.split(',').map(Number);
      filter.location = { $geoWithin: { $box: [[lng1, lat1], [lng2, lat2]] } };
    }
    const reports = await Report.find(filter).limit(Math.min(parseInt(limit, 10), 2000)).lean();
    const features = reports.map(r => ({
      type: 'Feature',
      geometry: r.location,
      properties: r
    }));
    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error('GET /api/reports', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/reports  (multipart/form-data or JSON)
router.post('/',mutationLimiter, authMiddleware, upload.single('photo'), async (req, res) => {
    try {
      const { title, description = '', category = 'other', lat, lng, timeOfDay } = req.body;
      if (!title || !lat || !lng) return res.status(400).json({ error: 'title, lat and lng required' });
  
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      // Validate coordinates - check NaN first!
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: 'Coordinates must be valid numbers' });
      }

      if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ error: 'Latitude must be between -90 and 90' });
    }

      if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Longitude must be between -180 and 180' });
    }
  
      const photoUrl = req.file ? `/uploads/${req.file.filename}` : req.body.photoUrl || null;
      const rep = new Report({
        title: title.trim(),
        description: description.trim(),
        category,
        location: { type: 'Point', coordinates: [longitude, latitude] },
        timeOfDay: timeOfDay || computeTimeOfDay(),
        photoUrl
      });
      await rep.save();
      res.json({ success: true, report: rep });
    } catch (err) {
      console.error('POST /api/reports', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

// POST /api/reports/:id/upvote
router.post('/:id/upvote', mutationLimiter, authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required to vote' });
    }
    
    // Validate ObjectId format
    if (!id || id === 'undefined' || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid report ID format' });
    }
    
    const rep = await Report.findByIdAndUpdate(
      id, 
      { $inc: { upvotes: 1 } }, 
      { new: true, runValidators: true }
    );
    
    if (!rep) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({ 
      success: true, 
      upvotes: rep.upvotes || 0, 
      downvotes: rep.downvotes || 0 
    });
  } catch (err) {
    console.error('POST upvote error:', err);
    res.status(500).json({ message: 'Failed to upvote report' });
  }
});

// POST /api/reports/:id/downvote
router.post('/:id/downvote', mutationLimiter, authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required to vote' });
    }
    
    // Validate ObjectId format
    if (!id || id === 'undefined' || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid report ID format' });
    }
    
    const rep = await Report.findByIdAndUpdate(
      id, 
      { $inc: { downvotes: 1 } }, 
      { new: true, runValidators: true }
    );
    
    if (!rep) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({ 
      success: true, 
      upvotes: rep.upvotes || 0, 
      downvotes: rep.downvotes || 0 
    });
  } catch (err) {
    console.error('POST downvote error:', err);
    res.status(500).json({ message: 'Failed to downvote report' });
  }
});

// DELETE /api/reports/:id - ADMIN ONLY (Soft Delete)
router.delete('/:id', mutationLimiter, async (req, res) => {
  try {
    // Check admin password
    const adminPassword = req.headers['x-admin-password'];
    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    
    // Validate ObjectId format
    if (!id || id === 'undefined' || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid report ID format' });
    }

    // Soft delete: Update status to 'deleted' instead of removing from database
    const deletedReport = await Report.findByIdAndUpdate(
      id,
      { 
        status: 'deleted',
        deletedAt: new Date()
      },
      { new: true }
    );
    
    if (!deletedReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ 
      success: true, 
      message: 'Report removed from map (archived)',
      deletedId: id 
    });
  } catch (err) {
    console.error('DELETE report error:', err);
    res.status(500).json({ message: 'Failed to delete report' });
  }
});

// PUT /api/reports/:id/status  body: { status } - ADMIN ONLY
router.put('/:id/status', mutationLimiter, async (req, res) => {
  try {
    // Check admin password
    const adminPassword = req.headers['x-admin-password'];
    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    const { status } = req.body;
    if (!['open','verified'].includes(status)) return res.status(400).json({ error: 'invalid status' });
    const rep = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!rep) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, report: rep });
  } catch (err) {
    console.error('PUT status', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// in server/routes/reports.js - add below existing routes

// HEAD /export (quick auth check)
// Helper function to verify admin
const verifyAdmin = (req, res, next) => {
  const adminPass = req.headers['x-admin-password'];
  
  if (!adminPass) {
    return res.status(401).json({ error: 'Admin password required' });
  }
  
  if (!process.env.ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD not set in environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  if (adminPass !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  
  next();
};

// HEAD /export (quick auth check)
router.head('/export', verifyAdmin, (req, res) => {
  res.status(200).end();
});

// GET /export - use POST body instead of query params
router.post('/export', verifyAdmin, async (req, res) => {
  try {
    const { since, categories } = req.body; // Changed from req.query

    const filter = {};
    if (since) filter.timestamp = { $gte: new Date(since) };
    if (categories) filter.category = { $in: categories.split(',') };

    const reports = await Report.find(filter).lean();

    const fileName = `reports_export_${Date.now()}.csv`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: '_id', title: 'id' },
        { id: 'title', title: 'title' },
        { id: 'description', title: 'description' },
        { id: 'category', title: 'category' },
        { id: 'lat', title: 'lat' },
        { id: 'lng', title: 'lng' },
        { id: 'timestamp', title: 'timestamp' },
        { id: 'status', title: 'status' },
        { id: 'upvotes', title: 'upvotes' },
        { id: 'photoUrl', title: 'photoUrl' }
      ]
    });

    const records = reports.map(r => ({
      _id: r._id.toString(),
      title: r.title,
      description: r.description,
      category: r.category,
      lat: r.location.coordinates[1],
      lng: r.location.coordinates[0],
      timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : '',
      status: r.status,
      upvotes: r.upvotes,
      photoUrl: r.photoUrl || ''
    }));

    await csvWriter.writeRecords(records);
    
    res.download(filePath, `streetsense_reports_${Date.now()}.csv`, (err) => {
      if (err) console.error('Download error:', err);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('File cleanup error:', unlinkErr);
      });
    });
  } catch (err) {
    console.error('GET export', err);
    res.status(500).json({ message: 'Server error' });
  }
});  

module.exports = router;

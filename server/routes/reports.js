// server/routes/reports.js
const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

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
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// helper
function computeTimeOfDay(date = new Date()) {
  const h = date.getHours();
  return (h >= 18 || h < 6) ? 'night' : 'day';
}

// GET /api/reports
// optional query: bbox=lng1,lat1,lng2,lat2  categories=cat1,cat2  since=ISODate limit=100
router.get('/', async (req, res) => {
  try {
    const { bbox, categories, since, limit = 100 } = req.query;
    const filter = {};
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
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/reports  (multipart/form-data or JSON)
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { title, description = '', category = 'other', lat, lng, timeOfDay } = req.body;
    if (!title || !lat || !lng) return res.status(400).json({ error: 'title, lat and lng required' });

    const photoUrl = req.file ? `/uploads/${req.file.filename}` : req.body.photoUrl || null;
    const rep = new Report({
      title: title.trim(),
      description: description.trim(),
      category,
      location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      timeOfDay: timeOfDay || computeTimeOfDay(),
      photoUrl
    });
    await rep.save();
    res.json({ success: true, report: rep });
  } catch (err) {
    console.error('POST /api/reports', err);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /api/reports/:id/upvote
router.post('/:id/upvote', async (req, res) => {
  try {
    const rep = await Report.findByIdAndUpdate(req.params.id, { $inc: { upvotes: 1 } }, { new: true });
    if (!rep) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, upvotes: rep.upvotes });
  } catch (err) {
    console.error('POST upvote', err);
    res.status(500).json({ error: 'server error' });
  }
});

// PUT /api/reports/:id/status  body: { status }
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open','verified','resolved'].includes(status)) return res.status(400).json({ error: 'invalid status' });
    const rep = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!rep) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, report: rep });
  } catch (err) {
    console.error('PUT status', err);
    res.status(500).json({ error: 'server error' });
  }
});

// in server/routes/reports.js - add below existing routes

// HEAD /export (quick auth check)
router.head('/export', (req, res) => {
    try {
      const pwd = req.query.admin_password || '';
      if (!process.env.ADMIN_PASSWORD || pwd !== process.env.ADMIN_PASSWORD) {
        return res.status(401).end();
      }
      return res.status(200).end();
    } catch (err) {
      console.error('HEAD export error', err);
      return res.status(500).end();
    }
  });
  
  // GET /export?since=...&categories=a,b&admin_password=xxx
  router.get('/export', async (req, res) => {
    try {
      const { since, categories } = req.query;
      const pwd = req.query.admin_password || '';
      if (!process.env.ADMIN_PASSWORD || pwd !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'unauthorized' });
      }
  
      const filter = {};
      if (since) filter.timestamp = { $gte: new Date(since) };
      if (categories) filter.category = { $in: categories.split(',') };
  
      const reports = await Report.find(filter).lean();
  
      // Build CSV
      const csvWriter = createObjectCsvWriter({
        path: path.join(UPLOAD_DIR, `reports_export_${Date.now()}.csv`),
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
      const fileName = fs.readdirSync(UPLOAD_DIR).filter(f => f.startsWith('reports_export_')).pop();
      const filePath = path.join(UPLOAD_DIR, fileName);
      res.download(filePath);
    } catch (err) {
      console.error('GET export', err);
      res.status(500).json({ error: 'server error' });
    }
  });
  

module.exports = router;

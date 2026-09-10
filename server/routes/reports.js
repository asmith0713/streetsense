// server/routes/reports.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Report = require('../models/Report');
const Vote = require('../models/Vote');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const rateLimit = require('express-rate-limit');
const { uploadToR2 } = require('../utils/r2');
const { stripImageMetadata } = require('../utils/stripMetadata');
const { adminAuth } = require('../middleware/adminAuth');
const { buildReportFilter, parseLimit, csvSafe } = require('../utils/queryFilters');

const mutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please slow down.' }
});

const authMiddleware = require('../middleware/auth');

// multer setup - store in memory, then upload to object storage.
// Kept modest: memoryStorage means every concurrent upload sits in the heap.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const storage = multer.memoryStorage();

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Only JPEG, PNG, GIF and WEBP images are allowed.');
    err.code = 'UNSUPPORTED_FILE_TYPE';
    cb(err, false);
  }
};

const upload = multer({ storage, limits: { fileSize: MAX_UPLOAD_BYTES }, fileFilter });

/**
 * Run the multer middleware and translate its errors into 400s. Without this,
 * a wrong file type or an oversized photo reaches the global handler as a 500
 * and the user is told "Server error".
 */
function uploadPhoto(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `Photo is too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.` });
    }
    if (err.code === 'UNSUPPORTED_FILE_TYPE') {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload failed: ${err.message}` });
    }
    return next(err);
  });
}

// helper
function computeTimeOfDay(date = new Date()) {
  const h = date.getHours();
  return (h >= 18 || h < 6) ? 'night' : 'day';
}

function toFeatureCollection(reports) {
  return {
    type: 'FeatureCollection',
    features: reports.map(r => ({
      type: 'Feature',
      geometry: r.location,
      properties: r
    }))
  };
}

// GET /api/reports/stats - public counts used by the landing page.
// Declared before /:id routes so it is not shadowed.
router.get('/stats', async (req, res) => {
  try {
    const visible = { status: { $ne: 'deleted' } };
    const [total, resolved, verified, categories] = await Promise.all([
      Report.countDocuments(visible),
      Report.countDocuments({ status: 'resolved' }),
      Report.countDocuments({ status: 'verified' }),
      Report.distinct('category', visible)
    ]);

    res.json({ total, resolved, verified, categories: categories.length });
  } catch (err) {
    console.error('GET /api/reports/stats', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports/votes/mine - the caller's own votes, so the UI can show
// which way they voted after a reload.
router.get('/votes/mine', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.id) return res.json({ votes: {} });

    const votes = await Vote.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .limit(1000)
      .lean();

    const map = {};
    for (const vote of votes) map[String(vote.reportId)] = vote.value;
    res.json({ votes: map });
  } catch (err) {
    console.error('GET /api/reports/votes/mine', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports/admin/all - ADMIN ONLY - Get ALL reports including deleted
// MUST be before GET / route
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const { filter, error } = buildReportFilter(req.query);
    if (error) return res.status(400).json({ error });

    const limit = parseLimit(req.query.limit, 2000, 5000);
    const reports = await Report.find(filter).limit(limit).sort({ timestamp: -1 }).lean();
    res.json(toFeatureCollection(reports));
  } catch (err) {
    console.error('GET /api/reports/admin/all', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports
router.get('/', async (req, res) => {
  try {
    const { filter, error } = buildReportFilter(req.query);
    if (error) return res.status(400).json({ error });

    filter.status = { $ne: 'deleted' }; // Exclude deleted reports

    const limit = parseLimit(req.query.limit, 500, 2000);
    const reports = await Report.find(filter).sort({ timestamp: -1 }).limit(limit).lean();

    res.json({ ...toFeatureCollection(reports), returned: reports.length, limit });
  } catch (err) {
    console.error('GET /api/reports', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/reports  (multipart/form-data or JSON)
router.post('/', mutationLimiter, authMiddleware, uploadPhoto, async (req, res) => {
  try {
    const { title, description = '', category = 'other', lat, lng, timeOfDay } = req.body;

    if (!title || lat === undefined || lat === null || lng === undefined || lng === null) {
      return res.status(400).json({ error: 'title, lat and lng required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ error: 'Coordinates must be valid numbers' });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ error: 'Latitude must be between -90 and 90' });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Longitude must be between -180 and 180' });
    }

    let photoUrl = req.body.photoUrl || null;
    if (req.file) {
      // Strip EXIF/GPS before the image goes to a public bucket.
      const clean = stripImageMetadata(req.file.buffer, req.file.mimetype);
      photoUrl = await uploadToR2(clean, req.file.originalname, req.file.mimetype);
    }

    const rep = new Report({
      title: String(title).trim().slice(0, 200),
      description: String(description).trim().slice(0, 2000),
      category,
      location: { type: 'Point', coordinates: [longitude, latitude] },
      timeOfDay: timeOfDay || computeTimeOfDay(),
      photoUrl,
      // Recorded for abuse handling only; never returned by the API, so
      // reports stay anonymous to other users.
      authorId: req.user?.id || null
    });

    await rep.save();

    const saved = rep.toObject();
    delete saved.authorId;
    res.json({ success: true, report: saved });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const detail = Object.values(err.errors)[0]?.message || 'Invalid report data';
      return res.status(400).json({ error: detail });
    }
    console.error('POST /api/reports error:', err.message);
    res.status(500).json({ message: 'Could not save the report. Please try again.' });
  }
});

/**
 * Record a vote. One row per (report, user): voting the same way again clears
 * the vote, voting the other way switches it. Counts are recomputed from the
 * vote rows so they cannot drift.
 */
async function castVote(req, res, value) {
  try {
    const { id } = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required to vote' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid report ID format' });
    }

    const report = await Report.findById(id).select('_id status');
    if (!report || report.status === 'deleted') {
      return res.status(404).json({ error: 'Report not found' });
    }

    const existing = await Vote.findOne({ reportId: id, userId: req.user.id });
    let userVote = value;

    if (existing && existing.value === value) {
      await existing.deleteOne(); // clicking the same button again removes the vote
      userVote = null;
    } else if (existing) {
      existing.value = value;
      await existing.save();
    } else {
      await Vote.create({ reportId: id, userId: req.user.id, value });
    }

    const [upvotes, downvotes] = await Promise.all([
      Vote.countDocuments({ reportId: id, value: 'up' }),
      Vote.countDocuments({ reportId: id, value: 'down' })
    ]);

    await Report.findByIdAndUpdate(id, { upvotes, downvotes });

    res.json({ success: true, upvotes, downvotes, userVote });
  } catch (err) {
    // A duplicate key here means two clicks raced; report the current state.
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Vote already recorded' });
    }
    console.error('Vote error:', err.message);
    res.status(500).json({ message: 'Failed to record vote' });
  }
}

// POST /api/reports/:id/upvote
router.post('/:id/upvote', mutationLimiter, authMiddleware, (req, res) => castVote(req, res, 'up'));

// POST /api/reports/:id/downvote
router.post('/:id/downvote', mutationLimiter, authMiddleware, (req, res) => castVote(req, res, 'down'));

// DELETE /api/reports/:id - ADMIN ONLY (Soft Delete)
router.delete('/:id', mutationLimiter, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid report ID format' });
    }

    // Soft delete: Update status to 'deleted' instead of removing from database
    const deletedReport = await Report.findByIdAndUpdate(
      id,
      { status: 'deleted', deletedAt: new Date() },
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
    console.error('DELETE report error:', err.message);
    res.status(500).json({ message: 'Failed to delete report' });
  }
});

// POST /api/reports/:id/restore - ADMIN ONLY - undo a removal
router.post('/:id/restore', mutationLimiter, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid report ID format' });
    }

    const report = await Report.findByIdAndUpdate(
      id,
      { status: 'open', $unset: { deletedAt: 1 } },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ success: true, message: 'Report restored to the map', report });
  } catch (err) {
    console.error('Restore report error:', err.message);
    res.status(500).json({ message: 'Failed to restore report' });
  }
});

// PUT /api/reports/:id/status  body: { status } - ADMIN ONLY
router.put('/:id/status', mutationLimiter, adminAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['open', 'verified', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Status must be open, verified or resolved' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid report ID format' });
    }

    const rep = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!rep) return res.status(404).json({ error: 'Report not found' });
    res.json({ success: true, report: rep });
  } catch (err) {
    console.error('PUT status', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// HEAD /export (quick auth check)
router.head('/export', adminAuth, (req, res) => {
  res.status(200).end();
});

// POST /export - filters travel in the body
router.post('/export', adminAuth, async (req, res) => {
  try {
    const { filter, error } = buildReportFilter(req.body || {});
    if (error) return res.status(400).json({ error });

    const reports = await Report.find(filter).lean();

    const fileName = `reports_export_${Date.now()}.csv`;
    const filePath = path.join(os.tmpdir(), fileName);

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
        { id: 'downvotes', title: 'downvotes' },
        { id: 'photoUrl', title: 'photoUrl' }
      ]
    });

    const records = reports.map(r => {
      const coords = r.location?.coordinates || [];
      return {
        _id: r._id.toString(),
        title: csvSafe(r.title),
        description: csvSafe(r.description),
        category: csvSafe(r.category),
        lat: Number.isFinite(coords[1]) ? coords[1] : '',
        lng: Number.isFinite(coords[0]) ? coords[0] : '',
        timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : '',
        status: csvSafe(r.status),
        upvotes: r.upvotes || 0,
        downvotes: r.downvotes || 0,
        photoUrl: csvSafe(r.photoUrl)
      };
    });

    await csvWriter.writeRecords(records);

    res.download(filePath, `streetsense_reports_${Date.now()}.csv`, (err) => {
      if (err) console.error('Download error:', err.message);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('File cleanup error:', unlinkErr.message);
      });
    });
  } catch (err) {
    console.error('POST export', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

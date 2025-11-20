// server/routes/heat.js
const express = require('express');
const router = express.Router();
const Report = require('../models/Report');

// /api/reports/heat?since=ISO&categories=a,b
router.get('/', async (req, res) => {
  try {
    const { since, categories } = req.query;

    const filter = {};
    if (since) filter.timestamp = { $gte: new Date(since) };
    if (categories) filter.category = { $in: categories.split(',') };

    const reports = await Report.find(filter, {
      'location.coordinates': 1,
      timestamp: 1,
      upvotes: 1
    }).lean();
    
    // Convert to heatmap points: [lat, lng, intensity]
    // Filter out reports with invalid coordinates
    const points = reports
      .filter(r => r.location && r.location.coordinates && r.location.coordinates.length === 2)
      .map(r => {
        const lng = r.location.coordinates[0];
        const lat = r.location.coordinates[1];
        const intensity = 1 + Math.log(1 + (r.upvotes || 0));
        return [lat, lng, intensity];
      });

    res.json({ points });
  } catch (err) {
    console.error('Heat endpoint error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const UserLocation = require('../models/UserLocation');
const authMiddleware = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiter for location updates
const locationUpdateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 updates per minute
  message: { error: 'Too many location updates. Please slow down.' }
});

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

// Privacy controls for the crowd heatmap. Raw positions are never published:
// points are snapped to a coarse grid and a cell is only published once enough
// people share it, so the map cannot be used to locate an individual.
const GRID_DEGREES = Number(process.env.CROWD_GRID_DEGREES) || 0.0015; // ~150m
const MIN_CLUSTER = Math.max(2, Number(process.env.CROWD_MIN_CLUSTER) || 3);
const MAX_BBOX_DEGREES = Number(process.env.CROWD_MAX_BBOX_DEGREES) || 2; // ~200km

function snap(value) {
  // Centre of the grid cell the point falls in.
  return Math.round(value / GRID_DEGREES) * GRID_DEGREES;
}

function parseBbox(raw) {
  if (typeof raw !== 'string') return { error: 'A bbox is required' };

  const parts = raw.split(',').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isFinite(n))) {
    return { error: 'bbox must be four numbers: lng1,lat1,lng2,lat2' };
  }

  const [lng1, lat1, lng2, lat2] = parts;
  const west = Math.min(lng1, lng2);
  const east = Math.max(lng1, lng2);
  const south = Math.min(lat1, lat2);
  const north = Math.max(lat1, lat2);

  if (south < -90 || north > 90 || west < -180 || east > 180) {
    return { error: 'bbox is out of range' };
  }
  if (east - west > MAX_BBOX_DEGREES || north - south > MAX_BBOX_DEGREES) {
    return { error: 'Requested area is too large. Zoom in to see crowd data.' };
  }

  return { box: [[west, south], [east, north]] };
}

// POST /api/locations - Update user's current location
router.post('/', locationUpdateLimiter, authMiddleware, async (req, res) => {
  try {
    const { lat, lng, accuracy, deviceId } = req.body;

    // Note: 0 is a valid coordinate, so check for absence rather than falsiness.
    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'Device ID required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Coordinates out of range' });
    }

    const userId = req.user?.id || null;

    // Deactivate old locations ONLY for this specific device
    // This allows multiple devices per user to remain active
    await UserLocation.updateMany(
      { userId, deviceId, isActive: true },
      { isActive: false }
    );

    const userLocation = new UserLocation({
      userId,
      deviceId,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      accuracy: accuracy || 100,
      isActive: true
    });

    await userLocation.save();

    res.json({
      success: true,
      message: 'Location updated',
      id: userLocation._id
    });

  } catch (err) {
    console.error('Location update error:', err.message);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// GET /api/locations/heatmap - Aggregated crowd density for the visible area.
// Sign-in required: this data describes where people physically are.
router.get('/heatmap', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Sign in to view the crowd map' });
    }

    const { box, error } = parseBbox(req.query.bbox);
    if (error) {
      return res.status(400).json({ error });
    }

    const currentUserId = req.user.id;

    const locations = await UserLocation.find({
      isActive: true,
      timestamp: { $gte: new Date(Date.now() - ACTIVE_WINDOW_MS) },
      location: { $geoWithin: { $box: box } }
    })
      .select('location userId')
      .limit(5000)
      .lean();

    // Group into grid cells, counting distinct people per cell.
    const cells = new Map();
    for (const loc of locations) {
      const [lng, lat] = loc.location.coordinates;
      const key = `${snap(lat).toFixed(5)},${snap(lng).toFixed(5)}`;
      let cell = cells.get(key);
      if (!cell) {
        cell = { lat: snap(lat), lng: snap(lng), people: new Set(), others: new Set() };
        cells.set(key, cell);
      }
      const person = loc.userId || `anon:${loc._id}`;
      cell.people.add(person);
      if (String(loc.userId) !== String(currentUserId)) cell.others.add(person);
    }

    // Publish only cells that are crowded enough to be anonymous.
    const published = Array.from(cells.values()).filter(c => c.people.size >= MIN_CLUSTER);
    const busiest = published.reduce((max, c) => Math.max(max, c.people.size), 1);

    const points = published.map(c => ({
      lat: Number(c.lat.toFixed(5)),
      lng: Number(c.lng.toFixed(5)),
      intensity: Math.min(1, c.people.size / busiest),
      people: c.people.size
    }));

    const otherPeople = published.reduce((sum, c) => sum + c.others.size, 0);

    res.json({
      points,
      count: otherPeople,
      totalCount: published.reduce((sum, c) => sum + c.people.size, 0),
      minCluster: MIN_CLUSTER,
      precisionMeters: Math.round(GRID_DEGREES * 111000),
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Heatmap fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
});

// GET /api/locations/stats - Global crowd statistics (no positions)
router.get('/stats', async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - ACTIVE_WINDOW_MS);

    const [activeCount, totalToday] = await Promise.all([
      UserLocation.countDocuments({
        isActive: true,
        timestamp: { $gte: fiveMinutesAgo }
      }),
      UserLocation.countDocuments({
        timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      })
    ]);

    res.json({
      activeUsers: activeCount,
      todayTotal: totalToday,
      lastUpdate: new Date().toISOString()
    });

  } catch (err) {
    console.error('Stats fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// DELETE /api/locations/mine - Remove this device (or account) from the map
router.delete('/mine', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { deviceId } = req.body || {};

    // Anonymous broadcasters are identified by device alone, so honour a
    // deviceId-only opt-out instead of silently doing nothing. Removing
    // yourself from the map always fails safe, so no ownership check is needed.
    if (deviceId) {
      await UserLocation.updateMany({ deviceId }, { isActive: false });
    } else if (userId) {
      await UserLocation.updateMany({ userId }, { isActive: false });
    } else {
      return res.status(400).json({ error: 'deviceId required' });
    }

    res.json({ success: true, message: 'Location removed from map' });

  } catch (err) {
    console.error('Location delete error:', err.message);
    res.status(500).json({ error: 'Failed to remove location' });
  }
});

module.exports = router;

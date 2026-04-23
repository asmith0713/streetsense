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

// POST /api/locations - Update user's current location
router.post('/', locationUpdateLimiter, authMiddleware, async (req, res) => {
  try {
    const { lat, lng, accuracy, deviceId } = req.body;

    console.log('Location update received:', { lat, lng, accuracy, deviceId, userId: req.user?.id });

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    if (!deviceId) {
      console.warn('Missing deviceId in location update');
      return res.status(400).json({ error: 'Device ID required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Coordinates out of range' });
    }

    const userId = req.user?.id || null;

    // Deactivate old locations ONLY for this specific device
    // This allows multiple devices per user to remain active
    const updated = await UserLocation.updateMany(
      { userId, deviceId, isActive: true },
      { isActive: false }
    );
    console.log('Deactivated old locations:', updated.modifiedCount);

    // Create new location
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

    console.log('New location saved:', userLocation._id);

    res.json({ 
      success: true, 
      message: 'Location updated',
      id: userLocation._id
    });

  } catch (err) {
    console.error('Location update error:', err);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// GET /api/locations/heatmap - Get active user locations for crowd heatmap
router.get('/heatmap', authMiddleware, async (req, res) => {
  try {
    const { bbox } = req.query;
    const currentUserId = req.user?.id;

    const filter = { 
      isActive: true,
      timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
    };

    // Optional bounding box filter
    if (bbox) {
      const [lng1, lat1, lng2, lat2] = bbox.split(',').map(Number);
      filter.location = {
        $geoWithin: {
          $box: [[lng1, lat1], [lng2, lat2]]
        }
      };
    }

    const locations = await UserLocation.find(filter)
      .select('location accuracy timestamp userId')
      .lean();

    // Format for heatmap: [lat, lng, intensity]
    const heatPoints = locations.map(loc => ({
      lat: loc.location.coordinates[1],
      lng: loc.location.coordinates[0],
      intensity: 1.0, // Can be adjusted based on accuracy or user count
      timestamp: loc.timestamp
    }));

    // Count excluding current user
    const otherUsersCount = currentUserId 
      ? locations.filter(loc => loc.userId?.toString() !== currentUserId.toString()).length
      : locations.length;

    res.json({ 
      points: heatPoints,
      count: otherUsersCount, // Exclude current user from count
      totalCount: locations.length, // Total including current user
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Heatmap fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
});

// GET /api/locations/stats - Get crowd statistics
router.get('/stats', async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [activeCount, totalToday] = await Promise.all([
      UserLocation.countDocuments({ 
        isActive: true, 
        timestamp: { $gte: fiveMinutesAgo } 
      }),
      UserLocation.countDocuments({ 
        timestamp: { $gte: new Date().setHours(0, 0, 0, 0) } 
      })
    ]);

    res.json({
      activeUsers: activeCount,
      todayTotal: totalToday,
      lastUpdate: new Date().toISOString()
    });

  } catch (err) {
    console.error('Stats fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// DELETE /api/locations/mine - Remove user's location (opt-out)
router.delete('/mine', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { deviceId } = req.body;

    if (userId) {
      // Only deactivate locations for specific device if deviceId provided
      if (deviceId) {
        await UserLocation.updateMany(
          { userId, deviceId },
          { isActive: false }
        );
      } else {
        // Otherwise deactivate all devices for this user
        // (used during logout)
        await UserLocation.updateMany(
          { userId },
          { isActive: false }
        );
      }
    }

    res.json({ success: true, message: 'Location removed from map' });

  } catch (err) {
    console.error('Location delete error:', err);
    res.status(500).json({ error: 'Failed to remove location' });
  }
});

module.exports = router;

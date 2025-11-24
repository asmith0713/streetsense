const express = require('express');
const router = express.Router();
const Emergency = require('../models/Emergency');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { sendEmergencyAlertsToContacts } = require('../utils/telegram');

// Rate limiter for emergency creation (prevent spam)
const emergencyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 emergency alerts per 5 minutes
  message: { error: 'Too many emergency requests. Please wait.' }
});

// Emergency contact numbers (India-specific)
const EMERGENCY_CONTACTS = {
  police: '100',
  ambulance: '108',
  fire: '101',
  womenHelpline: '1091',
  childHelpline: '1098',
  nationalEmergency: '112'
};

// POST /api/emergency - Create emergency alert
router.post('/', emergencyLimiter, authMiddleware, async (req, res) => {
  try {
    const { type, lat, lng, description, severity, notifyContacts } = req.body;

    if (!type || !lat || !lng) {
      return res.status(400).json({ error: 'Type and location required' });
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

    // Create emergency
    const emergency = new Emergency({
      userId,
      type,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      description: description || '',
      severity: severity || 'high',
      status: 'active'
    });

    // Auto-contact authorities based on type
    const authoritiesToContact = [];
    
    if (type === 'harassment' || type === 'eve-teasing' || type === 'assault' || type === 'stalking') {
      authoritiesToContact.push({
        type: 'police',
        contactedAt: new Date(),
        contactNumber: EMERGENCY_CONTACTS.police
      });
      authoritiesToContact.push({
        type: 'women-helpline',
        contactedAt: new Date(),
        contactNumber: EMERGENCY_CONTACTS.womenHelpline
      });
    } else if (type === 'medical') {
      authoritiesToContact.push({
        type: 'ambulance',
        contactedAt: new Date(),
        contactNumber: EMERGENCY_CONTACTS.ambulance
      });
    }

    if (authoritiesToContact.length > 0) {
      emergency.authorities = authoritiesToContact;
      emergency.contactedAuthorities = true;
    }

    // Handle emergency contact notifications
    if (notifyContacts && Array.isArray(notifyContacts)) {
      emergency.notifiedContacts = notifyContacts.map(contact => ({
        contactNumber: contact,
        notifiedAt: new Date()
      }));
    }

    await emergency.save();

    // Fetch user profile and send Telegram notifications
    let telegramResults = [];
    if (userId) {
      try {
        const user = await User.findById(userId).select('name phone emergencyContacts');
        if (user && user.emergencyContacts && user.emergencyContacts.length > 0) {
          const emergencyData = {
            userName: user.name,
            userPhone: user.phone,
            type,
            severity: severity || 'high',
            lat: latitude,
            lng: longitude,
            timestamp: emergency.createdAt
          };
          
          // Send Telegram alerts to all emergency contacts
          telegramResults = await sendEmergencyAlertsToContacts(user.emergencyContacts, emergencyData);
          
          console.log(`📱 Sent Telegram alerts to ${telegramResults.filter(r => r.success).length} contacts`);
        }
      } catch (err) {
        console.error('Error sending Telegram notifications:', err);
        // Don't fail the emergency creation if notifications fail
      }
    }

    // Return emergency details with contact numbers
    res.status(201).json({
      success: true,
      emergency: {
        id: emergency._id,
        type: emergency.type,
        status: emergency.status,
        severity: emergency.severity,
        location: {
          lat: latitude,
          lng: longitude
        },
        createdAt: emergency.createdAt
      },
      emergencyContacts: EMERGENCY_CONTACTS,
      contactedAuthorities: emergency.authorities.map(a => ({
        type: a.type,
        number: a.contactNumber
      }))
    });

  } catch (err) {
    console.error('Emergency creation error:', err);
    res.status(500).json({ error: 'Failed to create emergency alert' });
  }
});

// GET /api/emergency/contacts - Get emergency contact numbers
router.get('/contacts', (req, res) => {
  res.json({
    contacts: EMERGENCY_CONTACTS,
    info: {
      police: { number: EMERGENCY_CONTACTS.police, description: 'Police Emergency' },
      ambulance: { number: EMERGENCY_CONTACTS.ambulance, description: 'Medical Emergency' },
      fire: { number: EMERGENCY_CONTACTS.fire, description: 'Fire Emergency' },
      womenHelpline: { number: EMERGENCY_CONTACTS.womenHelpline, description: 'Women Helpline' },
      nationalEmergency: { number: EMERGENCY_CONTACTS.nationalEmergency, description: 'National Emergency (All Services)' }
    }
  });
});

// GET /api/emergency/active - Get active emergencies in area (admin only)
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;

    const filter = { status: 'active' };

    // Optional geospatial filter
    if (lat && lng && radius) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusKm = parseFloat(radius);

      filter.location = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radiusKm * 1000 // Convert km to meters
        }
      };
    }

    const emergencies = await Emergency.find(filter)
      .select('type location severity createdAt')
      .limit(50)
      .sort({ createdAt: -1 })
      .lean();

    // Format response
    const formattedEmergencies = emergencies.map(e => ({
      id: e._id,
      type: e.type,
      severity: e.severity,
      lat: e.location.coordinates[1],
      lng: e.location.coordinates[0],
      createdAt: e.createdAt
    }));

    res.json({
      count: formattedEmergencies.length,
      emergencies: formattedEmergencies
    });

  } catch (err) {
    console.error('Error fetching active emergencies:', err);
    res.status(500).json({ error: 'Failed to fetch emergencies' });
  }
});

// PATCH /api/emergency/:id/resolve - Mark emergency as resolved
router.patch('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const emergency = await Emergency.findById(id);

    if (!emergency) {
      return res.status(404).json({ error: 'Emergency not found' });
    }

    // Only creator can resolve (or admin)
    if (emergency.userId && emergency.userId !== userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    emergency.status = 'resolved';
    emergency.resolvedAt = new Date();
    await emergency.save();

    res.json({
      success: true,
      message: 'Emergency marked as resolved',
      emergency: {
        id: emergency._id,
        status: emergency.status,
        resolvedAt: emergency.resolvedAt
      }
    });

  } catch (err) {
    console.error('Error resolving emergency:', err);
    res.status(500).json({ error: 'Failed to resolve emergency' });
  }
});

module.exports = router;

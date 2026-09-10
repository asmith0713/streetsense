const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Emergency = require('../models/Emergency');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { adminAuth, optionalAdmin } = require('../middleware/adminAuth');
const rateLimit = require('express-rate-limit');
const { sendEmergencyAlertsToContacts, isTelegramConfigured } = require('../utils/telegram');

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

const VALID_TYPES = ['harassment', 'assault', 'eve-teasing', 'stalking', 'general', 'medical'];
const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'];

// POST /api/emergency - Create emergency alert
router.post('/', emergencyLimiter, authMiddleware, async (req, res) => {
  try {
    const { type, lat, lng, description, severity } = req.body;

    // 0 is a valid coordinate: check for absence, not falsiness.
    if (!type || lat === undefined || lat === null || lng === undefined || lng === null) {
      return res.status(400).json({ error: 'Type and location required' });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Unknown emergency type. Expected one of: ${VALID_TYPES.join(', ')}` });
    }

    if (severity && !VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({ error: `Unknown severity. Expected one of: ${VALID_SEVERITIES.join(', ')}` });
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

    const emergency = new Emergency({
      userId,
      type,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      description: typeof description === 'string' ? description.slice(0, 1000) : '',
      severity: severity || 'high',
      status: 'active'
    });

    // Helpline numbers relevant to this emergency type. These are numbers for
    // the user to call - recording them here does not place the call.
    const relevantHelplines = [];

    if (['harassment', 'eve-teasing', 'assault', 'stalking'].includes(type)) {
      relevantHelplines.push({
        type: 'police',
        contactedAt: new Date(),
        contactNumber: EMERGENCY_CONTACTS.police
      });
      relevantHelplines.push({
        type: 'women-helpline',
        contactedAt: new Date(),
        contactNumber: EMERGENCY_CONTACTS.womenHelpline
      });
    } else if (type === 'medical') {
      relevantHelplines.push({
        type: 'ambulance',
        contactedAt: new Date(),
        contactNumber: EMERGENCY_CONTACTS.ambulance
      });
    }

    emergency.authorities = relevantHelplines;
    emergency.contactedAuthorities = false; // set to true only when a real dispatch happens

    await emergency.save();

    // Notify the user's own emergency contacts over Telegram where they have
    // supplied an ID and a bot token is configured. Never block the response.
    let personalContacts = [];
    let notified = [];

    if (userId) {
      try {
        const user = await User.findById(userId).lean();
        if (user && Array.isArray(user.emergencyContacts)) {
          personalContacts = user.emergencyContacts.map(c => ({
            name: c.name,
            phone: c.phone,
            relationship: c.relationship || '',
            hasTelegram: Boolean(c.telegramId)
          }));

          if (isTelegramConfigured()) {
            notified = await sendEmergencyAlertsToContacts(user.emergencyContacts, {
              userName: user.name,
              userPhone: user.phone,
              type,
              severity: emergency.severity,
              lat: latitude,
              lng: longitude,
              timestamp: emergency.createdAt
            });

            const delivered = notified.filter(n => n.success);
            if (delivered.length > 0) {
              emergency.notifiedContacts = delivered.map(n => ({
                contactNumber: n.telegramId,
                notifiedAt: n.notifiedAt
              }));
              await emergency.save();
            }
          }
        }
      } catch (e) {
        console.error('Emergency contact notification failed:', e.message);
      }
    }

    const deliveredCount = notified.filter(n => n.success).length;

    res.status(201).json({
      success: true,
      emergency: {
        id: emergency._id,
        type: emergency.type,
        status: emergency.status,
        severity: emergency.severity,
        location: { lat: latitude, lng: longitude },
        createdAt: emergency.createdAt
      },
      // What actually happened, so the UI can say so truthfully.
      alertDelivery: {
        recorded: true,
        authoritiesDispatched: false,
        contactsNotified: deliveredCount,
        contactsWithTelegram: personalContacts.filter(c => c.hasTelegram).length,
        telegramConfigured: isTelegramConfigured()
      },
      emergencyContacts: EMERGENCY_CONTACTS,
      personalContacts,
      relevantHelplines: relevantHelplines.map(a => ({ type: a.type, number: a.contactNumber }))
    });

  } catch (err) {
    console.error('Emergency creation error:', err.message);
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

// GET /api/emergency/active - Live SOS queue. Moderators only: these are the
// precise locations of people who have just reported being in danger.
router.get('/active', adminAuth, async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;

    const filter = { status: 'active' };

    if (lat !== undefined && lng !== undefined && radius !== undefined) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusKm = parseFloat(radius);

      if (![latitude, longitude, radiusKm].every(Number.isFinite)) {
        return res.status(400).json({ error: 'lat, lng and radius must be numbers' });
      }

      filter.location = {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: radiusKm * 1000
        }
      };
    }

    const emergencies = await Emergency.find(filter)
      .select('type location severity createdAt description userId')
      .limit(50)
      .sort({ createdAt: -1 })
      .lean();

    // Attach contact details so a moderator can actually reach the person.
    const userIds = [...new Set(emergencies.map(e => e.userId).filter(Boolean))];
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select('name phone emergencyContacts').lean()
      : [];
    const usersById = new Map(users.map(u => [String(u._id), u]));

    const formattedEmergencies = emergencies.map(e => {
      const user = e.userId ? usersById.get(String(e.userId)) : null;
      return {
        id: e._id,
        type: e.type,
        severity: e.severity,
        description: e.description || '',
        lat: e.location.coordinates[1],
        lng: e.location.coordinates[0],
        createdAt: e.createdAt,
        reporter: user
          ? {
              name: user.name || '',
              phone: user.phone || '',
              contacts: (user.emergencyContacts || []).map(c => ({ name: c.name, phone: c.phone }))
            }
          : null
      };
    });

    res.json({
      count: formattedEmergencies.length,
      emergencies: formattedEmergencies
    });

  } catch (err) {
    console.error('Error fetching active emergencies:', err.message);
    res.status(500).json({ error: 'Failed to fetch emergencies' });
  }
});

// PATCH /api/emergency/:id/resolve - Mark emergency as resolved
router.patch('/:id/resolve', authMiddleware, optionalAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid emergency ID' });
    }

    const emergency = await Emergency.findById(id);

    if (!emergency) {
      return res.status(404).json({ error: 'Emergency not found' });
    }

    // Only the person who raised it, or a moderator, may close it. An
    // anonymous alert has no owner, so only a moderator can resolve it -
    // previously the ownership check short-circuited and let anyone close it.
    const isOwner = Boolean(userId) && String(emergency.userId) === String(userId);
    if (!req.isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Not authorized to resolve this alert' });
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
    console.error('Error resolving emergency:', err.message);
    res.status(500).json({ error: 'Failed to resolve emergency' });
  }
});

module.exports = router;

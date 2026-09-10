const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { passwordMatches, issueAdminToken } = require('../middleware/adminAuth');

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is required.');
  process.exit(1);
}

// Initialize Google OAuth client
let googleClient = null;
if (GOOGLE_CLIENT_ID) {
  googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
  console.log('Google OAuth client initialized');
} else {
  console.warn('GOOGLE_CLIENT_ID not set. Google OAuth will be disabled.');
}

// Credential endpoints get a much tighter budget than the general /api limiter,
// so the shared admin password and user passwords are not brute-forceable.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many sign-in attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Same policy the signup form shows the user. Enforced here so the policy is real.
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character';
  }
  return null;
}

function tokenFor(user) {
  return jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '2d' });
}

// POST /api/auth/register
router.post('/register', credentialLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      password: hashedPassword
    });

    const savedUser = await newUser.save();

    res.json({
      token: tokenFor(savedUser),
      user: {
        id: savedUser._id,
        email: savedUser.email
      }
    });

  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', credentialLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Google-only accounts have no password to check against.
    if (!user.password) {
      return res.status(400).json({ message: 'This account uses Google sign-in. Please continue with Google.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    res.json({
      token: tokenFor(user),
      user: {
        id: user._id,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/admin/login - exchange the admin password for a short-lived token
router.post('/admin/login', credentialLimiter, (req, res) => {
  const { password } = req.body || {};

  if (!process.env.ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD is not set');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  if (!passwordMatches(password)) {
    return res.status(401).json({ message: 'Invalid admin password' });
  }

  res.json({ token: issueAdminToken(), expiresIn: '8h' });
});

// POST /api/auth/google - Google OAuth login/register
router.post('/google', credentialLimiter, async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    if (!googleClient) {
      return res.status(503).json({ message: 'Google authentication is not configured on the server' });
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID
      });
    } catch (verifyErr) {
      // Log the detail; return a generic message so server config is not disclosed.
      console.error('Google token verification failed:', verifyErr.message);
      return res.status(400).json({ message: 'Could not verify your Google sign-in. Please try again.' });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Unable to get email from Google account' });
    }

    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }]
    });

    if (user) {
      // Link Google to the existing account, but never disable an existing
      // password: authProvider only flips for accounts that have no password.
      let changed = false;
      if (!user.googleId) {
        user.googleId = googleId;
        changed = true;
      }
      if (!user.password && user.authProvider !== 'google') {
        user.authProvider = 'google';
        changed = true;
      }
      if (!user.name && name) { user.name = name; changed = true; }
      if (!user.picture && picture) { user.picture = picture; changed = true; }
      if (changed) await user.save();
    } else {
      user = new User({
        email: email.toLowerCase(),
        googleId,
        name,
        picture,
        authProvider: 'google'
      });
      await user.save();
    }

    res.json({
      token: tokenFor(user),
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    });

  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(500).json({ message: 'Google authentication failed' });
  }
});

/**
 * Resolve the caller's user id, or send a 401. Verification happens outside the
 * route's try/catch so an expired token reports 401 rather than 500.
 */
function requireUserId(req, res) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET).id;
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
    return null;
  }
}

// GET /api/auth/me - Get current user info
router.get('/me', async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        bloodType: user.bloodType || '',
        allergies: user.allergies || '',
        medicalConditions: user.medicalConditions || '',
        emergencyContacts: user.emergencyContacts || [],
        picture: user.picture,
        authProvider: user.authProvider
      }
    });
  } catch (err) {
    console.error('GET /auth/me error:', err.message);
    res.status(500).json({ message: 'Server error while fetching user data' });
  }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const { name, phone, address, bloodType, allergies, medicalConditions, emergencyContacts } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (bloodType !== undefined) user.bloodType = bloodType;
    if (allergies !== undefined) user.allergies = allergies;
    if (medicalConditions !== undefined) user.medicalConditions = medicalConditions;

    if (Array.isArray(emergencyContacts)) {
      for (const contact of emergencyContacts) {
        if (!contact.name || !contact.phone) {
          return res.status(400).json({ message: 'Each contact must have name and phone' });
        }
      }
      user.emergencyContacts = emergencyContacts;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address,
        bloodType: user.bloodType,
        allergies: user.allergies,
        medicalConditions: user.medicalConditions,
        emergencyContacts: user.emergencyContacts
      }
    });
  } catch (err) {
    // Surface schema validation problems (e.g. an unknown relationship value)
    // as a 400 with the offending field, instead of an opaque 500.
    if (err.name === 'ValidationError') {
      const detail = Object.values(err.errors)[0]?.message || 'Invalid profile data';
      return res.status(400).json({ message: detail });
    }
    console.error('Update profile error:', err.message);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

module.exports = router;

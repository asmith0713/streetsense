const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is required.');
  process.exit(1);
}

// Initialize Google OAuth client
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      password: hashedPassword
    });

    const savedUser = await newUser.save();

    // Create token
    const token = jwt.sign({ id: savedUser._id }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: {
        id: savedUser._id,
        email: savedUser.email
      }
    });

  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password' });
    }

    // Check for user (case-insensitive email lookup)
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Create token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/google - Google OAuth login/register
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    if (!googleClient) {
      return res.status(503).json({ message: 'Google authentication is not configured on the server' });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Unable to get email from Google account' });
    }

    // Check if user exists
    let user = await User.findOne({ 
      $or: [{ googleId }, { email: email.toLowerCase() }] 
    });

    if (user) {
      // User exists - update Google info if needed
      if (!user.googleId && user.authProvider === 'local') {
        // Link Google account to existing local account
        user.googleId = googleId;
        user.authProvider = 'google';
        user.name = name;
        user.picture = picture;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        email: email.toLowerCase(),
        googleId,
        name,
        picture,
        authProvider: 'google'
      });
      await user.save();
    }

    // Create JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    });

  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(500).json({ message: 'Google authentication failed' });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('GET /auth/me - No token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      console.error('GET /auth/me - JWT verification failed:', jwtErr.message);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      console.log('GET /auth/me - User not found for ID:', decoded.id);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('GET /auth/me - Success for user:', user.email);
    
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
    console.error('GET /auth/me - Server error:', err);
    res.status(500).json({ message: 'Server error while fetching user data' });
  }
});

// PUT /api/auth/emergency-contacts - Update emergency contacts
router.put('/emergency-contacts', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { contacts } = req.body;

    if (!Array.isArray(contacts)) {
      return res.status(400).json({ message: 'Contacts must be an array' });
    }

    // Validate contacts
    for (const contact of contacts) {
      if (!contact.name || !contact.phone) {
        return res.status(400).json({ message: 'Each contact must have name and phone' });
      }
      if (contact.phone.length < 10) {
        return res.status(400).json({ message: 'Phone number must be at least 10 digits' });
      }
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.emergencyContacts = contacts;
    await user.save();

    res.json({
      message: 'Emergency contacts updated successfully',
      contacts: user.emergencyContacts
    });

  } catch (err) {
    console.error('Update emergency contacts error:', err);
    res.status(500).json({ message: 'Failed to update emergency contacts' });
  }
});

// PUT /api/auth/profile - Update user profile (medical info, address, etc.)
router.put('/profile', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No authentication token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { name, phone, address, bloodType, allergies, medicalConditions, emergencyContacts } = req.body;
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (bloodType !== undefined) user.bloodType = bloodType;
    if (allergies !== undefined) user.allergies = allergies;
    if (medicalConditions !== undefined) user.medicalConditions = medicalConditions;
    
    // Update emergency contacts if provided
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
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

module.exports = router;
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

module.exports = router;
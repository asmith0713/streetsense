const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: false // Not required for Google OAuth users
  },
  googleId: {
    type: String,
    sparse: true, // Allow null but unique when present
    unique: true
  },
  name: {
    type: String,
    trim: true
  },
  picture: {
    type: String
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('User', UserSchema);
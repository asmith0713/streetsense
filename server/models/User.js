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
  emergencyContacts: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    telegramId: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      enum: ['family', 'mother', 'father', 'brother', 'sister', 'cousin', 'relative', 'friend'],
      default: 'family'
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // User profile fields for emergency information
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
    default: ''
  },
  allergies: {
    type: String,
    trim: true
  },
  medicalConditions: {
    type: String,
    trim: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Ensure only one primary emergency contact
UserSchema.pre('save', function(next) {
  if (this.emergencyContacts && this.emergencyContacts.length > 0) {
    const primaryContacts = this.emergencyContacts.filter(c => c.isPrimary);
    if (primaryContacts.length > 1) {
      // Keep only the first primary
      this.emergencyContacts.forEach((contact, index) => {
        if (contact.isPrimary && index > 0) {
          contact.isPrimary = false;
        }
      });
    }
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);
const mongoose = require('mongoose');

const EmergencySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: false, // Can be anonymous
    index: true
  },
  type: {
    type: String,
    enum: ['harassment', 'assault', 'eve-teasing', 'stalking', 'general', 'medical'],
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  description: {
    type: String,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'cancelled'],
    default: 'active',
    index: true
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'high'
  },
  contactedAuthorities: {
    type: Boolean,
    default: false
  },
  authorities: [{
    type: {
      type: String,
      enum: ['police', 'ambulance', 'fire', 'women-helpline']
    },
    contactedAt: Date,
    contactNumber: String
  }],
  notifiedContacts: [{
    contactNumber: String,
    notifiedAt: Date
  }],
  resolvedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Geospatial index
EmergencySchema.index({ location: '2dsphere' });

// Compound index for active emergencies
EmergencySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Emergency', EmergencySchema);

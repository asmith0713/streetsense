const mongoose = require('mongoose');

const UserLocationSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: false, // Can be null for anonymous users
    index: true 
  },
  deviceId: {
    type: String,
    required: true, // Unique identifier for each device/browser
    index: true
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
  accuracy: {
    type: Number,
    default: 100
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 300 // Auto-delete after 5 minutes (TTL index)
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Geospatial index for location queries
UserLocationSchema.index({ location: '2dsphere' });

// Compound index for active location queries
UserLocationSchema.index({ isActive: 1, timestamp: -1 });

// Index for device tracking
UserLocationSchema.index({ userId: 1, deviceId: 1 });

module.exports = mongoose.model('UserLocation', UserLocationSchema);

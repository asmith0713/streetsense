// server/models/Report.js
const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  category: { type: String, enum: ['safety','traffic','water','garbage','noise','stray','harassment','eve-teasing','assault','stalking','other'], default: 'other' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] } // [lng, lat]
  },
  timestamp: { type: Date, default: Date.now },
  timeOfDay: { type: String, enum: ['day','night'], default: 'day' },
  photoUrl: String,
  status: { type: String, enum: ['open','verified','resolved','deleted'], default: 'open' }, // Added 'deleted'
  deletedAt: { type: Date }, // New field to track when it was deleted
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  // Recorded for moderation only. `select: false` keeps it out of every
  // query result, so reports remain anonymous to other users.
  authorId: { type: String, default: null, select: false }
}, { timestamps: true });

// Geospatial queries filter on `location`, so the index belongs there.
ReportSchema.index({ location: '2dsphere' });
ReportSchema.index({ timestamp: -1, category: 1, status: 1 });
ReportSchema.index({ status: 1 });
ReportSchema.index({ category: 1 });

module.exports = mongoose.model('Report', ReportSchema);
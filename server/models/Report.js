// server/models/Report.js
const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  category: { type: String, enum: ['safety','traffic','water','garbage','noise','stray','harassment','eve-teasing','assault','stalking','other'], default: 'other' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere' } // [lng, lat]
  },
  timestamp: { type: Date, default: Date.now },
  timeOfDay: { type: String, enum: ['day','night'], default: 'day' },
  photoUrl: String,
  status: { type: String, enum: ['open','verified','resolved'], default: 'open' },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 }
}, { timestamps: true });

ReportSchema.index({ timestamp: -1, category: 1, status: 1 });
ReportSchema.index({ status: 1 });
ReportSchema.index({ category: 1 });

module.exports = mongoose.model('Report', ReportSchema);

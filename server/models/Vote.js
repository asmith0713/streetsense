const mongoose = require('mongoose');

/**
 * One document per (report, user) pair. The unique index is what actually
 * enforces "one vote per user per issue" - vote counts on Report are derived
 * from these rows rather than being blindly incremented.
 */
const VoteSchema = new mongoose.Schema({
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  value: {
    type: String,
    enum: ['up', 'down'],
    required: true
  }
}, { timestamps: true });

VoteSchema.index({ reportId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', VoteSchema);

const mongoose = require('mongoose');

const progressLogSchema = new mongoose.Schema({
  resource_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completion_status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  time_spent: {
    type: Number, // in minutes
    default: 0
  },
  completion_date: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProgressLog', progressLogSchema);

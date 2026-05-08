const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'justified', 'online'],
    required: true,
  },
  observations: { type: String, trim: true, default: '' },
}, { timestamps: true });

// Uma única presença por usuário por reunião
attendanceSchema.index({ meetingId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);

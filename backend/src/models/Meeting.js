const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true, default: '19:00' }, // "HH:MM"
  status: {
    type: String,
    enum: ['scheduled', 'cancelled', 'extra'],
    default: 'scheduled',
  },
  notes: { type: String, trim: true, default: '' },
}, { timestamps: true });

// Evitar duplicatas: uma única reunião por semestre+data
meetingSchema.index({ semesterId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Meeting', meetingSchema);

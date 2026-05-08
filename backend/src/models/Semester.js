const mongoose = require('mongoose');

const meetingConfigSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  startTime: { type: String, required: true, default: '19:00' }, // "HH:MM"
  active: { type: Boolean, default: true },
}, { _id: false });

const semesterSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // ex: "2025/1"
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  active: { type: Boolean, default: true },
  meetingConfigs: { type: [meetingConfigSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Semester', semesterSchema);

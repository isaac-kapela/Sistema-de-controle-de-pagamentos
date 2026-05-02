const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    day:  { type: Number, required: true, min: 0, max: 6  }, // 0=Seg … 6=Dom
    hour: { type: Number, required: true, min: 7, max: 23 }, // hora início
  },
  { _id: false }
);

const scheduleSchema = new mongoose.Schema(
  {
    nome:     { type: String, required: true, trim: true },
    semestre: { type: String, trim: true, default: '' },
    area:     { type: String, trim: true, default: '' },
    capitao:  { type: Boolean, default: false },
    lider:    { type: Boolean, default: false },
    slots:    [slotSchema],
    ativo:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Schedule', scheduleSchema);

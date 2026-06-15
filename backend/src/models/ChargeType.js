const mongoose = require('mongoose');

const chargeTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  value: { type: Number, required: true, min: 0 },
  active: { type: Boolean, default: true },
  // 'all' = todos | 'drivers' = só motoristas | 'non-drivers' = só não-motoristas
  applicableTo: {
    type: String,
    enum: ['all', 'drivers', 'non-drivers'],
    default: 'all',
  },
}, { timestamps: true });

module.exports = mongoose.model('ChargeType', chargeTypeSchema);

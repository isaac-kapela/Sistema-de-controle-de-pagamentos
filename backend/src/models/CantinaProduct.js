const mongoose = require('mongoose');

const cantinaProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, default: 'Geral', trim: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('CantinaProduct', cantinaProductSchema);

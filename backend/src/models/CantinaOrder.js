const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'CantinaProduct' },
  name: { type: String, required: true },   // snapshot do nome no momento da venda
  price: { type: Number, required: true },  // snapshot do preço no momento da venda
  quantity: { type: Number, required: true, min: 1, default: 1 },
}, { _id: false });

const cantinaOrderSchema = new mongoose.Schema({
  items: [itemSchema],
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['pix', 'dinheiro'], required: true },
  buyerName: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('CantinaOrder', cantinaOrderSchema);

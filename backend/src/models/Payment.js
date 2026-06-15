const mongoose = require('mongoose');

const chargeEntrySchema = new mongoose.Schema({
  chargeTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChargeType' },
  name: { type: String, required: true },
  value: { type: Number, required: true },
  paid: { type: Boolean, default: false },
  paidAt: { type: Date, default: null },
}, { _id: true });

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  isDriver: { type: Boolean, required: true },
  charges: [chargeEntrySchema],
}, { timestamps: true });

paymentSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

paymentSchema.virtual('amount').get(function () {
  return this.charges.reduce((s, c) => s + c.value, 0);
});

paymentSchema.virtual('amountPaid').get(function () {
  return this.charges.filter(c => c.paid).reduce((s, c) => s + c.value, 0);
});

paymentSchema.virtual('fullyPaid').get(function () {
  return this.charges.length > 0 && this.charges.every(c => c.paid);
});

paymentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Payment', paymentSchema);

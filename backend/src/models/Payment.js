const mongoose = require('mongoose');

const GASOLINA = 5.0;
const DRIVE = 2.27;

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    // Valores individuais para gasolina e drive
    gasolinaPaid: {
      type: Boolean,
      default: false,
    },
    gasolinaPaidAt: {
      type: Date,
      default: null,
      
    },
    drivePaid: {
      type: Boolean,
      default: false,
    },
    drivePaidAt: {
      type: Date,
      default: null,
    },
    // Indica se é motorista (snapshot no momento do registro)
    isDriver: {
      type: Boolean,
      required: true,
    },
    // Valor total devido no mês
    amount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Índice único por usuário/mês/ano
paymentSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

// Campo virtual: pagamento totalmente quitado
paymentSchema.virtual('fullyPaid').get(function () {
  if (this.isDriver) return this.drivePaid;
  return this.gasolinaPaid && this.drivePaid;
});

// Valor pago até agora
paymentSchema.virtual('amountPaid').get(function () {
  let total = 0;
  if (this.gasolinaPaid) total += GASOLINA;
  if (this.drivePaid) total += DRIVE;
  return total;
});

// Valor ainda pendente
paymentSchema.virtual('amountPending').get(function () {
  return this.amount - this.amountPaid;
});

paymentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Payment', paymentSchema);

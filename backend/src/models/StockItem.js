const mongoose = require('mongoose');

const stockItemSchema = new mongoose.Schema(
  {
    nome:          { type: String, required: true, trim: true },
    categoria:     { type: String, required: true, trim: true },   // livre — validado pelo frontend
    quantidade:    { type: Number, required: true, default: 0, min: 0 },
    unidade:       { type: String, default: 'un', trim: true },
    estoqueMinimo: { type: Number, default: 5, min: 0 },
    descricao:     { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

stockItemSchema.virtual('status').get(function () {
  if (this.quantidade === 0) return 'esgotado';
  if (this.quantidade <= this.estoqueMinimo) return 'baixo';
  return 'normal';
});

stockItemSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('StockItem', stockItemSchema);

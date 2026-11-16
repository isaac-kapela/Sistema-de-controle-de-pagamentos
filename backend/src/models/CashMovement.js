const mongoose = require('mongoose');

const historyEntrySchema = new mongoose.Schema(
  {
    data: { type: Date, default: Date.now },
    autor: { type: String, required: true, trim: true },
    acao: { type: String, required: true, trim: true },
    detalhes: { type: String, default: '', trim: true },
    valoresAnteriores: { type: mongoose.Schema.Types.Mixed, default: null },
    valoresNovos: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: true }
);

const cashMovementSchema = new mongoose.Schema(
  {
    descricao: {
      type: String,
      required: [true, 'A descrição é obrigatória'],
      trim: true,
    },
    tipo: {
      type: String,
      enum: ['entrada', 'saida'],
      required: [true, 'O tipo da movimentação (entrada/saída) é obrigatório'],
    },
    categoria: {
      type: String,
      required: [true, 'A categoria é obrigatória'],
      trim: true,
    },
    valor: {
      type: Number,
      required: [true, 'O valor é obrigatório'],
      min: [0.01, 'O valor deve ser maior que zero'],
    },
    data: {
      type: Date,
      required: [true, 'A data é obrigatória'],
      default: Date.now,
    },
    formaPagamento: {
      type: String,
      enum: ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência Bancária', 'Boleto', 'Outro'],
      default: 'Pix',
      trim: true,
    },
    responsavel: {
      type: String,
      required: [true, 'O responsável pelo registro/movimentação é obrigatório'],
      trim: true,
    },
    observacoes: {
      type: String,
      default: '',
      trim: true,
    },
    comprovanteUrl: {
      type: String,
      default: '',
      trim: true,
    },
    compraId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      default: null,
    },
    status: {
      type: String,
      enum: ['ativo', 'cancelado'],
      default: 'ativo',
    },
    justificativaCancelamento: {
      type: String,
      default: '',
      trim: true,
    },
    canceladoPor: {
      type: String,
      default: '',
      trim: true,
    },
    canceladoEm: {
      type: Date,
      default: null,
    },
    criadoPor: {
      type: String,
      required: true,
      trim: true,
    },
    atualizadoPor: {
      type: String,
      default: '',
      trim: true,
    },
    historico: [historyEntrySchema],
  },
  { timestamps: true }
);

cashMovementSchema.index({ data: -1 });
cashMovementSchema.index({ tipo: 1, status: 1 });
cashMovementSchema.index({ categoria: 1 });
cashMovementSchema.index({ compraId: 1 });

module.exports = mongoose.model('CashMovement', cashMovementSchema);

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

const purchaseSchema = new mongoose.Schema(
  {
    // Informações da compra
    produto: {
      type: String,
      required: [true, 'O nome do produto/material é obrigatório'],
      trim: true,
    },
    descricao: {
      type: String,
      default: '',
      trim: true,
    },
    categoria: {
      type: String,
      required: [true, 'A categoria é obrigatória'],
      trim: true,
      default: 'Geral',
    },
    quantidade: {
      type: Number,
      required: [true, 'A quantidade é obrigatória'],
      min: [1, 'A quantidade mínima é 1'],
      default: 1,
    },
    valorUnitario: {
      type: Number,
      required: [true, 'O valor unitário é obrigatório'],
      min: [0, 'O valor unitário não pode ser negativo'],
      default: 0,
    },
    valorTotal: {
      type: Number,
      required: [true, 'O valor total é obrigatório'],
      min: [0, 'O valor total não pode ser negativo'],
      default: 0,
    },
    fornecedor: {
      type: String,
      default: '',
      trim: true,
    },
    tipoLoja: {
      type: String,
      enum: ['online', 'fisica'],
      default: 'online',
    },
    linkProduto: {
      type: String,
      default: '',
      trim: true,
    },

    // Informações de pagamento
    dataCompra: {
      type: Date,
      default: Date.now,
    },
    formaPagamento: {
      type: String,
      enum: ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência Bancária', 'Boleto', 'Outro'],
      default: 'Pix',
      trim: true,
    },
    statusPagamento: {
      type: String,
      enum: ['pendente', 'parcial', 'pago'],
      default: 'pendente',
    },
    valorPago: {
      type: Number,
      default: 0,
      min: [0, 'O valor pago não pode ser negativo'],
    },
    movimentacaoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CashMovement',
      default: null,
    },

    // Informações de entrega
    dataPrevisaoEntrega: {
      type: Date,
      default: null,
    },
    dataEntrega: {
      type: Date,
      default: null,
    },
    statusEntrega: {
      type: String,
      enum: ['aguardando_envio', 'enviado', 'em_transporte', 'entregue', 'atrasado'],
      default: 'aguardando_envio',
    },
    codigoRastreamento: {
      type: String,
      default: '',
      trim: true,
    },
    observacoesEntrega: {
      type: String,
      default: '',
      trim: true,
    },
    recebidoPor: {
      type: String,
      default: '',
      trim: true,
    },

    // Responsáveis e controle
    comprador: {
      type: String,
      required: [true, 'O responsável pela compra é obrigatório'],
      trim: true,
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

    historico: [historyEntrySchema],
  },
  { timestamps: true }
);

purchaseSchema.virtual('valorRestante').get(function () {
  const total = Number(this.valorTotal) || 0;
  const pago = Number(this.valorPago) || 0;
  return Math.max(0, +(total - pago).toFixed(2));
});

purchaseSchema.virtual('isAtrasado').get(function () {
  if (this.status === 'cancelado' || this.statusEntrega === 'entregue') return false;
  if (!this.dataPrevisaoEntrega) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const previsao = new Date(this.dataPrevisaoEntrega);
  previsao.setHours(0, 0, 0, 0);
  return previsao < hoje;
});

purchaseSchema.virtual('isProximoEntrega').get(function () {
  if (this.status === 'cancelado' || this.statusEntrega === 'entregue') return false;
  if (!this.dataPrevisaoEntrega) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const previsao = new Date(this.dataPrevisaoEntrega);
  previsao.setHours(0, 0, 0, 0);
  const diffTime = previsao.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 5;
});

purchaseSchema.set('toJSON', { virtuals: true });
purchaseSchema.set('toObject', { virtuals: true });

purchaseSchema.index({ dataCompra: -1 });
purchaseSchema.index({ statusEntrega: 1, status: 1 });
purchaseSchema.index({ statusPagamento: 1, status: 1 });
purchaseSchema.index({ comprador: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);

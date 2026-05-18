const mongoose = require('mongoose');

const criterioSchema = new mongoose.Schema({
  pergunta: { type: String, required: true, trim: true },
  tipo: { type: String, enum: ['nota5', 'nota10', 'aberta'], required: true },
  obrigatorio: { type: Boolean, default: true },
});

const feedbackCampaignSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    tipo: {
      type: String,
      enum: ['pos-offseason', 'pos-relatorio', 'pos-competicao', 'outro'],
      required: true,
    },
    tipoCustom: { type: String, trim: true, default: '' },
    dataInicio: { type: Date, required: true },
    dataEncerramento: { type: Date, required: true },
    descricao: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['ativo', 'inativo', 'arquivado'],
      default: 'ativo',
    },
    membros: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
    areas: [{ type: String, trim: true }],
    criterios: [criterioSchema],
    anonimo: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

module.exports = mongoose.model('FeedbackCampaign', feedbackCampaignSchema);

const mongoose = require('mongoose');

const respostaSchema = new mongoose.Schema(
  {
    criterioId: { type: String },
    pergunta: { type: String },
    tipoCriterio: { type: String },
    valor: { type: mongoose.Schema.Types.Mixed },
    comentario: { type: String, default: '' },
  },
  { _id: false }
);

const feedbackResponseSchema = new mongoose.Schema(
  {
    campanha: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeedbackCampaign',
      required: true,
    },
    avaliador: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    avaliado: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
    },
    area: { type: String, default: null },
    tipo: { type: String, enum: ['membro', 'area'], required: true },
    respostas: [respostaSchema],
    concluido: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

feedbackResponseSchema.index(
  { campanha: 1, avaliador: 1, avaliado: 1, area: 1, tipo: 1 },
  { unique: true }
);

module.exports = mongoose.model('FeedbackResponse', feedbackResponseSchema);

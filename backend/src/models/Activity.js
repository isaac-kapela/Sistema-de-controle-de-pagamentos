const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: [true, 'Título da atividade é obrigatório'],
      trim: true,
    },
    descricao: {
      type: String,
      default: 'Pauta da reunião / Informações: https://docs.google.com/document/d/1JRl84EZZ2GDFJYrld4Sfck__olyE6RX1Yq_664zqdhw/edit?tab=t.0',
      trim: true,
    },
    data: {
      type: Date,
      required: [true, 'Data da atividade é obrigatória'],
    },
    hora: {
      type: String,
      default: '',
      trim: true, // ex: "14:00" ou "14:00 às 16:30"
    },
    local: {
      type: String,
      default: '',
      trim: true, // ex: "Laboratório de Engenharia UFJF" ou link de reunião
    },
    categoria: {
      type: String,
      enum: [
        'Reunião Geral',
        'Workshop / Treinamento',
        'Entrega / Relatório',
        'Competição',
        'Marco de Projeto',
        'Social / Integração',
        'Aniversário',
        'Outro',
      ],
      default: 'Reunião Geral',
    },
    prioridade: {
      type: String,
      enum: ['alta', 'media', 'baixa'],
      default: 'media',
    },
    responsavel: {
      type: String,
      default: '',
      trim: true,
    },
    notificarEmail: {
      type: Boolean,
      default: true,
    },
    notificacaoEnviada: {
      type: Boolean,
      default: false,
    },
    notificadoEm: {
      type: Date,
      default: null,
    },
    concluida: {
      type: Boolean,
      default: false,
    },
    concluidaEm: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pendente', 'concluida', 'cancelada'],
      default: 'pendente',
    },
    criadoPor: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', activitySchema);

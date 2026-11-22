const mongoose = require('mongoose');

const importantContactSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
    },
    contato: {
      type: String,
      required: [true, 'Contato (telefone/WhatsApp/e-mail) é obrigatório'],
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    organizacao: {
      type: String,
      required: [true, 'Organização/Empresa/Instituição é obrigatória'],
      trim: true,
    },
    funcao: {
      type: String,
      required: [true, 'Função/Cargo é obrigatório'],
      trim: true,
    },
    categoria: {
      type: String,
      default: 'Geral',
      trim: true,
    },
    obs: {
      type: String,
      default: '',
      trim: true,
    },
    responsavel: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ImportantContact', importantContactSchema);

const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    tipoMembro: { type: String, enum: ['membro', 'ex-membro'], default: 'membro' },
    area: { type: String, trim: true, default: '' },

    // Dados pessoais
    nome: { type: String, required: true, trim: true },
    cpf: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    sexo: { type: String, enum: ['M', 'F', 'Outro', ''], default: '' },
    dataNascimento: { type: Date, default: null },
    tipoSanguineo: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
      default: '',
    },
    cidadeNatal: { type: String, trim: true, default: '' },

    // Endereço
    endereco: { type: String, trim: true, default: '' },
    bairro: { type: String, trim: true, default: '' },
    cidade: { type: String, trim: true, default: '' },
    uf: { type: String, trim: true, maxlength: 2, default: '' },
    cep: { type: String, trim: true, default: '' },

    // Família
    nomePai: { type: String, trim: true, default: '' },
    nomeMae: { type: String, trim: true, default: '' },

    // Acadêmico
    numeroMatricula: { type: String, trim: true, default: '' },
    ingressoFaculdade: { type: String, trim: true, default: '' },
    previsaoFormatura: { type: String, trim: true, default: '' },
    curso: { type: String, trim: true, default: '' },
    entradaMicro: { type: String, trim: true, default: '' },
    saidaMicro: { type: String, trim: true, default: '' },

    // Documentos
    rg: { type: String, trim: true, default: '' },
    orgaoExpedidor: { type: String, trim: true, default: '' },
    dataEmissaoRG: { type: Date, default: null },

    // Contatos
    numeroCelular: { type: String, trim: true, default: '' },
    telefoneFixo: { type: String, trim: true, default: '' },

    // Saúde
    alergias: { type: String, trim: true, default: '' },
    problemasSaude: { type: String, trim: true, default: '' },
    temPlanoSaude: { type: Boolean, default: false },
    nomePlanoSaude: { type: String, trim: true, default: '' },

    trabalhando: { type: Boolean, default: false },
    empresa: { type: String, trim: true, default: '' },

    ativo: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

module.exports = mongoose.model('Member', memberSchema);

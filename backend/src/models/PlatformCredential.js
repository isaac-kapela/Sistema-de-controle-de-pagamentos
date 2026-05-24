const mongoose = require('mongoose');

const platformCredentialSchema = new mongoose.Schema(
  {
    plataforma:   { type: String, required: true, trim: true },
    emailUsuario: { type: String, default: '', trim: true },
    senha:        { type: String, default: '' },
    obs:          { type: String, default: '' },
    categoria:    { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformCredential', platformCredentialSchema);

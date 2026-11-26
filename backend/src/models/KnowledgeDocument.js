const mongoose = require('mongoose');

const knowledgeDocumentSchema = new mongoose.Schema(
  {
    driveFileId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    mimeType: { type: String, default: '' },
    fileExtension: { type: String, default: '' },
    driveUrl: { type: String, default: '' },
    downloadUrl: { type: String, default: '' },
    folderPath: { type: String, default: '/' },
    folderId: { type: String, default: '' },
    area: { type: String, default: 'Geral', index: true },
    size: { type: Number, default: 0 },
    driveModifiedTime: { type: Date, default: null },
    indexedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['indexed', 'processing', 'error', 'ignored'],
      default: 'processing',
      index: true,
    },
    errorMessage: { type: String, default: '' },
    chunkCount: { type: Number, default: 0 },
    characterCount: { type: Number, default: 0 },
    extractedSummary: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KnowledgeDocument', knowledgeDocumentSchema);

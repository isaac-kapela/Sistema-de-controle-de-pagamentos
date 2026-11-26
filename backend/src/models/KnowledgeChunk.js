const mongoose = require('mongoose');

const knowledgeChunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeDocument',
      required: true,
      index: true,
    },
    driveFileId: { type: String, required: true, index: true },
    documentName: { type: String, required: true, index: true },
    folderPath: { type: String, default: '/' },
    driveUrl: { type: String, default: '' },
    chunkIndex: { type: Number, required: true },
    totalChunks: { type: Number, required: true },
    content: { type: String, required: true },
    section: { type: String, default: '' },
    embedding: {
      type: [Number],
      default: undefined,
      select: true,
    },
  },
  { timestamps: true }
);

// Índice composto para buscar chunks de um documento rapidamente
knowledgeChunkSchema.index({ documentId: 1, chunkIndex: 1 });
knowledgeChunkSchema.index({ content: 'text', documentName: 'text' });

module.exports = mongoose.model('KnowledgeChunk', knowledgeChunkSchema);

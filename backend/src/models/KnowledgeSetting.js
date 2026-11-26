const mongoose = require('mongoose');

const knowledgeSettingSchema = new mongoose.Schema(
  {
    driveFolderUrl: { type: String, default: '' },
    driveFolderId: { type: String, default: '' },
    serviceAccountJson: { type: String, default: '' },
    googleApiKey: { type: String, default: '' },
    geminiApiKey: { type: String, default: '' },
    autoSyncEnabled: { type: Boolean, default: true },
    syncIntervalHours: { type: Number, default: 24 },
    lastSyncAt: { type: Date, default: null },
    syncStatus: {
      type: String,
      enum: ['idle', 'syncing', 'error', 'success'],
      default: 'idle',
    },
    syncProgress: {
      totalFiles: { type: Number, default: 0 },
      processedFiles: { type: Number, default: 0 },
      currentFile: { type: String, default: '' },
    },
    syncError: { type: String, default: '' },
    totalDocuments: { type: Number, default: 0 },
    totalChunks: { type: Number, default: 0 },
    lastSyncStats: {
      added: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      deleted: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KnowledgeSetting', knowledgeSettingSchema);

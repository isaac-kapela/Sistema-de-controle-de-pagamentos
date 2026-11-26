const mongoose = require('mongoose');

const messageSourceSchema = new mongoose.Schema(
  {
    documentName: { type: String, required: true },
    driveUrl: { type: String, default: '' },
    folderPath: { type: String, default: '/' },
    snippet: { type: String, default: '' },
    score: { type: Number, default: 0 },
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: { type: String, required: true },
  sources: [messageSourceSchema],
  timestamp: { type: Date, default: Date.now },
});

const chatSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    title: { type: String, default: 'Nova conversa' },
    messages: [chatMessageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatSession', chatSessionSchema);

const { v4: uuidv4 } = require('crypto');
const KnowledgeSetting = require('../models/KnowledgeSetting');
const KnowledgeDocument = require('../models/KnowledgeDocument');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const ChatSession = require('../models/ChatSession');
const { testDriveAccess, getDriveClient, extractFileText } = require('../services/driveService');
const { generateRAGAnswer, chunkText, generateEmbeddings, getGeminiApiKey } = require('../services/ragService');
const { syncKnowledgeBase } = require('../services/syncService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * GET /api/microsabedoria/settings
 */
async function getSettings(req, res) {
  try {
    let setting = await KnowledgeSetting.findOne().lean();
    if (!setting) {
      setting = await KnowledgeSetting.create({});
    }

    const totalDocs = await KnowledgeDocument.countDocuments({ status: 'indexed' });
    const totalChunks = await KnowledgeChunk.countDocuments();
    const errorDocs = await KnowledgeDocument.countDocuments({ status: 'error' });

    res.json({
      ...setting,
      totalDocuments: totalDocs,
      totalChunks,
      errorDocumentsCount: errorDocs,
      // Se tiver serviceAccount, indica que está configurada sem expor tudo se for string sensível
      hasServiceAccount: Boolean(setting.serviceAccountJson && setting.serviceAccountJson.trim()),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/microsabedoria/settings
 */
async function updateSettings(req, res) {
  try {
    const {
      driveFolderUrl,
      serviceAccountJson,
      googleApiKey,
      geminiApiKey,
      autoSyncEnabled,
      syncIntervalHours,
    } = req.body;

    let setting = await KnowledgeSetting.findOne();
    if (!setting) {
      setting = new KnowledgeSetting();
    }

    if (driveFolderUrl !== undefined) setting.driveFolderUrl = driveFolderUrl;
    if (serviceAccountJson !== undefined) setting.serviceAccountJson = serviceAccountJson;
    if (googleApiKey !== undefined) setting.googleApiKey = googleApiKey;
    if (geminiApiKey !== undefined) setting.geminiApiKey = geminiApiKey;
    if (autoSyncEnabled !== undefined) setting.autoSyncEnabled = Boolean(autoSyncEnabled);
    if (syncIntervalHours !== undefined) setting.syncIntervalHours = Number(syncIntervalHours) || 24;

    await setting.save();
    res.json({ success: true, setting });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/microsabedoria/test-connection
 */
async function testConnection(req, res) {
  try {
    const { driveFolderUrl, serviceAccountJson, googleApiKey, geminiApiKey } = req.body;

    const setting = {
      driveFolderUrl,
      serviceAccountJson,
      googleApiKey,
      geminiApiKey,
    };

    const results = {
      drive: { ok: false, message: '' },
      gemini: { ok: false, message: '' },
    };

    // 1. Testa Google Drive
    if (driveFolderUrl) {
      try {
        const driveRes = await testDriveAccess(setting);
        results.drive = { ok: true, message: driveRes.message, folderName: driveRes.folderName };
      } catch (err) {
        results.drive = { ok: false, message: err.message };
      }
    } else {
      results.drive = { ok: false, message: 'Nenhum link de pasta do Google Drive informado.' };
    }

    // 2. Testa Gemini API
    const keyToTest = geminiApiKey || (await getGeminiApiKey());
    if (keyToTest) {
      try {
        const genAI = new GoogleGenerativeAI(keyToTest);
        const modelsToTry = [
          'gemini-3.1-flash-lite',
          'gemini-3.5-flash',
          'gemini-3.8-flash',
          'gemini-3.7-flash',
          'gemini-3.6-flash',
        ];
        let lastErr = null;
        let validated = false;
        for (const m of modelsToTry) {
          try {
            const model = genAI.getGenerativeModel({ model: m });
            await model.generateContent('Responda apenas: OK');
            results.gemini = { ok: true, message: `Conexão com a API do Google Gemini validada com sucesso (${m})!` };
            validated = true;
            break;
          } catch (e) {
            lastErr = e;
          }
        }
        if (!validated) {
          throw lastErr || new Error('Nenhum modelo Gemini compatível respondeu.');
        }
      } catch (err) {
        results.gemini = { ok: false, message: `Erro ao validar API do Gemini: ${err.message}` };
      }
    } else {
      results.gemini = { ok: false, message: 'Nenhuma chave de API do Gemini informada.' };
    }

    res.json({ success: results.drive.ok || results.gemini.ok, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/microsabedoria/sync
 */
async function triggerSync(req, res) {
  try {
    const { force = false } = req.body;

    // Dispara a sincronização de forma assíncrona para não prender a requisição HTTP
    syncKnowledgeBase(force)
      .then((resData) => console.log('[KnowledgeController] Sincronização concluída com sucesso:', resData))
      .catch((err) => console.error('[KnowledgeController] Falha na sincronização:', err.message));

    res.json({
      success: true,
      message: 'Sincronização com o Google Drive iniciada em segundo plano.',
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * GET /api/microsabedoria/sync-status
 */
async function getSyncStatus(req, res) {
  try {
    const setting = await KnowledgeSetting.findOne().lean();
    const totalDocs = await KnowledgeDocument.countDocuments({ status: 'indexed' });
    const totalChunks = await KnowledgeChunk.countDocuments();
    const errorDocs = await KnowledgeDocument.countDocuments({ status: 'error' });

    res.json({
      syncStatus: setting?.syncStatus || 'idle',
      syncProgress: setting?.syncProgress || {},
      syncError: setting?.syncError || '',
      lastSyncAt: setting?.lastSyncAt || null,
      lastSyncStats: setting?.lastSyncStats || {},
      totalDocuments: totalDocs,
      totalChunks,
      errorDocumentsCount: errorDocs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/microsabedoria/documents
 */
async function listDocuments(req, res) {
  try {
    const { search = '', status = '', page = 1, limit = 50 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { folderPath: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await KnowledgeDocument.countDocuments(query);
    const documents = await KnowledgeDocument.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    res.json({
      documents,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/microsabedoria/documents/:id
 */
async function deleteDocument(req, res) {
  try {
    const doc = await KnowledgeDocument.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    await KnowledgeChunk.deleteMany({ documentId: doc._id });
    await KnowledgeDocument.deleteOne({ _id: doc._id });

    // Atualiza contadores
    const totalDocs = await KnowledgeDocument.countDocuments({ status: 'indexed' });
    const totalChunks = await KnowledgeChunk.countDocuments();
    await KnowledgeSetting.updateOne({}, { totalDocuments: totalDocs, totalChunks });

    res.json({ success: true, message: 'Documento e seus trechos removidos da base de conhecimento.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/microsabedoria/documents/:id/reindex
 */
async function reindexDocument(req, res) {
  try {
    const doc = await KnowledgeDocument.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    const setting = await KnowledgeSetting.findOne().lean();
    const drive = getDriveClient(setting);

    doc.status = 'processing';
    doc.errorMessage = '';
    await doc.save();

    const rawText = await extractFileText(drive, {
      driveFileId: doc.driveFileId,
      mimeType: doc.mimeType,
      name: doc.name,
    });

    const chunks = chunkText(rawText);
    await KnowledgeChunk.deleteMany({ documentId: doc._id });

    const geminiApiKey = await getGeminiApiKey(setting?.geminiApiKey);
    let embeddings = [];
    if (geminiApiKey) {
      const chunkTexts = chunks.map((c) => `${doc.name} (${doc.folderPath}):\n${c.content}`);
      embeddings = await generateEmbeddings(chunkTexts, geminiApiKey);
    }

    const chunkDocs = chunks.map((c, idx) => ({
      documentId: doc._id,
      driveFileId: doc.driveFileId,
      documentName: doc.name,
      folderPath: doc.folderPath,
      driveUrl: doc.driveUrl,
      chunkIndex: c.chunkIndex,
      totalChunks: chunks.length,
      content: c.content,
      section: c.section,
      embedding: embeddings[idx] || undefined,
    }));

    if (chunkDocs.length > 0) {
      await KnowledgeChunk.insertMany(chunkDocs);
    }

    doc.status = 'indexed';
    doc.chunkCount = chunks.length;
    doc.characterCount = rawText.length;
    doc.indexedAt = new Date();
    await doc.save();

    res.json({ success: true, document: doc });
  } catch (err) {
    await KnowledgeDocument.findByIdAndUpdate(req.params.id, {
      status: 'error',
      errorMessage: err.message,
    });
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/microsabedoria/chat
 */
async function chat(req, res) {
  try {
    const { message, sessionId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'A mensagem não pode ser vazia.' });
    }

    // Busca ou cria sessão de conversa
    const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    let session = await ChatSession.findOne({ sessionId: currentSessionId });

    if (!session) {
      session = new ChatSession({
        sessionId: currentSessionId,
        title: message.substring(0, 40) + (message.length > 40 ? '...' : ''),
        messages: [],
      });
    }

    // Adiciona mensagem do usuário
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Gera resposta com RAG
    const ragResult = await generateRAGAnswer({
      query: message,
      chatHistory: session.messages,
    });

    // Adiciona resposta do assistente
    session.messages.push({
      role: 'assistant',
      content: ragResult.answer,
      sources: ragResult.sources || [],
      timestamp: new Date(),
    });

    await session.save();

    res.json({
      sessionId: currentSessionId,
      reply: ragResult.answer,
      sources: ragResult.sources || [],
      model: ragResult.model,
      messages: session.messages,
    });
  } catch (err) {
    console.error('[KnowledgeController] Erro no chat:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/microsabedoria/sessions
 */
async function listSessions(req, res) {
  try {
    const sessions = await ChatSession.find()
      .select('sessionId title createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean();

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/microsabedoria/sessions/:id
 */
async function getSession(req, res) {
  try {
    const session = await ChatSession.findOne({ sessionId: req.params.id }).lean();
    if (!session) {
      return res.status(404).json({ error: 'Conversa não encontrada.' });
    }
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/microsabedoria/sessions/:id
 */
async function deleteSession(req, res) {
  try {
    await ChatSession.deleteOne({ sessionId: req.params.id });
    res.json({ success: true, message: 'Conversa removida.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getSettings,
  updateSettings,
  testConnection,
  triggerSync,
  getSyncStatus,
  listDocuments,
  deleteDocument,
  reindexDocument,
  chat,
  listSessions,
  getSession,
  deleteSession,
};

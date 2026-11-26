const cron = require('node-cron');
const KnowledgeSetting = require('../models/KnowledgeSetting');
const KnowledgeDocument = require('../models/KnowledgeDocument');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const { getDriveClient, extractFolderId, listFilesRecursively, extractFileText } = require('./driveService');
const { chunkText, generateEmbeddings, getGeminiApiKey } = require('./ragService');

let isSyncing = false;
let syncCronJob = null;

/**
 * Executa a sincronização completa ou incremental do Google Drive com o banco vetorial
 */
async function syncKnowledgeBase(force = false) {
  if (isSyncing) {
    throw new Error('Uma sincronização da base de conhecimento já está em andamento.');
  }

  isSyncing = true;
  let setting = await KnowledgeSetting.findOne();
  if (!setting) {
    setting = await KnowledgeSetting.create({});
  }

  const folderId = extractFolderId(setting.driveFolderUrl || setting.driveFolderId);
  if (!folderId) {
    isSyncing = false;
    setting.syncStatus = 'error';
    setting.syncError = 'Link ou ID da pasta do Google Drive não configurado.';
    await setting.save();
    throw new Error('Link ou ID da pasta do Google Drive não configurado.');
  }

  const geminiApiKey = await getGeminiApiKey(setting.geminiApiKey);

  // Atualiza status para 'syncing'
  setting.syncStatus = 'syncing';
  setting.syncError = '';
  setting.syncProgress = { totalFiles: 0, processedFiles: 0, currentFile: 'Listando arquivos do Google Drive...' };
  await setting.save();

  const stats = { added: 0, updated: 0, deleted: 0, failed: 0 };

  try {
    const drive = getDriveClient(setting);

    // 1. Lista todos os arquivos suportados recursivamente no Drive
    const driveFiles = await listFilesRecursively(drive, folderId, '', async (msg) => {
      try {
        await KnowledgeSetting.updateOne({}, { 'syncProgress.currentFile': msg });
      } catch (e) {}
    });
    setting.syncProgress.totalFiles = driveFiles.length;
    await setting.save();

    const driveFileIdSet = new Set(driveFiles.map((f) => f.driveFileId));

    // 2. Remove do banco documentos que foram excluídos do Google Drive
    const existingDocs = await KnowledgeDocument.find().lean();
    for (const doc of existingDocs) {
      if (!driveFileIdSet.has(doc.driveFileId)) {
        await KnowledgeChunk.deleteMany({ documentId: doc._id });
        await KnowledgeDocument.deleteOne({ _id: doc._id });
        stats.deleted++;
      }
    }

    // 3. Processa cada arquivo do Drive (adiciona ou atualiza)
    let processedCount = 0;

    for (const fileMeta of driveFiles) {
      processedCount++;
      setting.syncProgress.processedFiles = processedCount;
      setting.syncProgress.currentFile = fileMeta.name;
      await setting.save();

      try {
        const existingDoc = await KnowledgeDocument.findOne({ driveFileId: fileMeta.driveFileId });

        // Verifica se precisa reprocessar (se for novo ou se modifiedTime do Drive mudou ou se force=true)
        const isModified =
          !existingDoc ||
          force ||
          !existingDoc.indexedAt ||
          existingDoc.status === 'error' ||
          (fileMeta.driveModifiedTime &&
            existingDoc.driveModifiedTime &&
            new Date(fileMeta.driveModifiedTime).getTime() > new Date(existingDoc.driveModifiedTime).getTime());

        if (!isModified) {
          continue;
        }

        // Salva documento em estado de processamento
        let docRecord = existingDoc;
        if (!docRecord) {
          docRecord = new KnowledgeDocument({
            driveFileId: fileMeta.driveFileId,
            name: fileMeta.name,
            mimeType: fileMeta.mimeType,
            fileExtension: fileMeta.fileExtension,
            driveUrl: fileMeta.driveUrl,
            downloadUrl: fileMeta.downloadUrl,
            folderPath: fileMeta.folderPath,
            folderId: fileMeta.folderId,
            size: fileMeta.size,
            driveModifiedTime: fileMeta.driveModifiedTime,
            status: 'processing',
          });
        } else {
          docRecord.name = fileMeta.name;
          docRecord.mimeType = fileMeta.mimeType;
          docRecord.fileExtension = fileMeta.fileExtension;
          docRecord.driveUrl = fileMeta.driveUrl;
          docRecord.folderPath = fileMeta.folderPath;
          docRecord.size = fileMeta.size;
          docRecord.driveModifiedTime = fileMeta.driveModifiedTime;
          docRecord.status = 'processing';
          docRecord.errorMessage = '';
        }
        await docRecord.save();

        // 4. Extrai o texto do arquivo
        const rawText = await extractFileText(drive, fileMeta);

        if (!rawText || rawText.trim().length === 0) {
          docRecord.status = 'indexed';
          docRecord.chunkCount = 0;
          docRecord.characterCount = 0;
          docRecord.indexedAt = new Date();
          await docRecord.save();
          continue;
        }

        // 5. Divide em Chunks
        const chunks = chunkText(rawText);

        // Remove chunks antigos do documento
        await KnowledgeChunk.deleteMany({ documentId: docRecord._id });

        // 6. Gera embeddings para os chunks
        let embeddings = [];
        if (geminiApiKey) {
          const chunkTexts = chunks.map((c) => `${fileMeta.name} (${fileMeta.folderPath}):\n${c.content}`);
          embeddings = await generateEmbeddings(chunkTexts, geminiApiKey);
        }

        // 7. Salva chunks no MongoDB
        const chunkDocs = chunks.map((c, idx) => ({
          documentId: docRecord._id,
          driveFileId: fileMeta.driveFileId,
          documentName: fileMeta.name,
          folderPath: fileMeta.folderPath,
          driveUrl: fileMeta.driveUrl,
          chunkIndex: c.chunkIndex,
          totalChunks: chunks.length,
          content: c.content,
          section: c.section,
          embedding: embeddings[idx] || undefined,
        }));

        if (chunkDocs.length > 0) {
          await KnowledgeChunk.insertMany(chunkDocs);
        }

        // 8. Atualiza documento como indexado
        docRecord.status = 'indexed';
        docRecord.chunkCount = chunks.length;
        docRecord.characterCount = rawText.length;
        docRecord.indexedAt = new Date();
        docRecord.errorMessage = '';
        await docRecord.save();

        if (existingDoc) {
          stats.updated++;
        } else {
          stats.added++;
        }
      } catch (fileErr) {
        console.error(`[SyncService] Erro ao processar arquivo "${fileMeta.name}":`, fileErr.message);
        stats.failed++;

        await KnowledgeDocument.findOneAndUpdate(
          { driveFileId: fileMeta.driveFileId },
          {
            driveFileId: fileMeta.driveFileId,
            name: fileMeta.name,
            folderPath: fileMeta.folderPath,
            driveUrl: fileMeta.driveUrl,
            status: 'error',
            errorMessage: fileErr.message,
          },
          { upsert: true, new: true }
        );
      }
    }

    // Atualiza estatísticas finais no setting
    const totalDocs = await KnowledgeDocument.countDocuments({ status: 'indexed' });
    const totalChunks = await KnowledgeChunk.countDocuments();

    setting.syncStatus = 'success';
    setting.syncError = '';
    setting.lastSyncAt = new Date();
    setting.totalDocuments = totalDocs;
    setting.totalChunks = totalChunks;
    setting.lastSyncStats = stats;
    setting.syncProgress = {
      totalFiles: driveFiles.length,
      processedFiles: driveFiles.length,
      currentFile: 'Sincronização concluída com sucesso!',
    };
    await setting.save();

    isSyncing = false;
    return { success: true, stats, totalDocuments: totalDocs, totalChunks };
  } catch (err) {
    isSyncing = false;
    console.error('[SyncService] Erro durante a sincronização:', err.message);

    setting.syncStatus = 'error';
    setting.syncError = err.message;
    await setting.save();
    throw err;
  }
}

/**
 * Inicializa a rotina de sincronização automática com base no intervalo configurado
 */
function startKnowledgeSyncCron() {
  if (syncCronJob) {
    syncCronJob.stop();
  }

  // Executa uma vez ao dia às 03:00 da manhã
  syncCronJob = cron.schedule('0 3 * * *', async () => {
    try {
      const setting = await KnowledgeSetting.findOne().lean();
      if (setting && setting.autoSyncEnabled && (setting.driveFolderUrl || setting.driveFolderId)) {
        console.log('[SyncService] Iniciando sincronização automática diária da Microsabedoria...');
        await syncKnowledgeBase(false);
      }
    } catch (err) {
      console.error('[SyncService] Erro na sincronização diária agendada:', err.message);
    }
  });

  console.log('[SyncService] Cron da base de conhecimento da Microsabedoria iniciado (03:00 diário).');
}

module.exports = {
  syncKnowledgeBase,
  startKnowledgeSyncCron,
};

const cron = require('node-cron');
const KnowledgeSetting = require('../models/KnowledgeSetting');
const KnowledgeDocument = require('../models/KnowledgeDocument');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const { getDriveClient, extractFolderId, listFilesRecursively, extractFileText } = require('./driveService');
const { chunkText, generateEmbeddings, getGeminiApiKey } = require('./ragService');

let isSyncing = false;
let syncCronJob = null;

// Concorrência padrão de processamento de arquivos
const SYNC_CONCURRENCY = 6;
// Tamanho máximo de arquivo para processamento (30MB)
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;

/**
 * Ordena os arquivos priorizando documentos institucionais, regulamentos, manuais e formatos de texto
 */
function sortFilesByPriority(files) {
  const priorityExts = { gdoc: 10, docx: 9, doc: 8, pdf: 7, gsheet: 6, xlsx: 5, md: 4, txt: 3 };

  return [...files].sort((a, b) => {
    // 1. Arquivos na raiz ou pastas de gestão/didática primeiro
    const aIsRoot = a.folderPath === '/' || a.folderPath.includes('Gestão') || a.folderPath.includes('Material Didático');
    const bIsRoot = b.folderPath === '/' || b.folderPath.includes('Gestão') || b.folderPath.includes('Material Didático');
    if (aIsRoot && !bIsRoot) return -1;
    if (!aIsRoot && bIsRoot) return 1;

    // 2. Extensão do arquivo
    const scoreA = priorityExts[a.fileExtension] || 0;
    const scoreB = priorityExts[b.fileExtension] || 0;
    if (scoreA !== scoreB) return scoreB - scoreA;

    // 3. Mais recentes primeiro
    const timeA = a.driveModifiedTime ? new Date(a.driveModifiedTime).getTime() : 0;
    const timeB = b.driveModifiedTime ? new Date(b.driveModifiedTime).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * Executa a sincronização completa ou incremental em paralelo do Google Drive com o banco vetorial
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

  const stats = { added: 0, updated: 0, deleted: 0, failed: 0, skipped: 0 };

  try {
    const drive = getDriveClient(setting);

    // 1. Lista todos os arquivos suportados recursivamente no Drive
    const rawDriveFiles = await listFilesRecursively(drive, folderId, '', async (msg) => {
      try {
        await KnowledgeSetting.updateOne({}, { 'syncProgress.currentFile': msg });
      } catch (e) {}
    });

    // Filtra arquivos excessivamente grandes que não são documentos de texto
    const driveFiles = rawDriveFiles.filter((f) => !f.size || f.size <= MAX_FILE_SIZE_BYTES);

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

    // 3. Mapeia documentos existentes no banco para verificação incremental ultrarrápida
    const existingDocMap = new Map();
    const currentIndexedDocs = await KnowledgeDocument.find().lean();
    currentIndexedDocs.forEach((d) => existingDocMap.set(d.driveFileId, d));

    // 4. Ordena os arquivos por prioridade
    const prioritizedFiles = sortFilesByPriority(driveFiles);

    let processedCount = 0;
    let lastProgressUpdate = Date.now();

    // Função auxiliar para atualizar progresso sem sobrecarregar o banco
    const updateProgressThrottled = async (currentFileName) => {
      processedCount++;
      const now = Date.now();
      if (now - lastProgressUpdate > 1200 || processedCount === prioritizedFiles.length) {
        lastProgressUpdate = now;
        try {
          await KnowledgeSetting.updateOne(
            {},
            {
              'syncProgress.processedFiles': processedCount,
              'syncProgress.currentFile': currentFileName,
            }
          );
        } catch (e) {}
      }
    };

    // 5. Função de processamento individual de arquivo
    const processSingleFile = async (fileMeta) => {
      try {
        const existingDoc = existingDocMap.get(fileMeta.driveFileId);

        // Verifica se precisa reprocessar
        const isModified =
          !existingDoc ||
          force ||
          !existingDoc.indexedAt ||
          existingDoc.status === 'error' ||
          (fileMeta.driveModifiedTime &&
            existingDoc.driveModifiedTime &&
            new Date(fileMeta.driveModifiedTime).getTime() > new Date(existingDoc.driveModifiedTime).getTime());

        if (!isModified) {
          stats.skipped++;
          await updateProgressThrottled(fileMeta.name);
          return;
        }

        // Salva documento em estado de processamento
        let docRecord = await KnowledgeDocument.findOne({ driveFileId: fileMeta.driveFileId });
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

        // Extrai o texto do arquivo
        const rawText = await extractFileText(drive, fileMeta);

        if (!rawText || rawText.trim().length === 0) {
          docRecord.status = 'indexed';
          docRecord.chunkCount = 0;
          docRecord.characterCount = 0;
          docRecord.indexedAt = new Date();
          await docRecord.save();
          await updateProgressThrottled(fileMeta.name);
          return;
        }

        // Divide em Chunks
        const chunks = chunkText(rawText);

        // Remove chunks antigos do documento
        await KnowledgeChunk.deleteMany({ documentId: docRecord._id });

        // Gera embeddings para os chunks em lote (limita até 50 embeddings prioritários por documento)
        let embeddings = [];
        if (geminiApiKey && chunks.length > 0) {
          const chunksToEmbed = chunks.slice(0, 50);
          const chunkTexts = chunksToEmbed.map((c) => `${fileMeta.name} (${fileMeta.folderPath}):\n${c.content}`);
          embeddings = await generateEmbeddings(chunkTexts, geminiApiKey);
        }

        // Salva chunks no MongoDB
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

        // Atualiza documento como indexado
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
      } finally {
        await updateProgressThrottled(fileMeta.name);
      }
    };

    // 6. Pool de Execução Paralela com limite de concorrência
    const queue = [...prioritizedFiles];
    const workers = Array.from({ length: SYNC_CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) {
          await processSingleFile(item);
        }
      }
    });

    await Promise.all(workers);

    // 7. Atualiza estatísticas finais no setting
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

    try {
      setting.syncStatus = 'error';
      setting.syncError = err.message;
      await setting.save();
    } catch (e) {}

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

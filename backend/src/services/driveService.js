const { google } = require('googleapis');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');

// Extrai ID de pasta do Google Drive a partir de link ou ID puro
function extractFolderId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const trimmed = urlOrId.trim();

  // Se já for só o ID
  if (!trimmed.includes('/') && !trimmed.includes('?')) {
    return trimmed;
  }

  // Padrão /folders/{id}
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  // Padrão id={id}
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  return trimmed;
}

// Inicializa cliente do Google Drive
function getDriveClient(setting = {}) {
  let auth = null;

  // 1. Tenta usar Service Account JSON se fornecido
  if (setting.serviceAccountJson) {
    try {
      const credentials = typeof setting.serviceAccountJson === 'string'
        ? JSON.parse(setting.serviceAccountJson)
        : setting.serviceAccountJson;

      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
    } catch (err) {
      console.warn('[DriveService] Erro ao parsear Service Account JSON:', err.message);
    }
  }

  // 2. Se tiver Google API Key e não tiver Service Account
  if (!auth && (setting.googleApiKey || process.env.GOOGLE_API_KEY)) {
    const apiKey = setting.googleApiKey || process.env.GOOGLE_API_KEY;
    return google.drive({ version: 'v3', auth: apiKey });
  }

  // 3. Se auth configurado com GoogleAuth
  if (auth) {
    return google.drive({ version: 'v3', auth });
  }

  // Retorna cliente padrão (vai funcionar se houver Application Default Credentials)
  return google.drive({ version: 'v3' });
}

// Mapeamento de tipos suportados
const SUPPORTED_MIME_TYPES = {
  // Google Native Docs
  'application/vnd.google-apps.document': { ext: 'gdoc', isGoogleDoc: true },
  'application/vnd.google-apps.spreadsheet': { ext: 'gsheet', isGoogleDoc: true },
  'application/vnd.google-apps.presentation': { ext: 'gslides', isGoogleDoc: true },

  // PDF & Office
  'application/pdf': { ext: 'pdf' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx' },
  'application/msword': { ext: 'doc' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx' },
  'application/vnd.ms-excel': { ext: 'xls' },
  'text/csv': { ext: 'csv' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: 'pptx' },

  // Plain Text & Markdown
  'text/plain': { ext: 'txt' },
  'text/markdown': { ext: 'md' },
  'application/json': { ext: 'json' },
};

/**
 * Detecta a área/setor da equipe com base no caminho da pasta e nome do arquivo
 */
function detectAreaFromPath(folderPath = '', filename = '') {
  const target = `${folderPath} ${filename}`.toLowerCase();

  if (target.includes('gestão') || target.includes('gestao') || target.includes('regulamento') || target.includes('ata') || target.includes('planejamento') || target.includes('capitania') || target.includes('diretoria')) {
    return 'Gestão';
  }
  if (target.includes('aerodinâmica') || target.includes('aerodinamica') || target.includes('aero') || target.includes('perfil') || target.includes('asa') || target.includes('envergadura') || target.includes('polimorfismo')) {
    return 'Aerodinâmica';
  }
  if (target.includes('estrutura') || target.includes('material') || target.includes('longarina') || target.includes('fuselagem') || target.includes('trem de pouso') || target.includes('compósito')) {
    return 'Estruturas';
  }
  if (target.includes('carga') || target.includes('empenagem') || target.includes('envelope') || target.includes('desempenho') || target.includes('voo') || target.includes('manobra')) {
    return 'Cargas';
  }
  if (target.includes('estabilidade') || target.includes('controle') || target.includes('superfície') || target.includes('superficie') || target.includes('leme') || target.includes('profundor') || target.includes('aileron')) {
    return 'Estabilidade';
  }
  if (target.includes('elétrica') || target.includes('eletrica') || target.includes('sistema') || target.includes('telemetria') || target.includes('motor') || target.includes('propulsão') || target.includes('bateria') || target.includes('servo')) {
    return 'Elétrica';
  }
  if (target.includes('material didático') || target.includes('didatico') || target.includes('didática') || target.includes('curso') || target.includes('manual') || target.includes('apostila') || target.includes('livro')) {
    return 'Material Didático';
  }

  return 'Geral';
}

/**
 * Identifica pastas de ruído (logs brutos de simulação, sementes de algoritmos genéticos, malhas numéricas)
 */
function isNoiseFolder(folderName = '', folderPath = '') {
  const combined = `${folderPath}/${folderName}`.toLowerCase();
  const noisePatterns = [
    'best_seed_',
    'logs_e_geometria',
    'arquivos_best_seed',
    'resultados_brutos',
    'mesh_data',
    'temp_',
    'cache_',
    '__pycache__',
    '.git',
    'node_modules',
  ];

  return noisePatterns.some((pattern) => combined.includes(pattern));
}

function isFileSupported(mimeType, filename = '') {
  if (SUPPORTED_MIME_TYPES[mimeType]) return true;
  const ext = (filename.split('.').pop() || '').toLowerCase();
  return ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'txt', 'md', 'json', 'pptx'].includes(ext);
}

function getFileExtension(mimeType, filename = '') {
  if (SUPPORTED_MIME_TYPES[mimeType]?.ext) {
    return SUPPORTED_MIME_TYPES[mimeType].ext;
  }
  const ext = (filename.split('.').pop() || '').toLowerCase();
  return ext || 'txt';
}

/**
 * Percorre recursivamente todas as pastas e subpastas a partir de uma pasta raiz no Google Drive
 */
async function listFilesRecursively(drive, folderId, currentPath = '', onProgress = null) {
  const allFiles = [];
  const queue = [{ folderId, folderPath: currentPath || '' }];
  const visitedFolders = new Set();
  let folderCount = 0;

  while (queue.length > 0) {
    // Processa lotes de pastas concorrentemente para maior rapidez
    const batch = queue.splice(0, 6);

    await Promise.all(
      batch.map(async (current) => {
        if (visitedFolders.has(current.folderId)) return;
        visitedFolders.add(current.folderId);
        folderCount++;

        if (onProgress) {
          onProgress(`Explorando pasta: ${current.folderPath || 'raiz'} (${allFiles.length} arquivos catalogados)`);
        }

        let pageToken = null;
        do {
          try {
            const res = await drive.files.list({
              q: `'${current.folderId}' in parents and trashed = false`,
              fields: 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, size, modifiedTime, parents, description)',
              pageSize: 100,
              pageToken: pageToken || undefined,
              supportsAllDrives: true,
              includeItemsFromAllDrives: true,
            });

            const files = res.data.files || [];
            for (const file of files) {
              if (file.mimeType === 'application/vnd.google-apps.folder') {
                // Pula pastas de ruído (logs brutos e sementes de simulações)
                if (isNoiseFolder(file.name, current.folderPath)) {
                  continue;
                }
                const nextPath = current.folderPath
                  ? `${current.folderPath}/${file.name}`
                  : file.name;
                queue.push({
                  folderId: file.id,
                  folderPath: nextPath,
                });
              } else if (isFileSupported(file.mimeType, file.name)) {
                allFiles.push({
                  driveFileId: file.id,
                  name: file.name,
                  mimeType: file.mimeType,
                  fileExtension: getFileExtension(file.mimeType, file.name),
                  driveUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
                  downloadUrl: file.webContentLink || '',
                  folderPath: current.folderPath ? `/${current.folderPath}` : '/',
                  folderId: current.folderId,
                  area: detectAreaFromPath(current.folderPath, file.name),
                  size: file.size ? parseInt(file.size, 10) : 0,
                  driveModifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
                });
              }
            }

            pageToken = res.data.nextPageToken;
          } catch (err) {
            console.error(`[DriveService] Erro ao listar arquivos da pasta ${current.folderId}:`, err.message);
            break;
          }
        } while (pageToken);
      })
    );
  }

  console.log(`[DriveService] Concluída varredura de ${folderCount} pastas úteis. Total de ${allFiles.length} arquivos catalogados.`);
  return allFiles;
}

/**
 * Baixa e extrai o texto do arquivo a partir da API do Google Drive
 */
async function extractFileText(drive, fileMeta) {
  const { driveFileId, mimeType, name } = fileMeta;

  try {
    // 1. Google Docs -> Exportar para Plain Text
    if (mimeType === 'application/vnd.google-apps.document') {
      const res = await drive.files.export(
        { fileId: driveFileId, mimeType: 'text/plain' },
        { responseType: 'text' }
      );
      return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    }

    // 2. Google Spreadsheets -> Exportar para CSV
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      const res = await drive.files.export(
        { fileId: driveFileId, mimeType: 'text/csv' },
        { responseType: 'text' }
      );
      return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    }

    // 3. Google Slides -> Exportar para Plain Text
    if (mimeType === 'application/vnd.google-apps.presentation') {
      const res = await drive.files.export(
        { fileId: driveFileId, mimeType: 'text/plain' },
        { responseType: 'text' }
      );
      return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    }

    // 4. Arquivos Binários (PDF, DOCX, XLSX, etc) -> Baixar Buffer
    const res = await drive.files.get(
      { fileId: driveFileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );
    const buffer = Buffer.from(res.data);

    const ext = getFileExtension(mimeType, name);

    // Extração para PDF
    if (mimeType === 'application/pdf' || ext === 'pdf') {
      const parsed = await pdfParse(buffer);
      return parsed.text || '';
    }

    // Extração para DOCX
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === 'docx'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    }

    // Extração para Planilhas (XLSX, XLS, CSV)
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'text/csv' ||
      ['xlsx', 'xls', 'csv'].includes(ext)
    ) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let fullText = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csvData = XLSX.utils.sheet_to_csv(sheet);
        if (csvData.trim()) {
          fullText += `--- Aba: ${sheetName} ---\n${csvData}\n\n`;
        }
      }
      return fullText;
    }

    // Extração para Textos / Markdown / JSON
    if (
      mimeType.startsWith('text/') ||
      ['txt', 'md', 'json', 'log'].includes(ext)
    ) {
      return buffer.toString('utf-8');
    }

    // Fallback: tenta converter buffer para string utf-8 limpando bytes não imprimíveis
    const fallbackText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t\u00A0-\u024F]/g, ' ');
    if (fallbackText.trim().length > 50) {
      return fallbackText;
    }

    return '';
  } catch (err) {
    console.error(`[DriveService] Erro ao extrair texto do arquivo "${name}" (${driveFileId}):`, err.message);
    throw new Error(`Falha ao ler arquivo "${name}": ${err.message}`);
  }
}

/**
 * Testa se a pasta do Google Drive é acessível
 */
async function testDriveAccess(setting) {
  const folderId = extractFolderId(setting.driveFolderUrl || setting.driveFolderId);
  if (!folderId) {
    throw new Error('ID ou Link da pasta do Google Drive não informado.');
  }

  const drive = getDriveClient(setting);
  try {
    const res = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType',
      supportsAllDrives: true,
    });
    return {
      success: true,
      folderId: res.data.id,
      folderName: res.data.name,
      message: `Pasta "${res.data.name}" acessada com sucesso!`,
    };
  } catch (err) {
    throw new Error(`Não foi possível acessar a pasta no Google Drive: ${err.message}`);
  }
}

module.exports = {
  extractFolderId,
  getDriveClient,
  listFilesRecursively,
  extractFileText,
  testDriveAccess,
  detectAreaFromPath,
  isNoiseFolder,
};

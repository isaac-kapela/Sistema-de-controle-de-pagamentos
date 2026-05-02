const pdfParse = require('pdf-parse');

// Mapeamento de abreviações de dia (usadas no comprovante UFJF) para índice 0-6
const DAY_MAP = {
  SEG: 0,
  TER: 1,
  QUA: 2,
  QUI: 3,
  SEX: 4,
  SAB: 5,
  DOM: 6,
};

function normDay(str) {
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .substring(0, 3);
}

/**
 * Lê o buffer de um PDF de comprovante de matrícula da UFJF e retorna:
 *   { nome, semestre, slots: [{day, hour}] }
 *
 * Estratégia: extrai texto livre e captura todos os padrões
 *   "DIA, HH:MM" presentes na tabela de disciplinas do comprovante.
 * Cada ocorrência gera 2 slots consecutivos (padrão UFJF: aulas de 2h).
 */
async function parseScheduleFromPDF(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text;

  // Nome do aluno
  const nomeMatch = text.match(/NOME:\s*([A-ZÀÁÂÃÄÇÉÊÍÓÔÕÚÜ\s]+?)(?=\s{2,}|CPF|\n)/i);
  const nome = nomeMatch ? nomeMatch[1].trim() : '';

  // Período/semestre: no comprovante UFJF aparece como "2026/1\tPeríodo:" (valor antes da label)
  // Tenta os dois formatos possíveis
  const periodoMatch =
    text.match(/([\d]{4}[.\\/]\d)\s*Per[íi]odo:/i) ||   // "2026/1  Período:"
    text.match(/Per[íi]odo:\s*([\d]{4}[.\\/]\d)/i);      // "Período: 2026.1"
  const semestre = periodoMatch ? periodoMatch[1].replace('/', '.') : '';

  // Captura todos os padrões "SEG, 14:00" / "TER, 21:00" etc.
  // O comprovante UFJF usa exatamente esse formato na coluna "Horário"
  const pattern = /\b(SEG|TER|QUA|QUI|SEX|SAB|DOM)[A-ZÁÉÍÓÚÃÇÊ]*,?\s+(\d{1,2}):(\d{2})/gi;

  const seen = new Set();
  const slots = [];

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const dayKey = normDay(match[1]);
    const hour   = parseInt(match[2], 10);
    const day    = DAY_MAP[dayKey];

    if (day === undefined || hour < 7 || hour > 22) continue;

    // Marca hora de início E hora seguinte (aula padrão de 2h na UFJF)
    for (const h of [hour, hour + 1]) {
      if (h > 23) continue;
      const key = `${day}-${h}`;
      if (!seen.has(key)) {
        seen.add(key);
        slots.push({ day, hour: h });
      }
    }
  }

  return { nome, semestre, slots };
}

module.exports = { parseScheduleFromPDF };

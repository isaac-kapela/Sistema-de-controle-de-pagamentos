const Meeting = require('../models/Meeting');
const Activity = require('../models/Activity');

const DEFAULT_PAUTA_LINK =
  'https://docs.google.com/document/d/1JRl84EZZ2GDFJYrld4Sfck__olyE6RX1Yq_664zqdhw/edit?tab=t.0';

/**
 * Sincroniza reuniões do banco para a coleção de Atividades.
 * Garante que reuniões agendadas apareçam automaticamente na tela de Atividades.
 */
async function syncMeetingsToActivities(semesterId = null) {
  try {
    const filter = { status: { $ne: 'cancelled' } };
    if (semesterId) {
      filter.semesterId = semesterId;
    }

    const meetings = await Meeting.find(filter);
    let syncedCount = 0;

    for (const m of meetings) {
      if (!m.date) continue;

      const dateObj = new Date(m.date);
      const year = dateObj.getUTCFullYear();
      const month = dateObj.getUTCMonth();
      const day = dateObj.getUTCDate();
      const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

      const title = m.status === 'extra' ? 'Reunião Extra Microraptor' : 'Reunião Geral Microraptor';
      const desc = m.notes
        ? `${m.notes} | Pauta: ${DEFAULT_PAUTA_LINK}`
        : `Reunião periódica da equipe Microraptor. Pauta e alinhamentos: ${DEFAULT_PAUTA_LINK}`;

      await Activity.updateOne(
        {
          categoria: 'Reunião Geral',
          data: { $gte: startOfDay, $lte: endOfDay },
        },
        {
          $setOnInsert: {
            titulo: title,
            descricao: desc,
            data: startOfDay,
            hora: m.startTime || '12:00',
            local: 'meet',
            categoria: 'Reunião Geral',
            prioridade: 'alta',
            responsavel: 'Capitania / Gestão',
            notificarEmail: true,
            notificacaoEnviada: false,
            status: 'pendente',
            concluida: false,
          },
        },
        { upsert: true }
      );
      syncedCount++;
    }

    return { ok: true, syncedCount };
  } catch (err) {
    console.error('[MeetingSync] Erro ao sincronizar reuniões:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  syncMeetingsToActivities,
  DEFAULT_PAUTA_LINK,
};

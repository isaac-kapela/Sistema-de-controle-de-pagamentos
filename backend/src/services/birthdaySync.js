const Member = require('../models/Member');
const Activity = require('../models/Activity');

/**
 * Sincroniza aniversários dos membros estritamente ATIVOS para a coleção de Atividades.
 * Exclui ex-membros e membros inativos.
 * Insere ou atualiza os eventos de aniversário nos anos selecionados (ex: 2025, 2026, 2027).
 */
async function syncBirthdaysToActivities(years = [2025, 2026, 2027]) {
  try {
    // Busca apenas membros estritamente ativos (tipoMembro === 'membro' e ativo === true)
    const activeMembers = await Member.find({
      ativo: true,
      tipoMembro: 'membro',
      dataNascimento: { $ne: null },
    }).select('nome dataNascimento area');

    const activeNames = activeMembers.map((m) => m.nome);

    // Remove do calendário quaisquer aniversários de ex-membros ou membros inativos
    await Activity.deleteMany({
      categoria: 'Aniversário',
      responsavel: { $nin: activeNames },
    });

    let syncedCount = 0;

    for (const member of activeMembers) {
      if (!member.dataNascimento) continue;

      const birthDate = new Date(member.dataNascimento);
      const birthMonth = birthDate.getUTCMonth();
      const birthDay = birthDate.getUTCDate();

      for (const year of years) {
        // Cria data normalizada para o dia do aniversário ao meio-dia UTC
        const eventDate = new Date(Date.UTC(year, birthMonth, birthDay, 12, 0, 0, 0));
        const startOfDay = new Date(Date.UTC(year, birthMonth, birthDay, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(year, birthMonth, birthDay, 23, 59, 59, 999));

        const title = `Aniversário: ${member.nome}`;
        const desc = `Comemoração do aniversário de ${member.nome}${member.area ? ` (Área: ${member.area})` : ''}. Parabéns da Equipe Microraptor!`;

        await Activity.updateOne(
          {
            categoria: 'Aniversário',
            responsavel: member.nome,
            data: { $gte: startOfDay, $lte: endOfDay },
          },
          {
            $set: {
              titulo: title,
              descricao: desc,
              data: eventDate,
              hora: 'Dia todo',
              local: 'Microraptor UFJF',
              categoria: 'Aniversário',
              prioridade: 'media',
              responsavel: member.nome,
              notificarEmail: false,
              status: 'pendente',
              concluida: false,
              criadoPor: 'Sistema',
            },
          },
          { upsert: true }
        );

        syncedCount++;
      }
    }

    console.log(`[BirthdaySync] Sincronizados ${syncedCount} aniversários para os ${activeMembers.length} membros ativos nos anos ${years.join(', ')}.`);
    return { ok: true, syncedCount, membersCount: activeMembers.length, activeMembers: activeNames };
  } catch (err) {
    console.error('[BirthdaySync] Erro ao sincronizar aniversários:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  syncBirthdaysToActivities,
};

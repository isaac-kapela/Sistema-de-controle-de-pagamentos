const Activity = require('../models/Activity');
const {
  sendActivityReminderToActiveMembers,
  checkAndSendTomorrowActivities,
} = require('../services/activityReminder');
const { syncMeetingsToActivities } = require('../services/meetingSync');

// Lista todas as atividades com filtros e busca
exports.list = async (req, res) => {
  try {
    const { search, categoria, prioridade, status, periodo } = req.query;
    const filter = {};

    if (categoria) {
      filter.categoria = categoria;
    }

    if (prioridade) {
      filter.prioridade = prioridade;
    }

    if (status === 'concluida') {
      filter.concluida = true;
    } else if (status === 'pendente') {
      filter.concluida = false;
      filter.status = { $ne: 'cancelada' };
    }

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    if (periodo === 'proximas') {
      filter.data = { $gte: todayStart };
    } else if (periodo === 'semana') {
      const in7Days = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      filter.data = { $gte: todayStart, $lte: in7Days };
    } else if (periodo === 'mes') {
      const in30Days = new Date(todayStart.getTime() + 30 * 24 * 60 * 60 * 1000);
      filter.data = { $gte: todayStart, $lte: in30Days };
    } else if (periodo === 'passadas') {
      filter.data = { $lt: todayStart };
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { titulo: { $regex: term, $options: 'i' } },
        { descricao: { $regex: term, $options: 'i' } },
        { local: { $regex: term, $options: 'i' } },
        { responsavel: { $regex: term, $options: 'i' } },
        { categoria: { $regex: term, $options: 'i' } },
      ];
    }

    const activities = await Activity.find(filter).sort({ data: 1, hora: 1 });

    // Estatísticas gerais
    const allActivities = await Activity.find({});
    const totalPendente = allActivities.filter((a) => !a.concluida && a.status !== 'cancelada').length;
    const totalConcluida = allActivities.filter((a) => a.concluida).length;
    const totalAltaPrioridade = allActivities.filter(
      (a) => a.prioridade === 'alta' && !a.concluida && a.status !== 'cancelada'
    ).length;

    const in7Days = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const proximas7Dias = allActivities.filter(
      (a) => !a.concluida && a.data >= todayStart && a.data <= in7Days && a.status !== 'cancelada'
    ).length;

    res.json({
      activities,
      total: activities.length,
      stats: {
        totalPendente,
        totalConcluida,
        totalAltaPrioridade,
        proximas7Dias,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Criação de nova atividade
exports.create = async (req, res) => {
  try {
    const {
      titulo,
      descricao,
      data,
      hora,
      local,
      categoria,
      prioridade,
      responsavel,
      notificarEmail,
      criadoPor,
    } = req.body;

    if (!titulo || !data) {
      return res.status(400).json({ error: 'Título e data da atividade são obrigatórios.' });
    }

    const activity = await Activity.create({
      titulo,
      descricao: descricao || '',
      data: new Date(data),
      hora: hora || '',
      local: local || '',
      categoria: categoria || 'Reunião Geral',
      prioridade: prioridade || 'media',
      responsavel: responsavel || '',
      notificarEmail: notificarEmail !== false,
      criadoPor: criadoPor || '',
    });

    res.status(201).json(activity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Atualização de atividade
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      descricao,
      data,
      hora,
      local,
      categoria,
      prioridade,
      responsavel,
      notificarEmail,
      status,
    } = req.body;

    const activity = await Activity.findByIdAndUpdate(
      id,
      {
        titulo,
        descricao: descricao || '',
        data: data ? new Date(data) : undefined,
        hora: hora || '',
        local: local || '',
        categoria: categoria || 'Reunião Geral',
        prioridade: prioridade || 'media',
        responsavel: responsavel || '',
        notificarEmail: notificarEmail !== false,
        status: status || 'pendente',
      },
      { new: true, runValidators: true }
    );

    if (!activity) {
      return res.status(404).json({ error: 'Atividade não encontrada' });
    }

    res.json(activity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Alternar status de concluída
exports.toggleComplete = async (req, res) => {
  try {
    const { id } = req.params;
    const activity = await Activity.findById(id);

    if (!activity) {
      return res.status(404).json({ error: 'Atividade não encontrada' });
    }

    activity.concluida = !activity.concluida;
    activity.concluidaEm = activity.concluida ? new Date() : null;
    activity.status = activity.concluida ? 'concluida' : 'pendente';
    await activity.save();

    res.json(activity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Excluir atividade
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const activity = await Activity.findByIdAndDelete(id);

    if (!activity) {
      return res.status(404).json({ error: 'Atividade não encontrada' });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Disparo de lembrete manual sob demanda
exports.sendManualReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetEmail } = req.body;
    const activity = await Activity.findById(id);

    if (!activity) {
      return res.status(404).json({ error: 'Atividade não encontrada' });
    }

    const result = await sendActivityReminderToActiveMembers(activity, false, targetEmail);
    if (!result.ok) {
      return res.status(400).json({ error: result.error || 'Falha ao enviar lembrete' });
    }

    const msg = targetEmail
      ? `E-mail de teste enviado com sucesso para ${targetEmail}!`
      : `Lembrete enviado com sucesso para ${result.sentCount} membros ativos!`;

    res.json({
      ok: true,
      sentCount: result.sentCount,
      total: result.total,
      message: msg,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Sincroniza reuniões da coleção de Presenças/Semestre para Atividades
exports.syncMeetings = async (req, res) => {
  try {
    const { semesterId } = req.body || {};
    const result = await syncMeetingsToActivities(semesterId);
    if (!result.ok) {
      return res.status(500).json({ error: result.error || 'Erro ao sincronizar reuniões' });
    }
    res.json({
      ok: true,
      syncedCount: result.syncedCount,
      message: `${result.syncedCount} reuniões sincronizadas para o calendário de atividades com sucesso!`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Disparo manual da checagem de atividades de amanhã
exports.checkTomorrow = async (req, res) => {
  try {
    const result = await checkAndSendTomorrowActivities();
    res.json({
      ok: true,
      processedCount: result?.count || 0,
      message: result?.count > 0
        ? `Lembretes enviados para ${result.count} atividade(s) de amanhã!`
        : 'Nenhuma atividade pendente para amanhã encontrada.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

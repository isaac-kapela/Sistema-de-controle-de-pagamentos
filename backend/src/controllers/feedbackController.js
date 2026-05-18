const FeedbackCampaign = require('../models/FeedbackCampaign');
const FeedbackResponse = require('../models/FeedbackResponse');

// GET /api/feedbacks
async function listCampaigns(req, res) {
  try {
    const { status, tipo, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (tipo) filter.tipo = tipo;
    if (search) filter.nome = { $regex: search, $options: 'i' };

    const campaigns = await FeedbackCampaign.find(filter)
      .populate('membros', 'nome area email')
      .sort({ createdAt: -1 });

    const withCounts = await Promise.all(
      campaigns.map(async (c) => {
        const totalExpected = c.membros.length * (c.membros.length - 1 + c.areas.length);
        const totalReceived = await FeedbackResponse.countDocuments({
          campanha: c._id,
          concluido: true,
        });
        return {
          ...c.toJSON(),
          totalExpected,
          totalReceived,
          percentual:
            totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0,
        };
      })
    );

    res.json(withCounts);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar campanhas de feedback' });
  }
}

// GET /api/feedbacks/stats
async function getStats(req, res) {
  try {
    const ativos = await FeedbackCampaign.countDocuments({ status: 'ativo' });
    const total = await FeedbackCampaign.countDocuments({
      status: { $ne: 'arquivado' },
    });
    const totalRespostas = await FeedbackResponse.countDocuments({ concluido: true });
    res.json({ ativos, total, totalRespostas });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
}

// GET /api/feedbacks/:id
async function getCampaign(req, res) {
  try {
    const campaign = await FeedbackCampaign.findById(req.params.id).populate(
      'membros',
      'nome area email'
    );
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar campanha' });
  }
}

// POST /api/feedbacks
async function createCampaign(req, res) {
  try {
    const campaign = await FeedbackCampaign.create(req.body);
    const populated = await campaign.populate('membros', 'nome area email');
    res.status(201).json(populated);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors)
        .map((e) => e.message)
        .join(', ');
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Erro ao criar campanha' });
  }
}

// PUT /api/feedbacks/:id
async function updateCampaign(req, res) {
  try {
    const campaign = await FeedbackCampaign.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('membros', 'nome area email');
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    res.json(campaign);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors)
        .map((e) => e.message)
        .join(', ');
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Erro ao atualizar campanha' });
  }
}

// DELETE /api/feedbacks/:id
async function deleteCampaign(req, res) {
  try {
    const campaign = await FeedbackCampaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    await FeedbackResponse.deleteMany({ campanha: req.params.id });
    res.json({ message: 'Campanha excluída com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir campanha' });
  }
}

// POST /api/feedbacks/:id/duplicate
async function duplicateCampaign(req, res) {
  try {
    const original = await FeedbackCampaign.findById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Campanha não encontrada' });

    const data = original.toObject();
    delete data._id;
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;
    // Reset criteria _ids
    data.criterios = (data.criterios || []).map(({ _id: _removed, ...c }) => c);
    data.nome = `${data.nome} (Cópia)`;
    data.status = 'inativo';

    const copy = await FeedbackCampaign.create(data);
    const populated = await copy.populate('membros', 'nome area email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao duplicar campanha' });
  }
}

// PATCH /api/feedbacks/:id/archive
async function archiveCampaign(req, res) {
  try {
    const campaign = await FeedbackCampaign.findByIdAndUpdate(
      req.params.id,
      { status: 'arquivado' },
      { new: true }
    );
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao arquivar campanha' });
  }
}

// PATCH /api/feedbacks/:id/toggle-status
async function toggleStatus(req, res) {
  try {
    const campaign = await FeedbackCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    campaign.status = campaign.status === 'ativo' ? 'inativo' : 'ativo';
    await campaign.save();
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar status' });
  }
}

// GET /api/feedbacks/:id/stats
async function getCampaignStats(req, res) {
  try {
    const campaign = await FeedbackCampaign.findById(req.params.id).populate(
      'membros',
      'nome area email'
    );
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });

    const responses = await FeedbackResponse.find({ campanha: req.params.id })
      .populate('avaliador', 'nome area')
      .populate('avaliado', 'nome area');

    const othersCount = Math.max(0, campaign.membros.length - 1);
    const expectedPerMember = othersCount + campaign.areas.length;

    const memberCompletion = campaign.membros.map((m) => {
      const done = responses.filter(
        (r) =>
          r.avaliador?._id?.toString() === m._id.toString() && r.concluido
      ).length;
      return {
        member: m,
        done,
        expected: expectedPerMember,
        percentual:
          expectedPerMember > 0 ? Math.round((done / expectedPerMember) * 100) : 0,
      };
    });

    const memberAverages = campaign.membros.map((m) => {
      const received = responses.filter(
        (r) =>
          r.tipo === 'membro' &&
          r.avaliado?._id?.toString() === m._id.toString() &&
          r.concluido
      );
      const notes = received.flatMap((r) =>
        r.respostas
          .filter((rr) => rr.tipoCriterio !== 'aberta' && rr.valor != null)
          .map((rr) => Number(rr.valor))
      );
      const avg =
        notes.length > 0
          ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1)
          : null;
      return { member: m, average: avg, count: received.length };
    });

    const areaAverages = campaign.areas.map((area) => {
      const received = responses.filter(
        (r) => r.tipo === 'area' && r.area === area && r.concluido
      );
      const notes = received.flatMap((r) =>
        r.respostas
          .filter((rr) => rr.tipoCriterio !== 'aberta' && rr.valor != null)
          .map((rr) => Number(rr.valor))
      );
      const avg =
        notes.length > 0
          ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1)
          : null;
      return { area, average: avg, count: received.length };
    });

    res.json({
      campaign,
      memberCompletion,
      memberAverages,
      areaAverages,
      totalResponses: responses.filter((r) => r.concluido).length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas da campanha' });
  }
}

// GET /api/feedbacks/:id/responses
async function getResponses(req, res) {
  try {
    const { avaliadorId } = req.query;
    const filter = { campanha: req.params.id };
    if (avaliadorId) filter.avaliador = avaliadorId;

    const responses = await FeedbackResponse.find(filter)
      .populate('avaliador', 'nome area')
      .populate('avaliado', 'nome area');
    res.json(responses);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar respostas' });
  }
}

// PUT /api/feedbacks/:id/responses  (upsert)
async function saveResponse(req, res) {
  try {
    const { avaliador, avaliado, area, tipo, respostas, concluido } = req.body;
    const filter = { campanha: req.params.id, avaliador, tipo };
    if (tipo === 'membro') filter.avaliado = avaliado;
    if (tipo === 'area') filter.area = area;

    const response = await FeedbackResponse.findOneAndUpdate(
      filter,
      { respostas, concluido: concluido || false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .populate('avaliador', 'nome area')
      .populate('avaliado', 'nome area');

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar resposta' });
  }
}

// GET /api/feedbacks/:id/member-report?membroId=...
async function getMemberReport(req, res) {
  try {
    const { membroId } = req.query;
    if (!membroId) return res.status(400).json({ error: 'membroId é obrigatório' });

    const campaign = await FeedbackCampaign.findById(req.params.id).populate(
      'membros',
      'nome area email'
    );
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });

    // Responses where this member was avaliado (received feedback)
    const received = await FeedbackResponse.find({
      campanha: req.params.id,
      avaliado: membroId,
      concluido: true,
    }).populate('avaliador', 'nome area');

    // Responses where this member was avaliador (gave feedback)
    const given = await FeedbackResponse.find({
      campanha: req.params.id,
      avaliador: membroId,
      concluido: true,
    }).populate('avaliado', 'nome area');

    res.json({ campaign, received, given });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar relatório do membro' });
  }
}

module.exports = {
  listCampaigns,
  getStats,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  duplicateCampaign,
  archiveCampaign,
  toggleStatus,
  getCampaignStats,
  getResponses,
  saveResponse,
  getMemberReport,
};

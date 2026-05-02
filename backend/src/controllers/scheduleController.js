const Schedule = require('../models/Schedule');
const { parseScheduleFromPDF } = require('../services/pdfParser');

// POST /api/schedules/parse-pdf
// Lê o PDF e retorna {nome, semestre, slots} sem salvar no banco
async function parsePDF(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    const result = await parseScheduleFromPDF(req.file.buffer);
    res.json(result);
  } catch (err) {
    console.error('parsePDF error:', err);
    res.status(500).json({ error: 'Erro ao processar o PDF.' });
  }
}

// GET /api/schedules
async function listSchedules(req, res) {
  try {
    const { semestre } = req.query;
    const filter = { ativo: true };
    if (semestre) filter.semestre = semestre;
    const schedules = await Schedule.find(filter).sort({ nome: 1 });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar horários.' });
  }
}

// GET /api/schedules/aggregate?semestre=2026.1
// Retorna { total, semestres[], aggregate: {'day-hour': count} }
async function aggregateSchedules(req, res) {
  try {
    const { semestre } = req.query;
    const filter = { ativo: true };
    if (semestre) filter.semestre = semestre;

    const schedules = await Schedule.find(filter);

    const agg = {};
    for (const s of schedules) {
      for (const slot of s.slots) {
        const key = `${slot.day}-${slot.hour}`;
        agg[key] = (agg[key] || 0) + 1;
      }
    }

    // Lista de semestres disponíveis
    const all = await Schedule.find({ ativo: true }).distinct('semestre');

    res.json({ total: schedules.length, semestres: all.filter(Boolean).sort(), aggregate: agg });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao agregar horários.' });
  }
}

// POST /api/schedules
async function createSchedule(req, res) {
  try {
    const { nome, semestre, slots, area = '', capitao = false, lider = false } = req.body;
    // Se já existe um horário ativo para esse nome+semestre, atualiza
    const existing = await Schedule.findOne({ nome, semestre, ativo: true });
    if (existing) {
      existing.slots   = slots;
      existing.area    = area;
      existing.capitao = capitao;
      existing.lider   = lider;
      await existing.save();
      return res.json(existing);
    }
    const schedule = await Schedule.create({ nome, semestre, slots, area, capitao, lider });
    res.status(201).json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar horário.' });
  }
}

// PUT /api/schedules/:id
async function updateSchedule(req, res) {
  try {
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!schedule) return res.status(404).json({ error: 'Horário não encontrado.' });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar horário.' });
  }
}

// DELETE /api/schedules/:id
async function deleteSchedule(req, res) {
  try {
    await Schedule.findByIdAndUpdate(req.params.id, { ativo: false });
    res.json({ message: 'Horário removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover horário.' });
  }
}

// DELETE /api/schedules  (admin — desativa todos)
async function clearAllSchedules(req, res) {
  try {
    const result = await Schedule.updateMany({ ativo: true }, { ativo: false });
    res.json({ message: 'Todos os horários foram removidos.', count: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao limpar horários.' });
  }
}

module.exports = { parsePDF, listSchedules, aggregateSchedules, createSchedule, updateSchedule, deleteSchedule, clearAllSchedules };

const Semester = require('../models/Semester');
const Meeting = require('../models/Meeting');
const Attendance = require('../models/Attendance');

// Lista todos os semestres
const listSemesters = async (req, res) => {
  try {
    const semesters = await Semester.find().sort({ startDate: -1 });
    res.json(semesters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Cria um novo semestre
const createSemester = async (req, res) => {
  try {
    const { name, startDate, endDate, active, meetingConfigs } = req.body;
    const semester = new Semester({ name, startDate, endDate, active, meetingConfigs });
    await semester.save();
    res.status(201).json(semester);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Atualiza um semestre (nome, datas, configuração de dias)
const updateSemester = async (req, res) => {
  try {
    const semester = await Semester.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!semester) return res.status(404).json({ error: 'Semestre não encontrado' });
    res.json(semester);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Arquiva (desativa) um semestre — mantém histórico
const deleteSemester = async (req, res) => {
  try {
    const semester = await Semester.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!semester) return res.status(404).json({ error: 'Semestre não encontrado' });
    res.json({ message: 'Semestre arquivado', semester });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Gera instâncias de reunião para todo o período do semestre
const generateMeetings = async (req, res) => {
  try {
    const semester = await Semester.findById(req.params.id);
    if (!semester) return res.status(404).json({ error: 'Semestre não encontrado' });

    const activeConfigs = semester.meetingConfigs.filter(c => c.active);
    if (activeConfigs.length === 0) {
      return res.status(400).json({ error: 'Nenhum dia de reunião configurado e ativo' });
    }

    const start = new Date(semester.startDate);
    const end = new Date(semester.endDate);
    const operations = [];

    // Mapeia dayOfWeek → startTime para lookup rápido
    const configMap = {};
    for (const config of activeConfigs) {
      configMap[config.dayOfWeek] = config.startTime;
    }

    const current = new Date(start);
    current.setHours(0, 0, 0, 0);

    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0=Dom ... 6=Sáb
      if (configMap[dayOfWeek] !== undefined) {
        const meetingDate = new Date(current);
        operations.push({
          updateOne: {
            filter: { semesterId: semester._id, date: meetingDate },
            update: {
              $setOnInsert: {
                semesterId: semester._id,
                date: meetingDate,
                startTime: configMap[dayOfWeek],
                status: 'scheduled',
                notes: '',
              },
            },
            upsert: true,
          },
        });
      }
      current.setDate(current.getDate() + 1);
    }

    let created = 0;
    if (operations.length > 0) {
      const result = await Meeting.bulkWrite(operations);
      created = result.upsertedCount;
    }

    res.json({ message: `${created} reuniões geradas (${operations.length} datas processadas)`, total: operations.length, created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Inicia novo semestre copiando configuração de reuniões do anterior
const newSemester = async (req, res) => {
  try {
    const { sourceId, name, startDate, endDate } = req.body;

    let meetingConfigs = [];
    if (sourceId) {
      const source = await Semester.findById(sourceId);
      if (source) meetingConfigs = source.meetingConfigs;
    }

    const semester = new Semester({ name, startDate, endDate, active: true, meetingConfigs });
    await semester.save();
    res.status(201).json(semester);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = { listSemesters, createSemester, updateSemester, deleteSemester, generateMeetings, newSemester };

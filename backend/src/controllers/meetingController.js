const Meeting = require('../models/Meeting');
const Attendance = require('../models/Attendance');

// Lista reuniões com filtros opcionais: semesterId, month, year
const listMeetings = async (req, res) => {
  try {
    const { semesterId, month, year } = req.query;
    const filter = {};

    if (semesterId) filter.semesterId = semesterId;

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 1);
      filter.date = { $gte: start, $lt: end };
    } else if (year) {
      const start = new Date(Number(year), 0, 1);
      const end = new Date(Number(year) + 1, 0, 1);
      filter.date = { $gte: start, $lt: end };
    }

    const meetings = await Meeting.find(filter).sort({ date: 1 });
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Cria uma reunião extra avulsa
const createMeeting = async (req, res) => {
  try {
    const { semesterId, date, startTime, notes } = req.body;
    const meeting = new Meeting({ semesterId, date, startTime, status: 'extra', notes });
    await meeting.save();
    res.status(201).json(meeting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Atualiza uma reunião (cancelar, alterar horário, notas)
const updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!meeting) return res.status(404).json({ error: 'Reunião não encontrada' });
    res.json(meeting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Deleta uma reunião e suas presenças associadas
const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndDelete(req.params.id);
    if (!meeting) return res.status(404).json({ error: 'Reunião não encontrada' });
    await Attendance.deleteMany({ meetingId: req.params.id });
    res.json({ message: 'Reunião e presenças removidas' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listMeetings, createMeeting, updateMeeting, deleteMeeting };

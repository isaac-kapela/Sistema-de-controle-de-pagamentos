const Attendance = require('../models/Attendance');
const Meeting = require('../models/Meeting');
const User = require('../models/User');

// Lista presenças com filtros: meetingId, userId, semesterId
const listAttendances = async (req, res) => {
  try {
    const { meetingId, userId, semesterId } = req.query;
    const filter = {};

    if (meetingId) filter.meetingId = meetingId;
    if (userId) filter.userId = userId;

    if (semesterId && !meetingId) {
      const meetings = await Meeting.find({ semesterId }).select('_id');
      filter.meetingId = { $in: meetings.map(m => m._id) };
    }

    const attendances = await Attendance.find(filter)
      .populate('userId', 'name email')
      .populate('meetingId', 'date startTime status')
      .sort({ 'meetingId.date': -1 });

    res.json(attendances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Estatísticas agregadas para o dashboard
const getStats = async (req, res) => {
  try {
    const { semesterId } = req.query;
    if (!semesterId) return res.status(400).json({ error: 'semesterId é obrigatório' });

    // Reuniões do semestre
    const meetings = await Meeting.find({ semesterId, status: { $ne: 'cancelled' } }).sort({ date: 1 });
    const meetingIds = meetings.map(m => m._id);
    const totalMeetings = meetings.length;

    // Usuários ativos
    const users = await User.find({ active: true }).select('name email');

    // Todas as presenças do semestre
    const attendances = await Attendance.find({ meetingId: { $in: meetingIds } });

    // Mapa rápido: meetingId → attendances
    const attByMeeting = {};
    for (const att of attendances) {
      const key = att.meetingId.toString();
      if (!attByMeeting[key]) attByMeeting[key] = [];
      attByMeeting[key].push(att);
    }

    // Por usuário
    const attByUser = {};
    for (const att of attendances) {
      const key = att.userId.toString();
      if (!attByUser[key]) attByUser[key] = { present: 0, absent: 0, late: 0, justified: 0, online: 0 };
      attByUser[key][att.status]++;
    }

    const perUser = users.map(u => {
      const stats = attByUser[u._id.toString()] || { present: 0, absent: 0, late: 0, justified: 0, online: 0 };
      const attended = stats.present + stats.late + stats.online;
      const total = totalMeetings;
      const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
      return {
        userId: u._id,
        name: u.name,
        email: u.email,
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        justified: stats.justified,
        online: stats.online,
        total,
        rate,
      };
    });

    // Overall
    const overall = { present: 0, absent: 0, late: 0, justified: 0, online: 0 };
    for (const att of attendances) overall[att.status]++;

    // Evolução semanal — agrupado por semana ISO
    const weeklyMap = {};
    for (const meeting of meetings) {
      const d = new Date(meeting.date);
      const week = getISOWeek(d);
      if (!weeklyMap[week]) weeklyMap[week] = { week, label: formatWeekLabel(d), present: 0, absent: 0, late: 0, justified: 0, total: 0 };
      weeklyMap[week].total++;

      const mAtts = attByMeeting[meeting._id.toString()] || [];
      for (const att of mAtts) weeklyMap[week][att.status]++;
    }
    const weekly = Object.values(weeklyMap).sort((a, b) => a.week.localeCompare(b.week));

    res.json({ perUser, overall, weekly, totalMeetings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function formatWeekLabel(date) {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

// Cria ou atualiza um registro de presença (upsert)
const upsertAttendance = async (req, res) => {
  try {
    const { meetingId, userId, status, observations } = req.body;
    const attendance = await Attendance.findOneAndUpdate(
      { meetingId, userId },
      { meetingId, userId, status, observations: observations || '' },
      { upsert: true, new: true, runValidators: true }
    ).populate('userId', 'name email');
    res.json(attendance);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Marca presença em lote para uma reunião inteira
const bulkUpsert = async (req, res) => {
  try {
    const { meetingId, records } = req.body;
    // records = [{ userId, status, observations }]
    if (!meetingId || !Array.isArray(records)) {
      return res.status(400).json({ error: 'meetingId e records são obrigatórios' });
    }

    const operations = records.map(r => ({
      updateOne: {
        filter: { meetingId, userId: r.userId },
        update: { $set: { meetingId, userId: r.userId, status: r.status, observations: r.observations || '' } },
        upsert: true,
      },
    }));

    const result = await Attendance.bulkWrite(operations);
    res.json({ message: 'Presenças salvas', upserted: result.upsertedCount, modified: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Limpa todas as presenças de um semestre
const clearSemesterAttendances = async (req, res) => {
  try {
    const { semesterId } = req.params;
    const meetings = await Meeting.find({ semesterId }).select('_id');
    const meetingIds = meetings.map(m => m._id);
    const result = await Attendance.deleteMany({ meetingId: { $in: meetingIds } });
    res.json({ message: `${result.deletedCount} registros de presença removidos` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listAttendances, getStats, upsertAttendance, bulkUpsert, clearSemesterAttendances };

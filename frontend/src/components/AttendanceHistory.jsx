import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getSemesters, getMeetings, getAttendances, getUsers } from '../services/api';

const STATUS_LABELS = { present: 'Presente', absent: 'Falta', late: 'Atraso', justified: 'Justificado', online: 'Online' };
const STATUS_COLORS = { present: '#22c55e', absent: '#ef4444', late: '#f59e0b', justified: '#3b82f6', online: '#a855f7' };
const MEETING_STATUS_LABELS = { scheduled: 'Realizada', cancelled: 'Cancelada', extra: 'Extra' };

export default function AttendanceHistory() {
  const [semesters, setSemesters] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [meetings, setMeetings] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([getSemesters(), getUsers()])
      .then(([sem, usr]) => {
        setSemesters(sem);
        setUsers(usr);
        const active = sem.find(s => s.active);
        if (active) setSelectedSemester(active._id);
      })
      .catch(() => toast.error('Erro ao carregar dados'));
  }, []);

  const load = useCallback(async () => {
    if (!selectedSemester) return;
    setLoading(true);
    try {
      const [mtgs, atts] = await Promise.all([
        getMeetings({ semesterId: selectedSemester }),
        getAttendances({ semesterId: selectedSemester, ...(selectedUser ? { userId: selectedUser } : {}) }),
      ]);

      let filtered = mtgs.filter(m => m.status !== 'cancelled');

      if (dateFrom) filtered = filtered.filter(m => new Date(m.date) >= new Date(dateFrom));
      if (dateTo) filtered = filtered.filter(m => new Date(m.date) <= new Date(dateTo + 'T23:59:59'));

      setMeetings(filtered.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setAttendances(atts);
    } catch {
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  }, [selectedSemester, selectedUser, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const attByMeeting = {};
  for (const att of attendances) {
    const mid = att.meetingId?._id || att.meetingId;
    if (!attByMeeting[mid]) attByMeeting[mid] = [];
    attByMeeting[mid].push(att);
  }

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const getSummary = (meetingId) => {
    const atts = attByMeeting[meetingId] || [];
    const counts = { present: 0, absent: 0, late: 0, justified: 0 };
    for (const a of atts) counts[a.status]++;
    return counts;
  };

  // Histórico individual: se usuário selecionado, agrupar por usuário
  const individualHistory = selectedUser ? (() => {
    const userAtts = attendances;
    const byMeeting = {};
    for (const att of userAtts) {
      const mid = att.meetingId?._id || att.meetingId;
      byMeeting[mid] = att;
    }
    return meetings.map(m => ({ meeting: m, att: byMeeting[m._id] }));
  })() : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Filtros */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)' }}>
        <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 15 }}>Filtros</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <label style={labelStyle}>
            Semestre
            <select style={inputStyle} value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}>
              <option value="">Todos</option>
              {semesters.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Participante
            <select style={inputStyle} value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
              <option value="">Todos</option>
              {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            De
            <input type="date" style={inputStyle} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </label>
          <label style={labelStyle}>
            Até
            <input type="date" style={inputStyle} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </label>
        </div>
      </div>

      {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</p>}

      {/* Histórico individual */}
      {selectedUser && individualHistory && !loading && (
        <div>
          <h4 style={{ margin: '0 0 14px', fontSize: 15 }}>
            Histórico de {users.find(u => u._id === selectedUser)?.name}
          </h4>
          {individualHistory.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhuma reunião encontrada.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {individualHistory.map(({ meeting, att }) => (
              <div key={meeting._id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-card)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {new Date(meeting.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span style={{ marginLeft: 10, color: 'var(--text-muted)', fontSize: 13 }}>{meeting.startTime}</span>
                </div>
                <span style={statusBadge(att?.status || 'absent')}>
                  {STATUS_LABELS[att?.status || 'absent']}
                </span>
                {att?.observations && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{att.observations}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de reuniões expansíveis */}
      {!selectedUser && !loading && (
        <div>
          <h4 style={{ margin: '0 0 14px', fontSize: 15 }}>Reuniões ({meetings.length})</h4>
          {meetings.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhuma reunião encontrada.</p>}
          {meetings.map(m => {
            const summary = getSummary(m._id);
            const total = Object.values(summary).reduce((a, b) => a + b, 0);
            const isOpen = expanded[m._id];
            const mAtts = attByMeeting[m._id] || [];

            return (
              <div key={m._id} style={{ marginBottom: 8, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div
                  onClick={() => toggleExpand(m._id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
                >
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>
                      {new Date(m.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                    <span style={{ marginLeft: 10, color: 'var(--text-muted)', fontSize: 13 }}>{m.startTime}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {Object.entries(summary).map(([s, n]) => n > 0 && (
                      <span key={s} style={{ fontSize: 12, color: STATUS_COLORS[s], fontWeight: 700 }}>{n} {STATUS_LABELS[s].slice(0, 1)}</span>
                    ))}
                    {total === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sem registros</span>}
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px' }}>
                    {mAtts.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Nenhuma presença registrada.</p>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {mAtts.map(att => (
                        <div key={att._id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
                          <span style={{ flex: 1, fontWeight: 500 }}>{att.userId?.name || '—'}</span>
                          <span style={statusBadge(att.status)}>{STATUS_LABELS[att.status]}</span>
                          {att.observations && <span style={{ color: 'var(--text-muted)' }}>{att.observations}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const statusBadge = (status) => ({
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 700,
  background: `${STATUS_COLORS[status] || '#888'}22`,
  color: STATUS_COLORS[status] || '#888',
  border: `1px solid ${STATUS_COLORS[status] || '#888'}44`,
});

const inputStyle = { display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#1a1a1a', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 };

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getUsers, getAttendances, bulkUpsertAttendances } from '../services/api';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Presente', color: '#22c55e', short: 'P' },
  { value: 'absent', label: 'Falta', color: '#ef4444', short: 'F' },
  { value: 'late', label: 'Atraso', color: '#f59e0b', short: 'A' },
  { value: 'justified', label: 'Justificado', color: '#3b82f6', short: 'J' },
  { value: 'online', label: 'Online', color: '#a855f7', short: 'O' },
];

export default function AttendanceTable({ meeting, isAdmin }) {
  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState({}); // userId → { status, observations }
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!meeting) return;
    const load = async () => {
      setLoading(true);
      try {
        const [usersData, attData] = await Promise.all([
          getUsers(),
          getAttendances({ meetingId: meeting._id }),
        ]);
        setUsers(usersData);

        const initial = {};
        for (const u of usersData) {
          initial[u._id] = { status: 'absent', observations: '' };
        }
        for (const att of attData) {
          const uid = att.userId?._id || att.userId;
          initial[uid] = { status: att.status, observations: att.observations || '' };
        }
        setRecords(initial);
      } catch {
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [meeting]);

  const setStatus = (userId, status) => {
    setRecords(r => ({ ...r, [userId]: { ...r[userId], status } }));
  };

  const setObs = (userId, observations) => {
    setRecords(r => ({ ...r, [userId]: { ...r[userId], observations } }));
  };

  const markAll = (status) => {
    const next = {};
    for (const uid of Object.keys(records)) next[uid] = { ...records[uid], status };
    setRecords(next);
  };

  const handleSave = async () => {
    if (!meeting || !isAdmin) return;
    setSaving(true);
    try {
      const recs = Object.entries(records).map(([userId, val]) => ({ userId, ...val }));
      await bulkUpsertAttendances(meeting._id, recs);
      toast.success('Presenças salvas com sucesso');
    } catch {
      toast.error('Erro ao salvar presenças');
    } finally {
      setSaving(false);
    }
  };

  if (!meeting) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
        <p style={{ fontSize: 32, margin: '0 0 12px' }}>📅</p>
        <p>Selecione uma reunião no calendário para marcar presença</p>
      </div>
    );
  }

  const meetingDate = new Date(meeting.date);
  const totalPresent = Object.values(records).filter(r => r.status === 'present').length;
  const totalLate = Object.values(records).filter(r => r.status === 'late').length;

  return (
    <div>
      {/* Cabeçalho da reunião */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 17 }}>
              {meetingDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>Horário: {meeting.startTime}</p>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
            <span style={{ color: '#22c55e', fontWeight: 700 }}>{totalPresent + totalLate} / {users.length} presentes</span>
          </div>
        </div>
      </div>

      {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</p>}

      {!loading && (
        <>
          {/* Ações rápidas */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Marcar todos:</span>
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => markAll(opt.value)} style={quickBtn(opt.color)}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Tabela */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Participante</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                  <th style={thStyle}>Observações</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const rec = records[u._id] || { status: 'absent', observations: '' };
                  const opt = STATUS_OPTIONS.find(o => o.value === rec.status);
                  return (
                    <tr key={u._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {isAdmin ? (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                            {STATUS_OPTIONS.map(o => (
                              <button
                                key={o.value}
                                onClick={() => setStatus(u._id, o.value)}
                                title={o.label}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  border: '2px solid',
                                  borderColor: rec.status === o.value ? o.color : 'transparent',
                                  background: rec.status === o.value ? `${o.color}22` : '#1a1a1a',
                                  color: o.color,
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  transition: 'all 0.15s',
                                }}
                              >
                                {o.short}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${opt?.color}22`, color: opt?.color }}>
                            {opt?.label}
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {isAdmin ? (
                          <input
                            style={obsInput}
                            placeholder="Observação..."
                            value={rec.observations}
                            onChange={e => setObs(u._id, e.target.value)}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{rec.observations || '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isAdmin && (
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSave} disabled={saving} style={saveBtn}>
                {saving ? 'Salvando...' : 'Salvar Presenças'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const thStyle = { padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' };
const tdStyle = { padding: '12px 14px', verticalAlign: 'middle' };
const obsInput = { padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: '#111', color: 'var(--text)', fontSize: 13, width: '100%', boxSizing: 'border-box' };
const quickBtn = (color) => ({ padding: '5px 12px', borderRadius: 20, border: `1px solid ${color}44`, background: `${color}18`, color, cursor: 'pointer', fontSize: 12, fontWeight: 700 });
const saveBtn = { padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' };

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getMeetings, updateMeeting, createMeeting, deleteMeeting } from '../services/api';

const STATUS_COLORS = {
  scheduled: '#22c55e',
  cancelled: '#ef4444',
  extra: '#3b82f6',
};

const STATUS_LABELS = {
  scheduled: 'Agendada',
  cancelled: 'Cancelada',
  extra: 'Extra',
};

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAY_NAMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export default function MeetingCalendar({ semesterId, onSelectMeeting, isAdmin }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [extraForm, setExtraForm] = useState({ date: '', startTime: '19:00', notes: '' });

  const load = useCallback(async () => {
    if (!semesterId) return;
    setLoading(true);
    try {
      const data = await getMeetings({ semesterId, month: viewMonth + 1, year: viewYear });
      setMeetings(data);
    } catch {
      toast.error('Erro ao carregar reuniões');
    } finally {
      setLoading(false);
    }
  }, [semesterId, viewMonth, viewYear]);

  useEffect(() => { load(); }, [load]);

  const meetingByDay = {};
  for (const m of meetings) {
    const d = new Date(m.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    meetingByDay[key] = m;
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const handleDayClick = (day) => {
    const key = `${viewYear}-${viewMonth}-${day}`;
    const meeting = meetingByDay[key];
    if (meeting) {
      setSelectedMeeting(meeting);
    }
  };

  const handleToggleCancel = async (meeting) => {
    try {
      const newStatus = meeting.status === 'cancelled' ? 'scheduled' : 'cancelled';
      await updateMeeting(meeting._id, { status: newStatus });
      toast.success(newStatus === 'cancelled' ? 'Reunião cancelada' : 'Reunião reativada');
      setSelectedMeeting(null);
      load();
    } catch {
      toast.error('Erro ao atualizar reunião');
    }
  };

  const handleAddExtra = async () => {
    if (!extraForm.date) { toast.error('Informe a data'); return; }
    try {
      await createMeeting({ semesterId, ...extraForm });
      toast.success('Reunião extra criada');
      setShowExtraForm(false);
      setExtraForm({ date: '', startTime: '19:00', notes: '' });
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao criar reunião');
    }
  };

  const handleDeleteMeeting = async (meeting) => {
    if (!window.confirm('Remover esta reunião e todas as presenças associadas?')) return;
    try {
      await deleteMeeting(meeting._id);
      toast.success('Reunião removida');
      setSelectedMeeting(null);
      load();
    } catch {
      toast.error('Erro ao remover');
    }
  };

  return (
    <div>
      {/* Navegação do mês */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }} style={navBtn}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 17 }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }} style={navBtn}>›</button>
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[k] }} />
            <span style={{ color: 'var(--text-muted)' }}>{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} />
          <span style={{ color: 'var(--text-muted)' }}>Hoje</span>
        </div>
      </div>

      {/* Grid do calendário */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, padding: '6px 0' }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const key = `${viewYear}-${viewMonth}-${day}`;
          const meeting = meetingByDay[key];
          const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

          return (
            <div
              key={day}
              onClick={() => meeting && handleDayClick(day)}
              style={{
                minHeight: 52,
                borderRadius: 8,
                border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: meeting ? `${STATUS_COLORS[meeting.status]}18` : 'var(--bg-card)',
                cursor: meeting ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '6px 2px',
                transition: 'background 0.15s',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--primary)' : 'var(--text)' }}>{day}</span>
              {meeting && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[meeting.status] }} />
              )}
              {meeting && (
                <span style={{ fontSize: 10, color: STATUS_COLORS[meeting.status], fontWeight: 600 }}>{meeting.startTime}</span>
              )}
            </div>
          );
        })}
      </div>

      {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 16 }}>Carregando...</p>}

      {/* Botão reunião extra */}
      {isAdmin && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => setShowExtraForm(true)} style={extraBtn}>+ Adicionar Reunião Extra</button>
        </div>
      )}

      {/* Detalhe da reunião selecionada */}
      {selectedMeeting && (
        <div style={overlayStyle} onClick={() => setSelectedMeeting(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17 }}>Reunião</h3>
              <button onClick={() => setSelectedMeeting(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 15 }}>
              <strong>{new Date(selectedMeeting.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</strong>
            </p>
            <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 14 }}>Horário: {selectedMeeting.startTime}</p>
            <p style={{ margin: '0 0 16px' }}>
              <span style={{ ...badgeStyle(selectedMeeting.status) }}>{STATUS_LABELS[selectedMeeting.status]}</span>
            </p>
            {selectedMeeting.notes && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>{selectedMeeting.notes}</p>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => { onSelectMeeting?.(selectedMeeting); setSelectedMeeting(null); }}
                style={actionBtn('primary')}
              >
                Marcar Presença
              </button>
              {isAdmin && (
                <>
                  <button onClick={() => handleToggleCancel(selectedMeeting)} style={actionBtn(selectedMeeting.status === 'cancelled' ? 'success' : 'warning')}>
                    {selectedMeeting.status === 'cancelled' ? 'Reativar' : 'Cancelar Reunião'}
                  </button>
                  <button onClick={() => handleDeleteMeeting(selectedMeeting)} style={actionBtn('danger')}>Remover</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal reunião extra */}
      {showExtraForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: 17 }}>Reunião Extra</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={labelStyle}>Data <input type="date" style={inputStyle} value={extraForm.date} onChange={e => setExtraForm(f => ({ ...f, date: e.target.value }))} /></label>
              <label style={labelStyle}>Horário <input type="time" style={inputStyle} value={extraForm.startTime} onChange={e => setExtraForm(f => ({ ...f, startTime: e.target.value }))} /></label>
              <label style={labelStyle}>Observações <input style={inputStyle} value={extraForm.notes} onChange={e => setExtraForm(f => ({ ...f, notes: e.target.value }))} /></label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowExtraForm(false)} style={actionBtn('secondary')}>Cancelar</button>
              <button onClick={handleAddExtra} style={actionBtn('primary')}>Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn = { background: 'none', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 18 };
const extraBtn = { background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-muted)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, width: '100%' };
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 };
const modalStyle = { background: '#1a1a1a', borderRadius: 14, padding: '24px 20px', width: '100%', maxWidth: 460, border: '1px solid var(--border)' };
const inputStyle = { display: 'block', width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#111', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 };
const actionBtn = (v) => ({ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: v === 'primary' ? 'var(--primary)' : v === 'danger' ? '#dc2626' : v === 'warning' ? '#d97706' : v === 'success' ? '#16a34a' : '#2a2a2a', color: '#fff' });
const badgeStyle = (status) => ({ display: 'inline-block', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${STATUS_COLORS[status]}22`, color: STATUS_COLORS[status], border: `1px solid ${STATUS_COLORS[status]}44` });

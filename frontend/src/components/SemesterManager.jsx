import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  generateMeetingsForSemester,
  startNewSemester,
  clearSemesterAttendances,
} from '../services/api';

const DAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const defaultForm = {
  name: '',
  startDate: '',
  endDate: '',
  meetingConfigs: [],
};

export default function SemesterManager({ onSemesterChange }) {
  const [semesters, setSemesters] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showNewSemForm, setShowNewSemForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [newSemForm, setNewSemForm] = useState({ name: '', startDate: '', endDate: '', sourceId: '' });
  const [loading, setLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(null);

  const load = async () => {
    try {
      const data = await getSemesters();
      setSemesters(data);
    } catch {
      toast.error('Erro ao carregar semestres');
    }
  };

  useEffect(() => { load(); }, []);

  const toggleDay = (dayValue) => {
    const exists = form.meetingConfigs.find(c => c.dayOfWeek === dayValue);
    if (exists) {
      setForm(f => ({ ...f, meetingConfigs: f.meetingConfigs.filter(c => c.dayOfWeek !== dayValue) }));
    } else {
      setForm(f => ({ ...f, meetingConfigs: [...f.meetingConfigs, { dayOfWeek: dayValue, startTime: '19:00', active: true }] }));
    }
  };

  const updateDayTime = (dayValue, startTime) => {
    setForm(f => ({
      ...f,
      meetingConfigs: f.meetingConfigs.map(c => c.dayOfWeek === dayValue ? { ...c, startTime } : c),
    }));
  };

  const handleEdit = (sem) => {
    setEditing(sem._id);
    setForm({
      name: sem.name,
      startDate: sem.startDate?.slice(0, 10) || '',
      endDate: sem.endDate?.slice(0, 10) || '',
      meetingConfigs: sem.meetingConfigs || [],
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.startDate || !form.endDate) {
      toast.error('Preencha nome, data início e data fim');
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        await updateSemester(editing, form);
        toast.success('Semestre atualizado');
      } else {
        await createSemester(form);
        toast.success('Semestre criado');
      }
      setShowForm(false);
      setEditing(null);
      setForm(defaultForm);
      await load();
      onSemesterChange?.();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (sem) => {
    setLoading(true);
    try {
      const res = await generateMeetingsForSemester(sem._id);
      toast.success(res.message);
      onSemesterChange?.();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao gerar reuniões');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sem) => {
    if (!window.confirm(`Arquivar semestre "${sem.name}"?`)) return;
    try {
      await deleteSemester(sem._id);
      toast.success('Semestre arquivado');
      await load();
      onSemesterChange?.();
    } catch {
      toast.error('Erro ao arquivar');
    }
  };

  const handleClearAttendances = async (sem) => {
    setConfirmClear(sem);
  };

  const confirmClearAttendances = async () => {
    if (!confirmClear) return;
    try {
      const res = await clearSemesterAttendances(confirmClear._id);
      toast.success(res.message);
      setConfirmClear(null);
      onSemesterChange?.();
    } catch {
      toast.error('Erro ao limpar presenças');
    }
  };

  const handleNewSemester = async () => {
    if (!newSemForm.name || !newSemForm.startDate || !newSemForm.endDate) {
      toast.error('Preencha todos os campos');
      return;
    }
    setLoading(true);
    try {
      await startNewSemester(newSemForm);
      toast.success('Novo semestre criado');
      setShowNewSemForm(false);
      setNewSemForm({ name: '', startDate: '', endDate: '', sourceId: '' });
      await load();
      onSemesterChange?.();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao criar semestre');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm(defaultForm); }}
          style={btnStyle('primary')}
        >
          + Novo Semestre
        </button>
        <button onClick={() => setShowNewSemForm(true)} style={btnStyle('secondary')}>
          Iniciar Novo Semestre (copiar config)
        </button>
      </div>

      {/* Lista de semestres */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {semesters.length === 0 && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>
            Nenhum semestre cadastrado ainda.
          </p>
        )}
        {semesters.map(sem => (
          <div key={sem._id} style={cardStyle(sem.active)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 18 }}>{sem.name}</span>
                  <span style={badgeStyle(sem.active ? 'green' : 'gray')}>
                    {sem.active ? 'Ativo' : 'Arquivado'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
                  {formatDate(sem.startDate)} → {formatDate(sem.endDate)}
                </p>
                {sem.meetingConfigs?.length > 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
                    Reuniões: {sem.meetingConfigs.filter(c => c.active).map(c => `${DAYS.find(d => d.value === c.dayOfWeek)?.label} ${c.startTime}`).join(' · ')}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => handleEdit(sem)} style={btnSmall('secondary')}>Editar</button>
                <button onClick={() => handleGenerate(sem)} style={btnSmall('primary')} disabled={loading}>
                  Gerar Reuniões
                </button>
                <button onClick={() => handleClearAttendances(sem)} style={btnSmall('warning')}>
                  Limpar Presenças
                </button>
                {sem.active && (
                  <button onClick={() => handleDelete(sem)} style={btnSmall('danger')}>Arquivar</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: criar/editar semestre */}
      {showForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>{editing ? 'Editar Semestre' : 'Novo Semestre'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={labelStyle}>
                Nome do semestre
                <input
                  style={inputStyle}
                  placeholder="ex: 2025/1"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>
                  Data início
                  <input type="date" style={inputStyle} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </label>
                <label style={labelStyle}>
                  Data fim
                  <input type="date" style={inputStyle} value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </label>
              </div>

              <div>
                <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 14 }}>Dias de reunião</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {DAYS.map(d => {
                    const selected = form.meetingConfigs.find(c => c.dayOfWeek === d.value);
                    return (
                      <button
                        key={d.value}
                        onClick={() => toggleDay(d.value)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          border: '1px solid',
                          borderColor: selected ? 'var(--primary)' : 'var(--border)',
                          background: selected ? 'var(--primary)' : 'transparent',
                          color: 'var(--text)',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: selected ? 700 : 400,
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                {form.meetingConfigs.map(c => (
                  <div key={c.dayOfWeek} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                    <span style={{ fontSize: 13, width: 36, fontWeight: 600 }}>{DAYS.find(d => d.value === c.dayOfWeek)?.label}</span>
                    <input
                      type="time"
                      value={c.startTime}
                      onChange={e => updateDayTime(c.dayOfWeek, e.target.value)}
                      style={{ ...inputStyle, width: 120 }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowForm(false); setEditing(null); }} style={btnStyle('secondary')}>Cancelar</button>
              <button onClick={handleSave} style={btnStyle('primary')} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: iniciar novo semestre copiando config */}
      {showNewSemForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>Iniciar Novo Semestre</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={labelStyle}>
                Nome do novo semestre
                <input style={inputStyle} placeholder="ex: 2025/2" value={newSemForm.name} onChange={e => setNewSemForm(f => ({ ...f, name: e.target.value }))} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>
                  Data início
                  <input type="date" style={inputStyle} value={newSemForm.startDate} onChange={e => setNewSemForm(f => ({ ...f, startDate: e.target.value }))} />
                </label>
                <label style={labelStyle}>
                  Data fim
                  <input type="date" style={inputStyle} value={newSemForm.endDate} onChange={e => setNewSemForm(f => ({ ...f, endDate: e.target.value }))} />
                </label>
              </div>
              <label style={labelStyle}>
                Copiar configuração de (opcional)
                <select style={inputStyle} value={newSemForm.sourceId} onChange={e => setNewSemForm(f => ({ ...f, sourceId: e.target.value }))}>
                  <option value="">— Nenhum —</option>
                  {semesters.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNewSemForm(false)} style={btnStyle('secondary')}>Cancelar</button>
              <button onClick={handleNewSemester} style={btnStyle('primary')} disabled={loading}>
                {loading ? 'Criando...' : 'Criar Semestre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: confirmar limpeza de presenças */}
      {confirmClear && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: 400 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 17 }}>Limpar Presenças</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px' }}>
              Tem certeza que deseja limpar <strong>todas as presenças</strong> do semestre <strong>{confirmClear.name}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmClear(null)} style={btnStyle('secondary')}>Cancelar</button>
              <button onClick={confirmClearAttendances} style={btnStyle('danger')}>Limpar Tudo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR');
}

const btnStyle = (variant) => ({
  padding: '9px 18px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
  background: variant === 'primary' ? 'var(--primary)' : variant === 'danger' ? '#dc2626' : variant === 'warning' ? '#d97706' : '#2a2a2a',
  color: '#fff',
});

const btnSmall = (variant) => ({
  ...btnStyle(variant),
  padding: '6px 12px',
  fontSize: 12,
});

const inputStyle = {
  display: 'block',
  width: '100%',
  marginTop: 6,
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: '#1a1a1a',
  color: 'var(--text)',
  fontSize: 14,
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: 13,
  color: 'var(--text-muted)',
  fontWeight: 500,
};

const cardStyle = (active) => ({
  background: 'var(--bg-card)',
  border: `1px solid ${active ? 'var(--border)' : '#2a2a2a'}`,
  borderRadius: 12,
  padding: '16px 20px',
  opacity: active ? 1 : 0.6,
});

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  padding: 16,
};

const modalStyle = {
  background: '#1a1a1a',
  borderRadius: 14,
  padding: '28px 24px',
  width: '100%',
  maxWidth: 540,
  border: '1px solid var(--border)',
};

const badgeStyle = (color) => ({
  padding: '2px 10px',
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 700,
  background: color === 'green' ? '#16a34a22' : '#3f3f3f',
  color: color === 'green' ? '#22c55e' : '#9ca3af',
  border: `1px solid ${color === 'green' ? '#22c55e44' : '#4a4a4a'}`,
});

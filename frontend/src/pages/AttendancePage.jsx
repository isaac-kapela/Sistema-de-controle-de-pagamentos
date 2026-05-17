import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSemesters, getMeetings } from '../services/api';
import AttendanceDashboard from '../components/AttendanceDashboard';
import MeetingCalendar from '../components/MeetingCalendar';
import AttendanceTable from '../components/AttendanceTable';
import AttendanceHistory from '../components/AttendanceHistory';
import SemesterManager from '../components/SemesterManager';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'reunioes', label: 'Reuniões' },
  { id: 'marcar', label: 'Marcar Presença' },
  { id: 'historico', label: 'Histórico' },
  { id: 'config', label: 'Configuração' },
];

export default function AttendancePage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);

  const loadSemesters = async () => {
    try {
      const data = await getSemesters();
      setSemesters(data);
      const active = data.find(s => s.active);
      if (active && !selectedSemesterId) setSelectedSemesterId(active._id);
    } catch {
      toast.error('Erro ao carregar semestres');
    }
  };

  useEffect(() => { loadSemesters(); }, []);

  // Ao abrir aba "Marcar Presença" sem reunião selecionada, auto-seleciona a próxima
  useEffect(() => {
    if (activeTab !== 'marcar' || selectedMeeting || showCalendarPicker || !selectedSemesterId) return;
    const autoSelect = async () => {
      try {
        const meetings = await getMeetings({ semesterId: selectedSemesterId });
        const active = meetings.filter(m => m.status !== 'cancelled').sort((a, b) => new Date(a.date) - new Date(b.date));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const next = active.find(m => new Date(m.date) >= today) || active[active.length - 1];
        if (next) setSelectedMeeting(next);
        else setShowCalendarPicker(true);
      } catch {
        setShowCalendarPicker(true);
      }
    };
    autoSelect();
  }, [activeTab, selectedSemesterId]);

  const handleSelectMeeting = (meeting) => {
    setSelectedMeeting(meeting);
    setActiveTab('marcar');
  };

  const activeSemester = semesters.find(s => s._id === selectedSemesterId);

  return (
    <div style={{ padding: 'clamp(14px, 3vw, 24px) clamp(14px, 4vw, 20px)', maxWidth: 1100, margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Controle de Presença</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            {activeSemester ? `Semestre: ${activeSemester.name}` : 'Selecione um semestre'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Semestre:</label>
          <select
            value={selectedSemesterId}
            onChange={e => setSelectedSemesterId(e.target.value)}
            style={selectStyle}
          >
            <option value="">— Selecione —</option>
            {semesters.map(s => (
              <option key={s._id} value={s._id}>{s.name}{s.active ? ' (ativo)' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(tab => {
          const isConfig = tab.id === 'config';
          if (isConfig && !isAdmin) return null;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: activeTab === tab.id ? 700 : 400,
                cursor: 'pointer',
                fontSize: 14,
                whiteSpace: 'nowrap',
                marginBottom: -1,
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo das tabs */}
      {!selectedSemesterId && activeTab !== 'config' && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}>Nenhum semestre selecionado.</p>
          {isAdmin ? (
            <p>Vá em <button onClick={() => setActiveTab('config')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>Configuração</button> para criar um semestre.</p>
          ) : (
            <p>Aguarde um administrador configurar o semestre.</p>
          )}
        </div>
      )}

      {(selectedSemesterId || activeTab === 'config') && (
        <>
          {activeTab === 'dashboard' && (
            <AttendanceDashboard semesterId={selectedSemesterId} />
          )}

          {activeTab === 'reunioes' && (
            <div>
              <MeetingCalendar
                semesterId={selectedSemesterId}
                onSelectMeeting={handleSelectMeeting}
                isAdmin={isAdmin}
              />
            </div>
          )}

          {activeTab === 'marcar' && (
            <div>
              {!selectedMeeting && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>
                  Buscando próxima reunião...
                </p>
              )}
              {selectedMeeting && (
                <div>
                  <button
                    onClick={() => setSelectedMeeting(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    ← Escolher outra reunião
                  </button>
                  <AttendanceTable meeting={selectedMeeting} isAdmin={isAdmin} onChangeMeeting={setSelectedMeeting} semesterId={selectedSemesterId} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'historico' && (
            <AttendanceHistory />
          )}

          {activeTab === 'config' && isAdmin && (
            <SemesterManager onSemesterChange={loadSemesters} />
          )}
        </>
      )}
    </div>
  );
}

const selectStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: '#1a1a1a',
  color: 'var(--text)',
  fontSize: 14,
  cursor: 'pointer',
};

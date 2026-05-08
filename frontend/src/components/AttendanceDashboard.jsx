import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { getAttendanceStats } from '../services/api';

const PRESENCE_COLORS = {
  present: '#22c55e',
  absent: '#ef4444',
  late: '#f59e0b',
  justified: '#3b82f6',
  online: '#a855f7',
};

const LABELS = { present: 'Presente', absent: 'Falta', late: 'Atraso', justified: 'Justificado', online: 'Online' };

function rateColor(rate) {
  if (rate >= 85) return '#22c55e';
  if (rate >= 70) return '#f59e0b';
  return '#ef4444';
}

const CustomTooltipBar = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <p style={{ margin: '0 0 6px', fontWeight: 700 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ margin: '2px 0', color: p.fill }}>{p.name}: {p.value}{p.dataKey === 'rate' ? '%' : ''}</p>
      ))}
    </div>
  );
};

export default function AttendanceDashboard({ semesterId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!semesterId) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAttendanceStats(semesterId);
        setStats(data);
      } catch {
        toast.error('Erro ao carregar estatísticas');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [semesterId]);

  if (!semesterId) {
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Selecione um semestre para ver o dashboard.</p>;
  }

  if (loading) {
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Carregando estatísticas...</p>;
  }

  if (!stats) return null;

  const { perUser, overall, weekly, totalMeetings } = stats;
  const totalRecords = Object.values(overall).reduce((a, b) => a + b, 0);
  const avgRate = perUser.length > 0 ? Math.round(perUser.reduce((a, u) => a + u.rate, 0) / perUser.length) : 0;
  const mostPresent = [...perUser].sort((a, b) => b.rate - a.rate)[0];
  const mostAbsent = [...perUser].sort((a, b) => b.absent - a.absent)[0];

  const pieData = [
    { name: 'Presente', value: overall.present, fill: PRESENCE_COLORS.present },
    { name: 'Falta', value: overall.absent, fill: PRESENCE_COLORS.absent },
    { name: 'Atraso', value: overall.late, fill: PRESENCE_COLORS.late },
    { name: 'Justificado', value: overall.justified, fill: PRESENCE_COLORS.justified },
    { name: 'Online', value: overall.online || 0, fill: PRESENCE_COLORS.online },
  ].filter(d => d.value > 0);

  const barData = [...perUser].sort((a, b) => b.rate - a.rate).map(u => ({
    name: u.name.split(' ')[0],
    fullName: u.name,
    rate: u.rate,
    present: u.present,
    absent: u.absent,
  }));

  const lineData = weekly.map(w => ({
    week: w.label,
    Presença: w.total > 0 ? Math.round(((w.present + w.late) / (w.total * (perUser.length || 1))) * 100) : 0,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Cards de indicadores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <StatCard label="Total de Reuniões" value={totalMeetings} color="#a80303" />
        <StatCard label="Participantes" value={perUser.length} color="#3b82f6" />
        <StatCard label="Média de Presença" value={`${avgRate}%`} color={rateColor(avgRate)} />
        <StatCard
          label="Mais Presente"
          value={mostPresent?.name?.split(' ')[0] || '—'}
          sub={mostPresent ? `${mostPresent.rate}%` : ''}
          color="#22c55e"
        />
      </div>

      {/* Gráfico de barras: presença por participante */}
      {barData.length > 0 && (
        <div style={chartCard}>
          <h4 style={chartTitle}>Presença por Participante (%)</h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} domain={[0, 100]} unit="%" />
              <Tooltip content={<CustomTooltipBar />} />
              <Bar dataKey="rate" name="Presença" radius={[6, 6, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={index} fill={rateColor(entry.rate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Gráfico de pizza */}
        {pieData.length > 0 && (
          <div style={chartCard}>
            <h4 style={chartTitle}>Distribuição de Presenças</h4>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={10}
                  formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 13 }}>{value}</span>}
                />
                <Tooltip
                  formatter={(value, name) => [`${value} registros`, name]}
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                  labelStyle={{ color: '#f5f5f5' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gráfico de linha: evolução semanal */}
        {lineData.length > 0 && (
          <div style={chartCard}>
            <h4 style={chartTitle}>Evolução Semanal (%)</h4>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="week" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                  labelStyle={{ color: '#f5f5f5', fontSize: 12 }}
                  formatter={(v) => [`${v}%`, 'Presença']}
                />
                <Line type="monotone" dataKey="Presença" stroke="#22c55e" strokeWidth={2} dot={{ r: 4, fill: '#22c55e' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Ranking completo */}
      {perUser.length > 0 && (
        <div style={chartCard}>
          <h4 style={chartTitle}>Ranking de Presença</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...perUser].sort((a, b) => b.rate - a.rate).map((u, i) => (
              <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 24, color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 }}>{i + 1}.</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{u.name}</span>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span style={{ color: '#22c55e' }}>{u.present}P</span>
                  <span style={{ color: '#f59e0b' }}>{u.late}A</span>
                  <span style={{ color: '#a855f7' }}>{u.online || 0}O</span>
                  <span style={{ color: '#ef4444' }}>{u.absent}F</span>
                  <span style={{ color: '#3b82f6' }}>{u.justified}J</span>
                </div>
                <div style={{ width: 120, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#2a2a2a', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${u.rate}%`, background: rateColor(u.rate), borderRadius: 3, transition: 'width 0.4s' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: rateColor(u.rate), minWidth: 36, textAlign: 'right' }}>{u.rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {perUser.length === 0 && !loading && (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>
          Nenhum dado de presença registrado para este semestre ainda.
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '18px 20px', border: '1px solid var(--border)' }}>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 24, fontWeight: 800, color }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

const chartCard = { background: 'var(--bg-card)', borderRadius: 12, padding: '18px 20px', border: '1px solid var(--border)' };
const chartTitle = { margin: '0 0 16px', fontSize: 15, fontWeight: 700 };

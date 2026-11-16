import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const fmt = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={s.tooltip}>
        <div style={s.tooltipTitle}>{label}</div>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} style={{ ...s.tooltipRow, color: entry.color }}>
            <span>{entry.name}:</span>
            <span style={{ fontWeight: 700 }}>{fmt(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function FinancialChart({ summary }) {
  if (!summary || !summary.monthlyData) return null;

  const { monthlyData, categoryExpenses = [], categoryRevenues = [] } = summary;

  return (
    <div style={s.container}>
      {/* Gráfico de Evolução Mensal */}
      <div style={s.chartSection}>
        <div style={s.sectionHeader}>
          <h3 style={s.sectionTitle}>Evolução Mensal (Entradas vs Saídas)</h3>
          <span style={s.sectionSub}>Balanço financeiro consolidado por mês</span>
        </div>

        <div style={s.chartWrapper}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="monthName" stroke="#737373" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#737373"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `R$ ${val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 12, fontSize: 13 }}
                formatter={(val) => <span style={{ color: 'var(--text)' }}>{val}</span>}
              />
              <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="saidas" name="Saídas (Despesas)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribuição por Categorias */}
      <div style={s.categoriesGrid}>
        {/* Despesas */}
        <div style={s.catCard}>
          <div style={s.catHeader}>
            <span style={s.catDotRed} />
            <span style={s.catTitle}>Principais Despesas por Categoria</span>
          </div>
          {categoryExpenses.length === 0 ? (
            <div style={s.emptyCat}>Nenhuma despesa registrada ainda.</div>
          ) : (
            <div style={s.catList}>
              {categoryExpenses.slice(0, 6).map((c) => {
                const maxExpense = categoryExpenses[0]?.total || 1;
                const pct = Math.min(100, (c.total / maxExpense) * 100);
                return (
                  <div key={c.categoria} style={s.catItem}>
                    <div style={s.catItemTop}>
                      <span style={s.catItemName}>{c.categoria}</span>
                      <span style={s.catItemVal}>{fmt(c.total)}</span>
                    </div>
                    <div style={s.barTrack}>
                      <div style={{ ...s.barFillRed, width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Entradas */}
        <div style={s.catCard}>
          <div style={s.catHeader}>
            <span style={s.catDotGreen} />
            <span style={s.catTitle}>Principais Entradas por Categoria</span>
          </div>
          {categoryRevenues.length === 0 ? (
            <div style={s.emptyCat}>Nenhuma entrada registrada ainda.</div>
          ) : (
            <div style={s.catList}>
              {categoryRevenues.slice(0, 6).map((c) => {
                const maxRev = categoryRevenues[0]?.total || 1;
                const pct = Math.min(100, (c.total / maxRev) * 100);
                return (
                  <div key={c.categoria} style={s.catItem}>
                    <div style={s.catItemTop}>
                      <span style={s.catItemName}>{c.categoria}</span>
                      <span style={s.catItemValGreen}>{fmt(c.total)}</span>
                    </div>
                    <div style={s.barTrack}>
                      <div style={{ ...s.barFillGreen, width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
  },
  chartSection: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px',
    boxShadow: 'var(--shadow)',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text)',
  },
  sectionSub: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  chartWrapper: {
    width: '100%',
    marginTop: 8,
  },
  tooltip: {
    background: '#1f1f1f',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  },
  tooltipTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
    color: 'var(--text)',
  },
  tooltipRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    fontSize: 12,
    marginTop: 2,
  },
  categoriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
    gap: 14,
  },
  catCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '18px 20px',
    boxShadow: 'var(--shadow)',
  },
  catHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  catDotRed: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#ef4444',
  },
  catDotGreen: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#22c55e',
  },
  catTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text)',
  },
  emptyCat: {
    padding: '20px 0',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: 13,
  },
  catList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  catItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  catItemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 13,
  },
  catItemName: {
    color: 'var(--text)',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '65%',
  },
  catItemVal: {
    color: '#ef4444',
    fontWeight: 700,
  },
  catItemValGreen: {
    color: '#22c55e',
    fontWeight: 700,
  },
  barTrack: {
    height: 6,
    background: 'var(--bg-card2, #1f1f1f)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFillRed: {
    height: '100%',
    background: '#ef4444',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  barFillGreen: {
    height: '100%',
    background: '#22c55e',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
};

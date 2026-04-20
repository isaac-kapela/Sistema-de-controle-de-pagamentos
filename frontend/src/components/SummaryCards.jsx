import React from 'react';

const fmt = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function SummaryCards({ summary }) {
  if (!summary) return null;
  const { totalAmount, totalPaid, totalPending, countPaid, countPending } = summary;

  const cards = [
    { label: 'Total do mês', value: fmt(totalAmount), color: 'var(--primary)' },
    { label: 'Arrecadado', value: fmt(totalPaid), color: 'var(--success)' },
    { label: 'Pendente', value: fmt(totalPending), color: 'var(--danger)' },
    { label: 'Pagaram', value: `${countPaid} pessoa${countPaid !== 1 ? 's' : ''}`, color: 'var(--success)' },
    { label: 'Devendo', value: `${countPending} pessoa${countPending !== 1 ? 's' : ''}`, color: 'var(--warning)' },
  ];

  return (
    <div style={styles.grid}>
      {cards.map((c) => (
        <div key={c.label} style={styles.card}>
          <span style={{ ...styles.value, color: c.color }}>{c.value}</span>
          <span style={styles.label}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    boxShadow: 'var(--shadow)',
  },
  value: {
    fontSize: 20,
    fontWeight: 700,
  },
  label: {
    fontSize: 12,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
};

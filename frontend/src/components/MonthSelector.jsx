import React from 'react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function MonthSelector({ month, year, onChange }) {
  const handleMonth = (e) => onChange(parseInt(e.target.value), year);
  const handleYear = (e) => onChange(month, parseInt(e.target.value));

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 2; y <= currentYear + 1; y++) years.push(y);

  return (
    <div style={styles.wrapper}>
      <select value={month} onChange={handleMonth} style={styles.select}>
        {MONTHS.map((m, i) => (
          <option key={i + 1} value={i + 1}>{m}</option>
        ))}
      </select>
      <select value={year} onChange={handleYear} style={styles.select}>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    gap: 8,
  },
  select: {
    background: 'var(--bg-card2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '8px 12px',
    fontSize: 14,
    cursor: 'pointer',
  },
};

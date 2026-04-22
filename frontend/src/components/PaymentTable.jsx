import React, { useState } from 'react';
import PaymentRow, { PaymentCard } from './PaymentRow';

const FILTERS = ['Todos', 'Pagos', 'Pendentes'];

export default function PaymentTable({ payments, onToggle, onDeleted, isAdmin }) {
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');

  const filtered = payments.filter((p) => {
    const nameMatch = p.userId?.name?.toLowerCase().includes(search.toLowerCase());
    if (filter === 'Pagos') return nameMatch && p.fullyPaid;
    if (filter === 'Pendentes') return nameMatch && !p.fullyPaid;
    return nameMatch;
  });

  return (
    <div style={styles.wrapper}>
      {/* Barra de filtros */}
      <div style={styles.toolbar}>
        <input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />
        <div style={styles.filterGroup}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ ...styles.filterBtn, ...(filter === f ? styles.filterActive : {}) }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela — desktop */}
      <div className="payment-table-desktop" style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Membro</th>
              <th style={styles.th}>Tipo</th>
              <th style={styles.th}>Valor</th>
              <th style={styles.th}>Gasolina (R$5)</th>
              <th style={styles.th}>Drive (R$2,27)</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  Nenhum resultado encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <PaymentRow key={p._id} payment={p} onToggle={onToggle} onDeleted={onDeleted} isAdmin={isAdmin} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <div className="payment-cards-mobile">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
            Nenhum resultado encontrado.
          </div>
        ) : (
          filtered.map((p) => (
            <PaymentCard key={p._id} payment={p} onToggle={onToggle} onDeleted={onDeleted} isAdmin={isAdmin} />
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: 180,
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '7px 12px',
    color: 'var(--text)',
    fontSize: 13,
  },
  filterGroup: {
    display: 'flex',
    gap: 4,
  },
  filterBtn: {
    padding: '6px 14px',
    borderRadius: 8,
    background: 'var(--bg-card2)',
    color: 'var(--text-muted)',
    fontSize: 13,
    fontWeight: 500,
  },
  filterActive: {
    background: 'var(--primary)',
    color: '#fff',
  },
  tableWrap: {},
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  thead: {
    background: 'var(--bg-card2)',
  },
  th: {
    padding: '10px 16px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
};

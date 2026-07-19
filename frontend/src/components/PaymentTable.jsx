import React, { useState } from 'react';
import PaymentRow, { PaymentCard } from './PaymentRow';

const FILTERS = ['Todos', 'Pagos', 'Pendentes'];

export default function PaymentTable({ payments, chargeTypes, onToggle, onDeleted, isAdmin }) {
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');

  const filtered = payments.filter((p) => {
    const nameMatch = p.userId?.name?.toLowerCase().includes(search.toLowerCase());
    if (filter === 'Pagos') return nameMatch && p.fullyPaid;
    if (filter === 'Pendentes') return nameMatch && !p.fullyPaid;
    return nameMatch;
  });

  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
            <button key={f} onClick={() => setFilter(f)} style={{ ...styles.filterBtn, ...(filter === f ? styles.filterActive : {}) }}>
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
              {chargeTypes.map((ct) => {
                // Para cobranças rateadas, pega o valor por pessoa do primeiro pagamento que a tem
                const perPerson = ct.splitAmongUsers
                  ? payments.find(p => p.charges?.find(c => c.chargeTypeId?.toString() === ct._id || c.chargeTypeId === ct._id))
                      ?.charges?.find(c => c.chargeTypeId?.toString() === ct._id || c.chargeTypeId === ct._id)?.value ?? ct.value
                  : ct.value;
                return (
                  <th key={ct._id} style={styles.th}>
                    <div>{ct.name}</div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 11 }}>{fmt(perPerson)}/pessoa</div>
                    {ct.splitAmongUsers && (
                      <div style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 10 }}>total {fmt(ct.value)}</div>
                    )}
                  </th>
                );
              })}
              <th style={styles.th}>Status</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4 + chargeTypes.length} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  Nenhum resultado encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <PaymentRow key={p._id} payment={p} chargeTypes={chargeTypes} onToggle={onToggle} onDeleted={onDeleted} isAdmin={isAdmin} />
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
            <PaymentCard key={p._id} payment={p} chargeTypes={chargeTypes} onToggle={onToggle} onDeleted={onDeleted} isAdmin={isAdmin} />
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' },
  toolbar: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' },
  input: { flex: 1, minWidth: 0, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', color: 'var(--text)', fontSize: 13 },
  filterGroup: { display: 'flex', gap: 4 },
  filterBtn: { padding: '6px 14px', borderRadius: 8, background: 'var(--bg-card2)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' },
  filterActive: { background: 'var(--primary)', color: '#fff' },
  tableWrap: {},
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: 'var(--bg-card2)' },
  th: { padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' },
};

import React from 'react';

const fmt = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FinancialSummaryCards({ summary, loading, onAdjustBalance }) {
  if (loading) {
    return (
      <div style={s.grid}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ ...s.card, opacity: 0.6 }}>
            <span style={s.label}>Carregando...</span>
            <span style={{ ...s.value, color: 'var(--text-muted)' }}>R$ —</span>
          </div>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const {
    saldoAtual = 0,
    totalEntradas = 0,
    totalDespesas = 0,
    comprasPendentesValor = 0,
    comprasAguardandoEntrega = 0,
    comprasAtrasadasCount = 0,
  } = summary;

  const cards = [
    {
      id: 'saldo',
      label: 'Saldo atual em caixa',
      sublabel: 'Disponível efetivo (Entradas - Despesas)',
      value: fmt(saldoAtual),
      color: saldoAtual >= 0 ? 'var(--success)' : 'var(--danger)',
      borderTop: saldoAtual >= 0 ? '#22c55e' : '#ef4444',
      actionLabel: 'Atualizar Saldo',
      action: onAdjustBalance,
    },
    {
      id: 'entradas',
      label: 'Total de entradas',
      sublabel: 'Recebimentos realizados',
      value: fmt(totalEntradas),
      color: 'var(--success)',
      borderTop: '#22c55e',
    },
    {
      id: 'despesas',
      label: 'Total de despesas',
      sublabel: 'Despesas efetivamente pagas',
      value: fmt(totalDespesas),
      color: 'var(--danger)',
      borderTop: '#ef4444',
    },
    {
      id: 'pendentes',
      label: 'Compras pendentes',
      sublabel: 'Comprometido não pago',
      value: fmt(comprasPendentesValor),
      color: '#eab308',
      borderTop: '#eab308',
    },
    {
      id: 'entrega',
      label: 'Aguardando entrega',
      sublabel: comprasAtrasadasCount > 0
        ? `${comprasAtrasadasCount} compra${comprasAtrasadasCount > 1 ? 's' : ''} com entrega atrasada`
        : 'Compras em transporte ou preparo',
      value: `${comprasAguardandoEntrega} item${comprasAguardandoEntrega !== 1 ? 's' : ''}`,
      color: comprasAtrasadasCount > 0 ? '#ef4444' : '#38bdf8',
      borderTop: comprasAtrasadasCount > 0 ? '#ef4444' : '#38bdf8',
      badge: comprasAtrasadasCount > 0 ? `${comprasAtrasadasCount} atraso(s)` : null,
    },
  ];

  return (
    <div style={s.grid}>
      {cards.map((c) => (
        <div key={c.label} style={{ ...s.card, borderTop: `3px solid ${c.borderTop}` }}>
          <div style={s.topRow}>
            <span style={s.label}>{c.label}</span>
            {c.action && (
              <button
                type="button"
                onClick={c.action}
                style={s.actionBtn}
                title="Ajustar ou definir valor real em caixa"
              >
                {c.actionLabel}
              </button>
            )}
            {c.badge && <span style={s.badge}>{c.badge}</span>}
          </div>
          <div style={{ ...s.value, color: c.color }}>{c.value}</div>
          <div style={s.sub}>{c.sublabel}</div>
        </div>
      ))}
    </div>
  );
}

const s = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
    gap: 12,
    marginBottom: 20,
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    boxShadow: 'var(--shadow)',
    position: 'relative',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  actionBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '2px 7px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  badge: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: '1px 7px',
    fontSize: 10,
    fontWeight: 700,
  },
  value: {
    fontSize: 'clamp(18px, 2.2vw, 24px)',
    fontWeight: 800,
    lineHeight: 1.2,
  },
  sub: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
};
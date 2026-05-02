import React from 'react';

const DAYS  = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const HOURS = [7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];

// ── Cores da visão agregada ──────────────────────────────────
// Célula mostra quantos membros estão OCUPADOS naquele slot.
// 0 = verde (todos livres), cresce até vermelho.
function aggColor(count, total) {
  if (count === 0)                          return { bg: '#166534', fg: '#bbf7d0' }; // verde escuro
  const ratio = count / Math.max(total, 1);
  if (ratio < 0.25)                         return { bg: '#14532d', fg: '#86efac' }; // verde
  if (ratio < 0.5)                          return { bg: '#713f12', fg: '#fde68a' }; // amarelo
  if (ratio < 0.75)                         return { bg: '#7c2d12', fg: '#fdba74' }; // laranja
  return                                           { bg: '#450a0a', fg: '#fca5a5' }; // vermelho
}

/**
 * Props:
 *  mode        : 'individual' | 'aggregate'
 *  slots       : [{day,hour}]         — modo individual
 *  aggregate   : { 'day-hour': count } — modo aggregate
 *  total       : número total de membros no aggregate
 *  editable    : bool (individual, permite clicar para toggle)
 *  onToggle    : (day, hour) => void
 */
export default function ScheduleGrid({ mode = 'individual', slots = [], aggregate = {}, total = 0, editable = false, onToggle }) {

  const slotSet = new Set(slots.map(s => `${s.day}-${s.hour}`));

  return (
    <div style={s.wrap}>
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.thHour}></th>
              {DAYS.map((d, i) => (
                <th key={i} style={s.th}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h) => (
              <tr key={h}>
                <td style={s.hourLabel}>{h}h</td>
                {DAYS.map((_, d) => {
                  const key = `${d}-${h}`;

                  if (mode === 'aggregate') {
                    const count = aggregate[key] || 0;
                    const { bg, fg } = aggColor(count, total);
                    return (
                      <td key={d} style={{ ...s.cell, background: bg, color: fg }}>
                        <span style={s.aggNum}>{count}</span>
                      </td>
                    );
                  }

                  // individual
                  const filled = slotSet.has(key);
                  return (
                    <td
                      key={d}
                      style={{
                        ...s.cell,
                        background: filled ? '#1e40af' : 'var(--bg-card2)',
                        cursor: editable ? 'pointer' : 'default',
                        border: filled ? '1px solid #3b82f6' : '1px solid var(--border)',
                      }}
                      onClick={() => editable && onToggle && onToggle(d, h)}
                      title={editable ? (filled ? 'Clique para liberar' : 'Clique para marcar como ocupado') : ''}
                    >
                      {filled && <span style={s.dot} />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      {mode === 'aggregate' ? (
        <div style={s.legend}>
          <LegItem bg="#166534" fg="#bbf7d0" label="0 — todos livres" />
          <LegItem bg="#14532d" fg="#86efac" label="poucos ocupados" />
          <LegItem bg="#713f12" fg="#fde68a" label="metade ocupada" />
          <LegItem bg="#7c2d12" fg="#fdba74" label="maioria ocupada" />
          <LegItem bg="#450a0a" fg="#fca5a5" label="todos ocupados" />
        </div>
      ) : (
        <div style={s.legend}>
          <LegItem bg="#1e40af" fg="#fff" label="Horário ocupado (aula / compromisso)" />
          <LegItem bg="var(--bg-card2)" fg="var(--text-muted)" label="Livre" />
          {editable && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>Clique nas células para editar</span>}
        </div>
      )}
    </div>
  );
}

function LegItem({ bg, fg, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 14, height: 14, borderRadius: 3, background: bg, border: `1px solid ${fg}33`, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

const s = {
  wrap: { width: '100%' },
  tableWrap: { overflowX: 'auto' },
  table: {
    borderCollapse: 'collapse',
    width: '100%',
    minWidth: 520,
    fontSize: 12,
  },
  th: {
    padding: '6px 10px',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 11,
    color: 'var(--text-muted)',
    background: 'var(--bg-card)',
    borderBottom: '2px solid var(--border)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  thHour: {
    padding: '6px 8px',
    background: 'var(--bg-card)',
    borderBottom: '2px solid var(--border)',
    width: 44,
  },
  hourLabel: {
    padding: '0 8px',
    fontSize: 11,
    color: 'var(--text-muted)',
    fontWeight: 600,
    textAlign: 'right',
    whiteSpace: 'nowrap',
    background: 'var(--bg-card)',
    borderRight: '1px solid var(--border)',
  },
  cell: {
    width: 52,
    height: 28,
    textAlign: 'center',
    border: '1px solid var(--border)',
    transition: 'background 0.1s',
    position: 'relative',
  },
  dot: {
    display: 'inline-block',
    width: 8, height: 8,
    borderRadius: '50%',
    background: '#93c5fd',
  },
  aggNum: {
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 0,
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px 20px',
    marginTop: 14,
    alignItems: 'center',
  },
};

import React from 'react';
import { deleteUser, sendCharge } from '../services/api';
import toast from 'react-hot-toast';
import { useState } from 'react';

const fmt = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PaymentRow({ payment, onToggle, onDeleted, isAdmin }) {
  const { userId, fullyPaid, gasolinaPaid, drivePaid, amount, amountPaid, isDriver } = payment;

  const statusColor = fullyPaid ? 'var(--success)' : 'var(--danger)';

  const [sending, setSending] = useState(false);

  const handleCharge = async () => {
    setSending(true);
    try {
      await sendCharge(payment._id);
      toast.success(`Cobrança enviada para ${userId?.email}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar email.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remover "${userId?.name}" do sistema? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteUser(userId._id);
      toast.success(`${userId?.name} removido.`);
      onDeleted();
    } catch {
      toast.error('Erro ao remover usuário.');
    }
  };

  return (
    <tr style={styles.row}>
      {/* Nome */}
      <td style={styles.td}>
        <div style={styles.name}>{userId?.name || '—'}</div>
        <div style={styles.email}>{userId?.email || ''}</div>
      </td>

      {/* Tipo */}
      <td style={styles.td}>
        <span style={{ ...styles.badge, background: isDriver ? '#1a0000' : '#1f1f1f', border: `1px solid ${isDriver ? '#a80303' : '#3a3a3a'}`, color: isDriver ? '#a80303' : 'var(--text-muted)' }}>
          {isDriver ? 'Motorista' : 'Normal'}
        </span>
      </td>

      {/* Valor devido */}
      <td style={{ ...styles.td, color: 'var(--text-muted)' }}>{fmt(amount)}</td>

      {/* Gasolina — oculto para motoristas */}
      <td style={styles.td}>
        {!isDriver ? (
          isAdmin
            ? <CheckBtn checked={gasolinaPaid} onClick={() => onToggle(payment._id, 'gasolina')} />
            : <StatusDot checked={gasolinaPaid} />
        ) : (
          <span style={styles.na}>—</span>
        )}
      </td>

      {/* Drive */}
      <td style={styles.td}>
        {isAdmin
          ? <CheckBtn checked={drivePaid} onClick={() => onToggle(payment._id, 'drive')} />
          : <StatusDot checked={drivePaid} />
        }
      </td>

      {/* Pago / Pendente */}
      <td style={styles.td}>
        <span style={{ color: statusColor, fontWeight: 600 }}>
          {fullyPaid ? 'Pago' : `Falta ${fmt(amount - amountPaid)}`}
        </span>
      </td>

      {/* Ações */}
      <td style={styles.td}>
        <div style={{ display: 'flex', gap: 6 }}>
          {!fullyPaid && (
            <button
              onClick={() => onToggle(payment._id, 'all')}
              style={{ ...styles.btn, background: 'var(--success-dark)' }}
            >
              Marcar pago
            </button>
          )}
          {isAdmin && fullyPaid && (
            <button
              onClick={() => onToggle(payment._id, 'all')}
              style={{ ...styles.btn, background: '#2a2a2a', border: '1px solid #3a3a3a' }}
            >
              Desfazer
            </button>
          )}
          {isAdmin && !fullyPaid && (
            <button
              onClick={handleCharge}
              disabled={sending}
              style={{ ...styles.btn, background: 'transparent', border: '1px solid #2e2e2e', color: 'var(--text-muted)', padding: '6px 10px', opacity: sending ? 0.5 : 1 }}
              title="Enviar cobrança por email"
            >
              ✉
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleDelete}
              style={{ ...styles.btn, background: 'transparent', border: '1px solid #3a3a3a', color: 'var(--danger)', padding: '6px 10px' }}
              title="Remover membro"
            >
              ✕
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function StatusDot({ checked }) {
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      background: checked ? 'var(--success)' : 'var(--border)',
    }} />
  );
}

function CheckBtn({ checked, onClick }) {
  return (
    <button onClick={onClick} style={{ ...styles.check, background: checked ? 'var(--success)' : 'var(--bg-card2)', border: `2px solid ${checked ? 'var(--success)' : 'var(--border)'}` }}>
      {checked && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7l4 4 6-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export function PaymentCard({ payment, onToggle, onDeleted, isAdmin }) {
  const { userId, fullyPaid, gasolinaPaid, drivePaid, amount, amountPaid, isDriver } = payment;
  const statusColor = fullyPaid ? 'var(--success)' : 'var(--danger)';
  const [sending, setSending] = useState(false);

  const handleCharge = async () => {
    setSending(true);
    try {
      await sendCharge(payment._id);
      toast.success(`Cobrança enviada para ${userId?.email}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar email.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remover "${userId?.name}" do sistema? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteUser(userId._id);
      toast.success(`${userId?.name} removido.`);
      onDeleted();
    } catch {
      toast.error('Erro ao remover usuário.');
    }
  };

  return (
    <div style={card.wrap}>
      {/* Linha superior: nome + tipo + status */}
      <div style={card.top}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.name}>{userId?.name || '—'}</div>
          <div style={styles.email}>{userId?.email || ''}</div>
        </div>
        <div style={card.topRight}>
          <span style={{ ...styles.badge, background: isDriver ? '#1a0000' : '#1f1f1f', border: `1px solid ${isDriver ? '#a80303' : '#3a3a3a'}`, color: isDriver ? '#a80303' : 'var(--text-muted)' }}>
            {isDriver ? 'Motorista' : 'Normal'}
          </span>
          <span style={{ color: statusColor, fontWeight: 700, fontSize: 13 }}>
            {fullyPaid ? 'Pago' : `Falta ${fmt(amount - amountPaid)}`}
          </span>
        </div>
      </div>

      {/* Checkboxes */}
      <div style={card.checks}>
        {!isDriver && (
          <div style={card.checkItem}>
            <span style={card.checkLabel}>Gasolina</span>
            {isAdmin
              ? <CheckBtn checked={gasolinaPaid} onClick={() => onToggle(payment._id, 'gasolina')} />
              : <StatusDot checked={gasolinaPaid} />
            }
          </div>
        )}
        <div style={card.checkItem}>
          <span style={card.checkLabel}>Drive</span>
          {isAdmin
            ? <CheckBtn checked={drivePaid} onClick={() => onToggle(payment._id, 'drive')} />
            : <StatusDot checked={drivePaid} />
          }
        </div>
      </div>

      {/* Ações */}
      {(!fullyPaid || isAdmin) && (
        <div style={card.actions}>
          {!fullyPaid && (
            <button onClick={() => onToggle(payment._id, 'all')} style={{ ...styles.btn, background: 'var(--success-dark)', flex: 1 }}>
              Marcar pago
            </button>
          )}
          {isAdmin && fullyPaid && (
            <button onClick={() => onToggle(payment._id, 'all')} style={{ ...styles.btn, background: '#2a2a2a', border: '1px solid #3a3a3a', flex: 1 }}>
              Desfazer
            </button>
          )}
          {isAdmin && !fullyPaid && (
            <button onClick={handleCharge} disabled={sending} style={{ ...styles.btn, background: 'transparent', border: '1px solid #2e2e2e', color: 'var(--text-muted)', padding: '6px 12px', opacity: sending ? 0.5 : 1 }} title="Enviar cobrança por email">
              ✉
            </button>
          )}
          {isAdmin && (
            <button onClick={handleDelete} style={{ ...styles.btn, background: 'transparent', border: '1px solid #3a3a3a', color: 'var(--danger)', padding: '6px 12px' }} title="Remover membro">
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const card = {
  wrap: {
    padding: '14px 16px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    background: 'var(--bg-card)',
  },
  top: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  topRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  checks: {
    display: 'flex',
    gap: 20,
    paddingTop: 8,
    borderTop: '1px solid var(--border)',
  },
  checkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  checkLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  actions: {
    display: 'flex',
    gap: 6,
  },
};

const styles = {
  row: {
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.15s',
  },
  td: {
    padding: '12px 16px',
    verticalAlign: 'middle',
  },
  name: {
    fontWeight: 600,
    fontSize: 14,
  },
  email: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text)',
  },
  na: {
    color: 'var(--text-muted)',
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
  },
  btn: {
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    transition: 'opacity 0.15s',
  },
};

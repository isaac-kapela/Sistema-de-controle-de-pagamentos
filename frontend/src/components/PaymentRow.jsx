import React, { useState } from 'react';
import { deleteUser, sendCharge } from '../services/api';
import toast from 'react-hot-toast';

const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MSG_GESTAO = 'Para desmarcar, entre em contato com alguém da gestão.';

export default function PaymentRow({ payment, chargeTypes, onToggle, onDeleted, isAdmin }) {
  const { userId, fullyPaid, amount, amountPaid, isDriver, charges } = payment;
  const statusColor = fullyPaid ? 'var(--success)' : 'var(--danger)';
  const [sending, setSending] = useState(false);

  const handleToggle = (id, field) => {
    const isUndo = field === 'all'
      ? fullyPaid
      : charges.find(c => c.chargeTypeId === field || c.chargeTypeId?.toString() === field)?.paid ?? false;
    if (isUndo && !isAdmin) { toast(MSG_GESTAO, { icon: 'ℹ️' }); return; }
    onToggle(id, field);
  };

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

      {/* Uma coluna por tipo de cobrança */}
      {chargeTypes.map((ct) => {
        const charge = charges?.find(c => c.chargeTypeId === ct._id || c.chargeTypeId?.toString() === ct._id);
        if (!charge) return <td key={ct._id} style={styles.td}><span style={styles.na}>—</span></td>;
        return (
          <td key={ct._id} style={styles.td}>
            <CheckBtn checked={charge.paid} onClick={() => handleToggle(payment._id, charge.chargeTypeId)} />
          </td>
        );
      })}

      {/* Status */}
      <td style={styles.td}>
        <span style={{ color: statusColor, fontWeight: 600 }}>
          {fullyPaid ? 'Pago' : `Falta ${fmt(amount - amountPaid)}`}
        </span>
      </td>

      {/* Ações */}
      <td style={styles.td}>
        <div style={{ display: 'flex', gap: 6 }}>
          {!fullyPaid && (
            <button onClick={() => handleToggle(payment._id, 'all')} style={{ ...styles.btn, background: 'var(--success-dark)' }}>
              Marcar pago
            </button>
          )}
          {isAdmin && fullyPaid && (
            <button onClick={() => handleToggle(payment._id, 'all')} style={{ ...styles.btn, background: '#2a2a2a', border: '1px solid #3a3a3a' }}>
              Desfazer
            </button>
          )}
          {isAdmin && !fullyPaid && (
            <button onClick={handleCharge} disabled={sending} style={{ ...styles.btn, background: 'transparent', border: '1px solid #2e2e2e', color: 'var(--text-muted)', padding: '6px 10px', opacity: sending ? 0.5 : 1 }} title="Enviar cobrança por email">
              ✉
            </button>
          )}
          {isAdmin && (
            <button onClick={handleDelete} style={{ ...styles.btn, background: 'transparent', border: '1px solid #3a3a3a', color: 'var(--danger)', padding: '6px 10px' }} title="Remover membro">
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
    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: checked ? 'var(--success)' : 'var(--border)' }} />
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

export function PaymentCard({ payment, chargeTypes, onToggle, onDeleted, isAdmin }) {
  const { userId, fullyPaid, amount, amountPaid, isDriver, charges } = payment;
  const [sending, setSending] = useState(false);

  const handleToggle = (id, field) => {
    const isUndo = field === 'all'
      ? fullyPaid
      : charges.find(c => c.chargeTypeId === field || c.chargeTypeId?.toString() === field)?.paid ?? false;
    if (isUndo && !isAdmin) { toast(MSG_GESTAO, { icon: 'ℹ️' }); return; }
    onToggle(id, field);
  };

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
      {/* Cabeçalho: nome + status */}
      <div style={card.top}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.name}>{userId?.name || '—'}</div>
          <div style={styles.email}>{userId?.email || ''}</div>
        </div>
        <div style={card.topRight}>
          <span style={{ ...styles.badge, background: isDriver ? '#1a0000' : '#1f1f1f', border: `1px solid ${isDriver ? '#a80303' : '#3a3a3a'}`, color: isDriver ? '#a80303' : 'var(--text-muted)' }}>
            {isDriver ? 'Motorista' : 'Normal'}
          </span>
          {fullyPaid
            ? <span style={card.statusPago}>✓ Pago</span>
            : <span style={card.statusFalta}>Falta {fmt(amount - amountPaid)}</span>
          }
        </div>
      </div>

      {/* Cobranças: grid com nome, valor e checkbox */}
      <div style={card.checks}>
        {chargeTypes.map((ct) => {
          const charge = charges?.find(c => c.chargeTypeId === ct._id || c.chargeTypeId?.toString() === ct._id);
          if (!charge) return null;
          return (
            <div key={ct._id} style={card.checkItem}>
              <CheckBtn checked={charge.paid} onClick={() => handleToggle(payment._id, charge.chargeTypeId)} />
              <div>
                <div style={card.checkLabel}>{ct.name}</div>
                <div style={card.checkValue}>{fmt(charge.value)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ações */}
      <div style={card.actions}>
        {!fullyPaid && (
          <button onClick={() => handleToggle(payment._id, 'all')} style={{ ...styles.btn, background: 'var(--success-dark)', flex: 1 }}>
            Marcar tudo pago
          </button>
        )}
        {isAdmin && fullyPaid && (
          <button onClick={() => handleToggle(payment._id, 'all')} style={{ ...styles.btn, background: '#2a2a2a', border: '1px solid #3a3a3a', flex: 1 }}>
            Desfazer
          </button>
        )}
        {isAdmin && !fullyPaid && (
          <button onClick={handleCharge} disabled={sending} style={{ ...styles.btn, background: 'transparent', border: '1px solid #2e2e2e', color: 'var(--text-muted)', padding: '8px 14px', opacity: sending ? 0.5 : 1 }} title="Enviar cobrança por email">
            ✉
          </button>
        )}
        {isAdmin && (
          <button onClick={handleDelete} style={{ ...styles.btn, background: 'transparent', border: '1px solid #3a3a3a', color: 'var(--danger)', padding: '8px 14px' }} title="Remover membro">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

const card = {
  wrap: { padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-card)' },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  topRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  statusPago: { color: 'var(--success)', fontWeight: 700, fontSize: 13 },
  statusFalta: { color: 'var(--danger)', fontWeight: 700, fontSize: 13 },
  checks: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px 16px', paddingTop: 10, borderTop: '1px solid var(--border)' },
  checkItem: { display: 'flex', alignItems: 'center', gap: 10 },
  checkLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 },
  checkValue: { fontSize: 11, color: 'var(--text-muted)', marginTop: 1 },
  actions: { display: 'flex', gap: 8, paddingTop: 4 },
};

const styles = {
  row: { borderBottom: '1px solid var(--border)', transition: 'background 0.15s' },
  td: { padding: '12px 16px', verticalAlign: 'middle' },
  name: { fontWeight: 600, fontSize: 14 },
  email: { fontSize: 12, color: 'var(--text-muted)' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, color: 'var(--text)' },
  na: { color: 'var(--text-muted)' },
  check: { width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', cursor: 'pointer' },
  btn: { padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#fff', transition: 'opacity 0.15s', cursor: 'pointer', border: 'none' },
};

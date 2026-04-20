import React, { useState } from 'react';
import { createUser } from '../services/api';
import toast from 'react-hot-toast';

const INITIAL = { name: '', email: '', isDriver: false };

export default function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Nome e email são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      const user = await createUser(form);
      toast.success(`${user.name} adicionado!`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar usuário.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Novo Membro</h2>
          <button onClick={onClose} style={styles.close}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Nome
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Nome completo"
              style={styles.input}
              autoFocus
            />
          </label>

          <label style={styles.label}>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@exemplo.com"
              style={styles.input}
            />
          </label>

          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              name="isDriver"
              checked={form.isDriver}
              onChange={handleChange}
              style={{ width: 16, height: 16 }}
            />
            <span>
              <strong>Motorista</strong>
              <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                (paga apenas Drive — R$2,27)
              </span>
            </span>
          </label>

          {/* Preview valor */}
          <div style={styles.preview}>
            Valor mensal: <strong>{form.isDriver ? 'R$ 2,27' : 'R$ 7,27'}</strong>
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>
              {saving ? 'Salvando…' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: 16,
  },
  modal: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 22px 14px',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
  },
  close: {
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: 18,
    padding: 4,
  },
  form: {
    padding: '20px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-muted)',
  },
  input: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '9px 12px',
    color: 'var(--text)',
    fontSize: 14,
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    fontSize: 14,
  },
  preview: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--text-muted)',
  },
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  cancelBtn: {
    padding: '9px 18px',
    borderRadius: 8,
    background: 'var(--bg-card2)',
    color: 'var(--text)',
    fontSize: 14,
    fontWeight: 500,
  },
  saveBtn: {
    padding: '9px 22px',
    borderRadius: 8,
    background: 'var(--primary)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(168,3,3,0.4)',
  },
};

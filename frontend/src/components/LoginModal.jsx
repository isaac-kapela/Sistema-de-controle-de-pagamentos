import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginModal({ onClose }) {
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(pin);
      onClose();
    } catch {
      setError('PIN incorreto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Acesso Admin</h2>
          <button onClick={onClose} style={styles.close}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <p style={styles.desc}>
            Apenas membros da gestão e capitania podem marcar pagamentos.
          </p>

          <input
            type="password"
            placeholder="Digite o PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={styles.input}
            autoFocus
          />

          {error && <span style={styles.error}>{error}</span>}

          <button type="submit" disabled={loading || !pin} style={styles.btn}>
            {loading ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 999, padding: 16,
  },
  modal: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    width: '100%', maxWidth: 360,
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 22px 14px',
    borderBottom: '1px solid var(--border)',
  },
  title: { fontSize: 18, fontWeight: 700 },
  close: { background: 'transparent', color: 'var(--text-muted)', fontSize: 18, padding: 4 },
  form: {
    padding: '20px 22px',
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  desc: { fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 },
  input: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 14px',
    color: 'var(--text)',
    fontSize: 15,
    letterSpacing: '0.15em',
  },
  error: { color: 'var(--danger)', fontSize: 13 },
  btn: {
    background: 'var(--primary)',
    color: '#fff',
    padding: '10px',
    borderRadius: 8,
    fontSize: 14, fontWeight: 600,
    boxShadow: '0 2px 8px rgba(168,3,3,0.4)',
    opacity: 1,
  },
};

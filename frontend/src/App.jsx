import React, { useState } from 'react';
import { usePayments } from './hooks/usePayments';
import { useAuth } from './context/AuthContext';
import MonthSelector from './components/MonthSelector';
import SummaryCards from './components/SummaryCards';
import PaymentTable from './components/PaymentTable';
import AddUserModal from './components/AddUserModal';
import LoginModal from './components/LoginModal';
import { exportYearToExcel } from './services/exportExcel';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function App() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const { isAdmin, logout } = useAuth();

  const handleExportYear = async () => {
    setExporting(true);
    setExportProgress(0);
    try {
      await exportYearToExcel(year, (m) => setExportProgress(m));
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  const { data, loading, error, reload, togglePayment } = usePayments(month, year);

  const handleMonthChange = (m, y) => {
    setMonth(m);
    setYear(y);
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <img src="/logo.png" alt="Logo" style={styles.logo} />
          <div>
            <h1 style={styles.title}>Controle de Pagamentos</h1>
            <p style={styles.subtitle}>
              {MONTHS[month - 1]} de {year}
            </p>
          </div>
        </div>
        <div style={styles.headerActions}>
          <MonthSelector month={month} year={year} onChange={handleMonthChange} />
          <button
            onClick={handleExportYear}
            disabled={exporting}
            style={{ ...styles.exportBtn, opacity: exporting ? 0.6 : 1 }}
          >
            {exporting ? `Exportando ${exportProgress}/12...` : `Exportar ${year}`}
          </button>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} style={styles.addBtn}>
              + Novo Membro
            </button>
          )}
          {isAdmin ? (
            <button onClick={logout} style={styles.logoutBtn}>
              Sair (Admin)
            </button>
          ) : (
            <button onClick={() => setShowLogin(true)} style={styles.adminBtn}>
              Admin
            </button>
          )}
        </div>
      </header>

      {/* Conteúdo */}
      <main style={styles.main}>
        {loading && (
          <div style={styles.center}>
            <div style={styles.spinner} />
            <span style={{ color: 'var(--text-muted)', marginTop: 12 }}>Carregando…</span>
          </div>
        )}

        {error && !loading && (
          <div style={styles.errorBox}>
            {error}
            <button onClick={reload} style={styles.retryBtn}>Tentar novamente</button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <SummaryCards summary={data.summary} />
            <PaymentTable payments={data.payments} onToggle={togglePayment} onDeleted={reload} isAdmin={isAdmin} />
          </>
        )}
      </main>

      {showModal && (
        <AddUserModal onClose={() => setShowModal(false)} onCreated={reload} />
      )}
      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} />
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border)',
    padding: '20px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  logo: {
    height: 48,
    width: 48,
    objectFit: 'contain',
    borderRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  exportBtn: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    padding: '9px 18px',
    borderRadius: 'var(--radius)',
    fontSize: 14,
    fontWeight: 500,
    transition: 'border-color 0.15s, color 0.15s',
  },
  addBtn: {
    background: 'var(--primary)',
    color: '#fff',
    padding: '9px 18px',
    borderRadius: 'var(--radius)',
    fontSize: 14,
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(168,3,3,0.4)',
    transition: 'opacity 0.15s',
  },
  adminBtn: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    padding: '9px 18px',
    borderRadius: 'var(--radius)',
    fontSize: 14,
    fontWeight: 500,
  },
  logoutBtn: {
    background: 'transparent',
    color: 'var(--primary)',
    border: '1px solid var(--primary)',
    padding: '9px 18px',
    borderRadius: 'var(--radius)',
    fontSize: 14,
    fontWeight: 500,
  },
  main: {
    flex: 1,
    padding: '24px 32px',
    maxWidth: 1200,
    width: '100%',
    margin: '0 auto',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid var(--border)',
    borderTop: '3px solid #a80303',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorBox: {
    background: '#3a1f1f',
    border: '1px solid var(--danger)',
    borderRadius: 'var(--radius)',
    padding: '20px 24px',
    color: 'var(--danger)',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  retryBtn: {
    background: 'var(--danger)',
    color: '#fff',
    padding: '7px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
  },
};

// Inject keyframes
const style = document.createElement('style');
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);

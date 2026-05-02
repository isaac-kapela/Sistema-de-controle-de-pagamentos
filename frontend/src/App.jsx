import React, { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginModal from './components/LoginModal';
import PaymentsPage from './pages/PaymentsPage';
import MembersPage from './pages/MembersPage';

export default function App() {
  const { isAdmin, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div style={s.page}>
      {/* Header */}
      <header className="app-header">
        <div style={s.brand}>
          <img src="/logo.png" alt="Logo" style={s.logo} />
          <h1 className="app-title">Microraptor</h1>
        </div>
        <div className="header-actions">
          {isAdmin ? (
            <button onClick={logout} style={s.logoutBtn}>Sair (Admin)</button>
          ) : (
            <button onClick={() => setShowLogin(true)} style={s.adminBtn}>Admin</button>
          )}
        </div>
      </header>

      {/* Navegacao por abas */}
      <nav style={s.tabBar}>
        <NavLink to="/" end style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.tabActive : {}) })}>
          Pagamentos
        </NavLink>
        <NavLink to="/membros" style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.tabActive : {}) })}>
          Membros
        </NavLink>
      </nav>

      {/* Conteudo */}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<PaymentsPage />} />
          <Route path="/membros" element={<MembersPage />} />
        </Routes>
      </main>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  brand: { display: 'flex', alignItems: 'center', gap: 14 },
  logo: { height: 48, width: 48, objectFit: 'contain', borderRadius: 8 },
  adminBtn: {
    background: 'transparent', color: 'var(--text-muted)',
    border: '1px solid var(--border)', padding: '9px 18px',
    borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  logoutBtn: {
    background: 'transparent', color: 'var(--primary)',
    border: '1px solid var(--primary)', padding: '9px 18px',
    borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  tabBar: {
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    paddingLeft: 32,
  },
  tab: {
    color: 'var(--text-muted)',
    textDecoration: 'none',
    borderBottom: '2px solid transparent',
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: 500,
    display: 'inline-block',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: {
    color: 'var(--text)',
    borderBottom: '2px solid var(--primary)',
    fontWeight: 700,
  },
};

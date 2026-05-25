import React, { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginModal from './components/LoginModal';
import PaymentsPage from './pages/PaymentsPage';
import MembersPage from './pages/MembersPage';
import SchedulesPage from './pages/SchedulesPage';
import AttendancePage from './pages/AttendancePage';
import CantinaPage from './pages/CantinaPage';
import EstoquePage from './pages/EstoquePage';
import FeedbacksPage from './pages/FeedbacksPage';
import LogInPage from './pages/LogInPage';

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
      <nav className="app-nav" style={s.tabBar}>
        <NavLink to="/" end style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.tabActive : {}) })}>
          Pagamentos
        </NavLink>
        <NavLink to="/membros" style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.tabActive : {}) })}>
          Membros
        </NavLink>
        <NavLink to="/horarios" style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.tabActive : {}) })}>
          Horários
        </NavLink>
        <NavLink to="/presenca" style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.tabActive : {}) })}>
          Presença
        </NavLink>
        <NavLink to="/cantina" style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.tabActive : {}) })}>
          Cantina
        </NavLink>
        <NavLink to="/estoque" style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.tabActive : {}) })}>
          Estoque
        </NavLink>
        <NavLink to="/feedbacks" style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.tabActive : {}) })}>
          Feedbacks
        </NavLink>
        <NavLink to="/login" style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.tabActive : {}) })}>
          Log In
        </NavLink>
      </nav>

      {/* Conteudo */}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<PaymentsPage />} />
          <Route path="/membros" element={<MembersPage />} />
          <Route path="/horarios" element={<SchedulesPage />} />
          <Route path="/presenca" element={<AttendancePage />} />
          <Route path="/cantina" element={<CantinaPage />} />
          <Route path="/estoque" element={<EstoquePage />} />
          <Route path="/feedbacks" element={<FeedbacksPage />} />
          <Route path="/login" element={<LogInPage />} />
        </Routes>
      </main>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  logo: { height: 40, width: 40, objectFit: 'contain', borderRadius: 8, flexShrink: 0 },
  adminBtn: {
    background: 'transparent', color: 'var(--text-muted)',
    border: '1px solid var(--border)', padding: '8px 14px',
    borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    background: 'transparent', color: 'var(--primary)',
    border: '1px solid var(--primary)', padding: '8px 14px',
    borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabBar: {
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    paddingLeft: 'clamp(8px, 3vw, 32px)',
  },
  tab: {
    color: 'var(--text-muted)',
    textDecoration: 'none',
    borderBottom: '2px solid transparent',
    padding: 'clamp(10px, 2vw, 12px) clamp(10px, 2.5vw, 20px)',
    fontSize: 'clamp(12px, 2vw, 14px)',
    fontWeight: 500,
    display: 'inline-block',
    transition: 'color 0.15s, border-color 0.15s',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    color: 'var(--text)',
    borderBottom: '2px solid var(--primary)',
    fontWeight: 700,
  },
};

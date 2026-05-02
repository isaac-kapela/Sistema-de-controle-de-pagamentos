import React, { useState } from 'react';
import { usePayments } from '../hooks/usePayments';
import { useAuth } from '../context/AuthContext';
import MonthSelector from '../components/MonthSelector';
import SummaryCards from '../components/SummaryCards';
import PaymentTable from '../components/PaymentTable';
import AddUserModal from '../components/AddUserModal';
import { exportYearToExcel } from '../services/exportExcel';
import { sendChargeAll } from '../services/api';
import toast from 'react-hot-toast';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function PaymentsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [charging, setCharging] = useState(false);
  const { isAdmin } = useAuth();

  const { data, loading, error, reload, togglePayment } = usePayments(month, year);

  const handleMonthChange = (m, y) => { setMonth(m); setYear(y); };

  const handleChargeAll = async () => {
    if (!window.confirm('Enviar cobranca por email para todos os pendentes do mes?')) return;
    setCharging(true);
    try {
      const res = await sendChargeAll(month, year);
      toast.success(res.message);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar emails.');
    } finally {
      setCharging(false);
    }
  };

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

  return (
    <>
      {/* Toolbar da pagina */}
      <div style={s.toolbar}>
        <div style={s.toolbarLeft}>
          <MonthSelector month={month} year={year} onChange={handleMonthChange} />
          <span style={s.period}>{MONTHS[month - 1]} de {year}</span>
        </div>
        <div style={s.toolbarRight}>
          <button
            onClick={handleExportYear}
            disabled={exporting}
            style={{ ...s.btnOutline, opacity: exporting ? 0.6 : 1 }}
          >
            {exporting ? `Exportando ${exportProgress}/12...` : `Exportar ${year}`}
          </button>
          {isAdmin && (
            <>
              <button
                onClick={handleChargeAll}
                disabled={charging}
                style={{ ...s.btnOutline, opacity: charging ? 0.6 : 1 }}
              >
                {charging ? 'Enviando...' : 'Cobrar todos'}
              </button>
              <button onClick={() => setShowModal(true)} style={s.btnPrimary}>
                + Novo Usuario
              </button>
            </>
          )}
        </div>
      </div>

      {/* Conteudo */}
      {loading && (
        <div style={s.center}>
          <div style={s.spinner} />
          <span style={{ color: 'var(--text-muted)', marginTop: 12 }}>Carregando...</span>
        </div>
      )}
      {error && !loading && (
        <div style={s.errorBox}>
          {error}
          <button onClick={reload} style={s.retryBtn}>Tentar novamente</button>
        </div>
      )}
      {!loading && !error && data && (
        <>
          <SummaryCards summary={data.summary} />
          <PaymentTable payments={data.payments} onToggle={togglePayment} onDeleted={reload} isAdmin={isAdmin} />
        </>
      )}

      {showModal && (
        <AddUserModal onClose={() => setShowModal(false)} onCreated={reload} />
      )}
    </>
  );
}

const s = {
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 12, marginBottom: 24,
  },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  period: { fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 },
  btnOutline: {
    background: 'transparent', color: 'var(--text-muted)',
    border: '1px solid var(--border)', padding: '9px 16px',
    borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },
  btnPrimary: {
    background: 'var(--primary)', color: '#fff',
    padding: '9px 18px', borderRadius: 'var(--radius)',
    fontSize: 14, fontWeight: 600,
    boxShadow: '0 2px 8px rgba(168,3,3,0.4)',
    cursor: 'pointer', border: 'none',
  },
  center: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', minHeight: 300,
  },
  spinner: {
    width: 36, height: 36,
    border: '3px solid var(--border)', borderTop: '3px solid #a80303',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  errorBox: {
    background: '#3a1f1f', border: '1px solid var(--danger)',
    borderRadius: 'var(--radius)', padding: '20px 24px',
    color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 16,
  },
  retryBtn: {
    background: 'var(--danger)', color: '#fff',
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
  },
};

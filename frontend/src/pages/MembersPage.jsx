import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import MembersLanding from '../components/MembersLanding';
import MemberList from '../components/MemberList';
import MemberForm from '../components/MemberForm';
import MemberTree from '../components/MemberTree';
import { sendBirthdayToday } from '../services/api';
import toast from 'react-hot-toast';

export default function MembersPage() {
  const { isAdmin } = useAuth();
  const [view, setView] = useState('landing');
  const [showForm, setShowForm] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [sendingBirthday, setSendingBirthday] = useState(false);

  const openCreate = () => { setEditMember(null); setShowForm(true); };
  const openEdit = (m) => { setEditMember(m); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditMember(null); };

  const handleBirthdayToday = async () => {
    setSendingBirthday(true);
    try {
      const res = await sendBirthdayToday();
      toast.success(res.message);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar emails de aniversario.');
    } finally {
      setSendingBirthday(false);
    }
  };

  const handleSaved = () => {
    closeForm();
    setReloadKey((k) => k + 1);
    setView('lista');
  };

  return (
    <>
      {/* Toolbar — visível na lista e na arvore */}
      {(view === 'lista' || view === 'arvore') && (
        <div style={s.toolbar}>
          <button onClick={() => setView('landing')} style={s.btnBack}>
            Voltar
          </button>
          <div style={s.toolbarRight}>
            <button
              onClick={() => setView(view === 'lista' ? 'arvore' : 'lista')}
              style={s.btnOutline}
            >
              {view === 'lista' ? 'Ver arvore' : 'Ver lista'}
            </button>
            {isAdmin && (
              <button
                onClick={handleBirthdayToday}
                disabled={sendingBirthday}
                style={{ ...s.btnOutline, opacity: sendingBirthday ? 0.6 : 1 }}
              >
                {sendingBirthday ? 'Enviando...' : 'Parabens do dia'}
              </button>
            )}
            <button onClick={openCreate} style={s.btnPrimary}>
              + Me cadastrar na equipe
            </button>
          </div>
        </div>
      )}

      {/* Landing */}
      {view === 'landing' && (
        <MembersLanding
          onCadastrar={openCreate}
          isAdmin={isAdmin}
          onVerLista={() => setView('lista')}
          onVerArvore={() => setView('arvore')}
        />
      )}

      {/* Lista — publica */}
      {view === 'lista' && (
        <MemberList
          isAdmin={isAdmin}
          reloadKey={reloadKey}
          onEdit={openEdit}
        />
      )}

      {/* Arvore */}
      {view === 'arvore' && <MemberTree />}

      {/* Formulario */}
      {showForm && (
        <MemberForm
          member={editMember}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

const s = {
  toolbar: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 12,
    marginBottom: 24, flexWrap: 'wrap',
  },
  toolbarRight: { display: 'flex', gap: 10 },
  btnBack: {
    background: 'transparent', color: 'var(--text-muted)',
    border: '1px solid var(--border)', padding: '9px 16px',
    borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },
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
};

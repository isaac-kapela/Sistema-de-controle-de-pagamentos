import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getLogins, createLogin, updateLogin, deleteLogin } from '../services/api';

// ── Formulário de adicionar / editar ──────────────────────────
const EMPTY_FORM = { plataforma: '', emailUsuario: '', senha: '', obs: '', categoria: '' };

function CredentialModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState(item ? { ...item } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.plataforma.trim()) { toast.error('Nome da plataforma é obrigatório'); return; }
    setSaving(true);
    try {
      if (item) {
        await updateLogin(item._id, form);
        toast.success('Credencial atualizada');
      } else {
        await createLogin(form);
        toast.success('Credencial adicionada');
      }
      onSaved();
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>{item ? 'Editar credencial' : 'Nova credencial'}</h2>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={s.modalBody}>
          <div style={s.formGrid}>
            <label style={s.label}>
              Plataforma *
              <input style={s.input} value={form.plataforma} onChange={(e) => set('plataforma', e.target.value)} placeholder="Ex: Facebook, GitHub..." autoFocus />
            </label>
            <label style={s.label}>
              Categoria
              <input style={s.input} value={form.categoria} onChange={(e) => set('categoria', e.target.value)} placeholder="Ex: Redes sociais, Dev..." />
            </label>
            <label style={s.label}>
              E-mail / Usuário
              <input style={s.input} value={form.emailUsuario} onChange={(e) => set('emailUsuario', e.target.value)} placeholder="email@exemplo.com" />
            </label>
            <label style={s.label}>
              Senha
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...s.input, paddingRight: 38 }}
                  type={showSenha ? 'text' : 'password'}
                  value={form.senha}
                  onChange={(e) => set('senha', e.target.value)}
                  placeholder="Senha ou chave"
                />
                <button type="button" style={s.eyeBtn} onClick={() => setShowSenha((v) => !v)}>
                  {showSenha ? '🙈' : '👁'}
                </button>
              </div>
            </label>
          </div>
          <label style={s.label}>
            Observações
            <textarea
              style={{ ...s.input, minHeight: 72, resize: 'vertical' }}
              value={form.obs}
              onChange={(e) => set('obs', e.target.value)}
              placeholder="Notas adicionais..."
            />
          </label>
          <div style={s.modalFooter}>
            <button type="button" style={s.cancelBtn} onClick={onClose}>Cancelar</button>
            <button type="submit" style={s.saveBtn} disabled={saving}>
              {saving ? 'Salvando...' : item ? 'Salvar alterações' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Linha da tabela ───────────────────────────────────────────
function CredentialRow({ item, onEdit, onDelete }) {
  const [showSenha, setShowSenha] = useState(false);

  function copiar(texto, label) {
    navigator.clipboard.writeText(texto).then(() => toast.success(`${label} copiado`));
  }

  return (
    <tr style={s.tr}>
      <td style={s.tdPlat}>
        <span style={s.platName}>{item.plataforma}</span>
        {item.categoria && <span style={s.catBadge}>{item.categoria}</span>}
      </td>
      <td style={s.td}>
        {item.emailUsuario ? (
          <div style={s.copyWrap}>
            <span style={s.monoText}>{item.emailUsuario}</span>
            <button style={s.copyBtn} onClick={() => copiar(item.emailUsuario, 'E-mail')}>Copiar</button>
          </div>
        ) : <span style={s.empty}>—</span>}
      </td>
      <td style={s.td}>
        {item.senha ? (
          <div style={s.copyWrap}>
            <span style={s.monoText}>{showSenha ? item.senha : '••••••••'}</span>
            <button style={s.eyeSmall} onClick={() => setShowSenha((v) => !v)}>{showSenha ? '🙈' : '👁'}</button>
            <button style={s.copyBtn} onClick={() => copiar(item.senha, 'Senha')}>Copiar</button>
          </div>
        ) : <span style={s.empty}>—</span>}
      </td>
      <td style={s.tdObs}>
        <span style={s.obsText}>{item.obs || '—'}</span>
      </td>
      <td style={s.tdActions}>
        <button style={s.editBtn} onClick={() => onEdit(item)}>Editar</button>
        <button style={s.deleteBtn} onClick={() => onDelete(item)}>Excluir</button>
      </td>
    </tr>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function LogInPage() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div style={s.restricted}>
        <div style={s.restrictedIcon}>🔒</div>
        <h2 style={s.restrictedTitle}>Área restrita</h2>
        <p style={s.restrictedSub}>Esta aba é exclusiva para administradores.</p>
      </div>
    );
  }

  return <AdminLogInView />;
}

function AdminLogInView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLogins();
      setItems(data);
    } catch {
      toast.error('Erro ao carregar credenciais');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(item) {
    if (!window.confirm(`Excluir credencial "${item.plataforma}"?`)) return;
    try {
      await deleteLogin(item._id);
      toast.success('Credencial excluída');
      load();
    } catch {
      toast.error('Erro ao excluir');
    }
  }

  function handleEdit(item) { setEditing(item); setShowModal(true); }
  function handleNew() { setEditing(null); setShowModal(true); }
  function handleClose() { setShowModal(false); setEditing(null); }
  function handleSaved() { handleClose(); load(); }

  // Categorias únicas para o filtro
  const categorias = [...new Set(items.map((i) => i.categoria).filter(Boolean))].sort();

  const filtered = items.filter((i) => {
    const matchSearch =
      !search ||
      i.plataforma.toLowerCase().includes(search.toLowerCase()) ||
      i.emailUsuario.toLowerCase().includes(search.toLowerCase()) ||
      i.obs.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || i.categoria === filterCat;
    return matchSearch && matchCat;
  });

  // Agrupar por categoria para exibição
  const groups = {};
  filtered.forEach((i) => {
    const cat = i.categoria || 'Sem categoria';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(i);
  });
  const groupKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'Sem categoria') return 1;
    if (b === 'Sem categoria') return -1;
    return a.localeCompare(b);
  });

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.topBar}>
        <div>
          <h1 style={s.pageTitle}>Log In</h1>
          <p style={s.pageSub}>Credenciais das plataformas utilizadas pela equipe</p>
        </div>
        <button style={s.addBtn} onClick={handleNew}>+ Adicionar</button>
      </div>

      {/* Filtros */}
      <div style={s.filters}>
        <input
          style={s.searchInput}
          placeholder="Buscar plataforma..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={s.filterSelect}
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {(search || filterCat) && (
          <button style={s.clearBtn} onClick={() => { setSearch(''); setFilterCat(''); }}>
            Limpar
          </button>
        )}
        <span style={s.countLabel}>{filtered.length} credencial{filtered.length !== 1 ? 'is' : ''}</span>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <p style={s.muted}>Carregando...</p>
      ) : items.length === 0 ? (
        <div style={s.emptyState}>
          <p style={s.emptyTitle}>Nenhuma credencial cadastrada</p>
          <p style={s.muted}>Adicione as plataformas que a equipe utiliza.</p>
          <button style={s.addBtn} onClick={handleNew}>+ Adicionar</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={s.emptyState}>
          <p style={s.emptyTitle}>Nenhum resultado encontrado</p>
        </div>
      ) : (
        groupKeys.map((cat) => (
          <div key={cat} style={s.group}>
            <div style={s.groupHeader}>{cat}</div>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Plataforma</th>
                    <th style={s.th}>E-mail / Usuário</th>
                    <th style={s.th}>Senha</th>
                    <th style={s.th}>Observações</th>
                    <th style={s.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {groups[cat].map((item) => (
                    <CredentialRow
                      key={item._id}
                      item={item}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {showModal && (
        <CredentialModal
          item={editing}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

const s = {
  page: {
    padding: '28px 32px',
    maxWidth: 1200,
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  topBar: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
    flexWrap: 'wrap',
  },
  pageTitle: { fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 },
  pageSub: { fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' },
  addBtn: {
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  filters: {
    display: 'flex',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchInput: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    padding: '8px 14px',
    fontSize: 13,
    flex: 1,
    minWidth: 200,
    outline: 'none',
  },
  filterSelect: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: 13,
    cursor: 'pointer',
    outline: 'none',
  },
  clearBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-muted)',
    padding: '8px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },
  countLabel: { fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 },
  group: { marginBottom: 28 },
  groupHeader: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: '1px solid var(--border)',
    paddingBottom: 6,
    marginBottom: 0,
  },
  tableWrap: {
    overflowX: 'auto',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderTop: 'none',
    borderRadius: '0 0 var(--radius) var(--radius)',
    boxShadow: 'var(--shadow)',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textAlign: 'left',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-card)',
    whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.1s' },
  td: { padding: '10px 14px', fontSize: 13, color: 'var(--text)', verticalAlign: 'middle' },
  tdPlat: { padding: '10px 14px', fontSize: 13, color: 'var(--text)', verticalAlign: 'middle', minWidth: 140 },
  tdObs: { padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)', verticalAlign: 'middle', maxWidth: 260 },
  tdActions: { padding: '10px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'right' },
  platName: { fontWeight: 600, color: 'var(--text)' },
  catBadge: {
    marginLeft: 8,
    fontSize: 10,
    background: 'rgba(168,3,3,0.1)',
    color: 'var(--primary)',
    border: '1px solid rgba(168,3,3,0.25)',
    borderRadius: 10,
    padding: '1px 7px',
    fontWeight: 600,
  },
  monoText: { fontFamily: 'monospace', fontSize: 12 },
  obsText: { fontSize: 12, wordBreak: 'break-word' },
  empty: { color: 'var(--text-muted)', fontSize: 12 },
  copyWrap: { display: 'flex', alignItems: 'center', gap: 6 },
  copyBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text-muted)',
    padding: '2px 8px',
    fontSize: 11,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  eyeSmall: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    padding: '0 2px',
  },
  editBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text-muted)',
    padding: '3px 10px',
    fontSize: 12,
    cursor: 'pointer',
    marginRight: 6,
  },
  deleteBtn: {
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 4,
    color: 'var(--primary)',
    padding: '3px 10px',
    fontSize: 12,
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 },
  muted: { color: 'var(--text-muted)', fontSize: 13, margin: 0 },
  // Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.72)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    width: '100%',
    maxWidth: 520,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', padding: 4 },
  modalBody: { padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' },
  input: {
    background: 'var(--bg-card2, var(--bg-card))',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  eyeBtn: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    padding: 0,
  },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    borderRadius: 6,
    padding: '9px 20px',
    fontSize: 14,
    cursor: 'pointer',
  },
  saveBtn: {
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '9px 22px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Restricted
  restricted: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
    gap: 10,
  },
  restrictedIcon: { fontSize: 48 },
  restrictedTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 },
  restrictedSub: { fontSize: 14, color: 'var(--text-muted)', margin: 0 },
};

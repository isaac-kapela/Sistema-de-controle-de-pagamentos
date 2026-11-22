import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  getImportantContacts,
  createImportantContact,
  updateImportantContact,
  deleteImportantContact,
} from '../services/api';

const DEFAULT_CATEGORIES = [
  'Patrocinador',
  'Fornecedor',
  'UFJF / Acadêmico',
  'Parceria',
  'Apoio Técnico',
  'Mentor / Consultor',
  'Geral',
];

const EMPTY_FORM = {
  nome: '',
  contato: '',
  email: '',
  organizacao: '',
  funcao: '',
  categoria: 'Geral',
  obs: '',
  responsavel: '',
};

function formatPhoneLink(contactStr) {
  if (!contactStr) return null;
  const digits = contactStr.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 13) {
    // Format for WhatsApp: if no country code, prepend 55
    const fullNumber = digits.length <= 11 ? `55${digits}` : digits;
    return `https://wa.me/${fullNumber}`;
  }
  return null;
}

// ── Modal de Criação / Edição ─────────────────────────────────
function ContactModal({ item, onClose, onSaved, existingCategories = [], existingOrgs = [] }) {
  const [form, setForm] = useState(item ? { ...item } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error('Nome do contato é obrigatório');
      return;
    }
    if (!form.contato.trim()) {
      toast.error('Contato (telefone/WhatsApp/e-mail) é obrigatório');
      return;
    }
    if (!form.organizacao.trim()) {
      toast.error('Organização / Empresa é obrigatória');
      return;
    }
    if (!form.funcao.trim()) {
      toast.error('Função / Cargo é obrigatório');
      return;
    }

    setSaving(true);
    try {
      if (item) {
        await updateImportantContact(item._id, form);
        toast.success('Contato atualizado com sucesso');
      } else {
        await createImportantContact(form);
        toast.success('Contato cadastrado com sucesso');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar contato');
    } finally {
      setSaving(false);
    }
  }

  const categoryOptions = useMemo(() => {
    const set = new Set([...DEFAULT_CATEGORIES, ...existingCategories]);
    return Array.from(set);
  }, [existingCategories]);

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div>
            <div style={s.modalSubTitle}>
              {item ? 'EDITAR CONTATO' : 'NOVO REGISTRO'}
            </div>
            <h2 style={s.modalTitle}>
              {item ? 'Editar Contato Importante' : 'Cadastrar Contato Importante'}
            </h2>
          </div>
          <button onClick={onClose} style={s.closeBtn}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={s.modalBody}>
          <div style={s.formGrid2}>
            <label style={s.label}>
              Nome do Contato *
              <input
                style={s.input}
                value={form.nome}
                onChange={(e) => setField('nome', e.target.value)}
                placeholder="Ex: Carlos Silva, Profa. Mariana..."
                autoFocus
                required
              />
            </label>

            <label style={s.label}>
              Organização / Empresa / Instituição *
              <input
                list="org-suggestions"
                style={s.input}
                value={form.organizacao}
                onChange={(e) => setField('organizacao', e.target.value)}
                placeholder="Ex: UFJF, RoboCore, ArcelorMittal, LabFab..."
                required
              />
              <datalist id="org-suggestions">
                {existingOrgs.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </label>
          </div>

          <div style={s.formGrid2}>
            <label style={s.label}>
              Função / Cargo / Papel *
              <input
                style={s.input}
                value={form.funcao}
                onChange={(e) => setField('funcao', e.target.value)}
                placeholder="Ex: Diretor de Parcerias, Prof. Orientador, Vendedor Técnico..."
                required
              />
            </label>

            <label style={s.label}>
              Categoria
              <input
                list="category-suggestions"
                style={s.input}
                value={form.categoria}
                onChange={(e) => setField('categoria', e.target.value)}
                placeholder="Ex: Patrocinador, Fornecedor..."
              />
              <datalist id="category-suggestions">
                {categoryOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
          </div>

          <div style={s.formGrid2}>
            <label style={s.label}>
              Contato (Telefone / WhatsApp / Celular) *
              <input
                style={s.input}
                value={form.contato}
                onChange={(e) => setField('contato', e.target.value)}
                placeholder="Ex: (32) 99999-8888 ou telefone comercial"
                required
              />
            </label>

            <label style={s.label}>
              E-mail (Opcional)
              <input
                type="email"
                style={s.input}
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="email@organizacao.com.br"
              />
            </label>
          </div>

          <label style={s.label}>
            Membro Responsável / Ponte (Opcional)
            <input
              style={s.input}
              value={form.responsavel}
              onChange={(e) => setField('responsavel', e.target.value)}
              placeholder="Quem na equipe mantém a relação com este contato"
            />
          </label>

          <label style={s.label}>
            Observações / Notas Importantes
            <textarea
              style={{ ...s.input, minHeight: 85, resize: 'vertical' }}
              value={form.obs}
              onChange={(e) => setField('obs', e.target.value)}
              placeholder="Horários preferenciais de atendimento, histórico de reuniões, condições especiais de patrocínio, descontos etc..."
            />
          </label>

          <div style={s.modalFooter}>
            <button type="button" style={s.cancelBtn} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" style={s.saveBtn} disabled={saving}>
              {saving ? 'Salvando...' : item ? 'Salvar Alterações' : 'Cadastrar Contato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal de Confirmação de Exclusão ─────────────────────────
function DeleteModal({ item, onClose, onConfirm, deleting }) {
  if (!item) return null;
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h2 style={{ ...s.modalTitle, color: '#ef4444' }}>Excluir Contato</h2>
          <button onClick={onClose} style={s.closeBtn}>
            ✕
          </button>
        </div>
        <div style={{ padding: '16px 20px', fontSize: 14, color: 'var(--text)' }}>
          Tem certeza que deseja remover o contato de <strong>{item.nome}</strong> (
          {item.organizacao})? Esta ação não pode ser desfeita.
        </div>
        <div style={s.modalFooter}>
          <button type="button" style={s.cancelBtn} onClick={onClose} disabled={deleting}>
            Cancelar
          </button>
          <button
            type="button"
            style={{ ...s.saveBtn, background: '#ef4444', borderColor: '#ef4444' }}
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────
export default function ImportantContactsPage() {
  const { isAdmin } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [organizacoes, setOrganizacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');

  const [modalItem, setModalItem] = useState(null); // null = fechado, {} = novo, obj = editar
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getImportantContacts({
        search: search.trim() || undefined,
        categoria: selectedCategory || undefined,
        organizacao: selectedOrg || undefined,
      });
      setContacts(res.contacts || []);
      setCategorias(res.categorias || []);
      setOrganizacoes(res.organizacoes || []);
    } catch {
      toast.error('Erro ao carregar contatos');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedOrg]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchContacts]);

  function handleCopy(text, label) {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} copiado!`))
      .catch(() => toast.error('Falha ao copiar'));
  }

  function handleCopyFull(c) {
    const text = [
      `Nome: ${c.nome}`,
      `Organização: ${c.organizacao}`,
      `Função: ${c.funcao}`,
      `Contato: ${c.contato}`,
      c.email ? `E-mail: ${c.email}` : null,
      c.categoria ? `Categoria: ${c.categoria}` : null,
      c.responsavel ? `Responsável Interno: ${c.responsavel}` : null,
      c.obs ? `Observações: ${c.obs}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`Dados de ${c.nome} copiados!`))
      .catch(() => toast.error('Falha ao copiar'));
  }

  async function handleDeleteConfirm() {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await deleteImportantContact(deleteItem._id);
      toast.success('Contato removido');
      setDeleteItem(null);
      fetchContacts();
    } catch {
      toast.error('Erro ao excluir contato');
    } finally {
      setDeleting(false);
    }
  }

  // Estatísticas rápidas
  const totalContatos = contacts.length;
  const orgsCount = useMemo(() => {
    return new Set(contacts.map((c) => c.organizacao).filter(Boolean)).size;
  }, [contacts]);

  return (
    <div style={s.container}>
      {/* Top Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Contatos Importantes</h2>
          <p style={s.subtitle}>
            Diretório centralizado de patrocinadores, fornecedores, parceiros, professores e
            contatos estratégicos da Microraptor.
          </p>
        </div>
        <div>
          <button style={s.primaryBtn} onClick={() => setModalItem({})}>
            + Adicionar Contato
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total de Contatos</div>
          <div style={s.statVal}>{totalContatos}</div>
          <div style={s.statDesc}>Registros disponíveis</div>
        </div>

        <div style={s.statCard}>
          <div style={s.statLabel}>Organizações / Empresas</div>
          <div style={s.statVal}>{orgsCount}</div>
          <div style={s.statDesc}>Entidades cadastradas</div>
        </div>

        <div style={s.statCard}>
          <div style={s.statLabel}>Categorias Ativas</div>
          <div style={s.statVal}>{categorias.length || 0}</div>
          <div style={s.statDesc}>Segmentações mapeadas</div>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div style={s.filterCard}>
        <div style={s.filterRow}>
          <div style={s.searchWrapper}>
            <input
              style={s.searchInput}
              placeholder="Buscar por nome, organização, função, telefone, observações..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button style={s.clearBtn} onClick={() => setSearch('')}>
                ✕
              </button>
            )}
          </div>

          <div style={s.selectWrapper}>
            <select
              style={s.select}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Todas as Categorias</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div style={s.selectWrapper}>
            <select
              style={s.select}
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
            >
              <option value="">Todas as Organizações</option>
              {organizacoes.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div style={s.pillBar}>
          <button
            style={{
              ...s.pillBtn,
              ...(selectedCategory === '' ? s.pillBtnActive : {}),
            }}
            onClick={() => setSelectedCategory('')}
          >
            Todas
          </button>
          {categorias.map((cat) => (
            <button
              key={cat}
              style={{
                ...s.pillBtn,
                ...(selectedCategory === cat ? s.pillBtnActive : {}),
              }}
              onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo / Lista de Contatos */}
      {loading ? (
        <div style={s.centerBox}>
          <div style={s.spinner} />
          <span style={{ color: 'var(--text-muted)', marginTop: 12 }}>Carregando contatos...</span>
        </div>
      ) : contacts.length === 0 ? (
        <div style={s.emptyCard}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            Nenhum contato encontrado
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            {search || selectedCategory || selectedOrg
              ? 'Tente ajustar os filtros de busca para encontrar o registro.'
              : 'Comece adicionando o primeiro contato importante da equipe.'}
          </div>
          <button style={s.primaryBtn} onClick={() => setModalItem({})}>
            + Adicionar Contato
          </button>
        </div>
      ) : (
        <>
          {/* Tabela Desktop */}
          <div className="payment-table-desktop">
            <table style={s.table}>
              <thead>
                <tr style={s.theadRow}>
                  <th style={s.th}>Nome</th>
                  <th style={s.th}>Organização & Função</th>
                  <th style={s.th}>Contato / Canais</th>
                  <th style={s.th}>Categoria</th>
                  <th style={s.th}>Observações</th>
                  <th style={s.th}>Responsável</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => {
                  const waLink = formatPhoneLink(c.contato);
                  return (
                    <tr key={c._id} style={s.tr}>
                      <td style={{ ...s.td, minWidth: 160 }}>
                        <div style={s.nameTitle}>{c.nome}</div>
                      </td>

                      <td style={{ ...s.td, minWidth: 200 }}>
                        <div style={s.orgName}>{c.organizacao}</div>
                        <div style={s.roleName}>{c.funcao}</div>
                      </td>

                      <td style={{ ...s.td, minWidth: 180 }}>
                        <div style={s.contactRow}>
                          <span style={s.contactVal}>{c.contato}</span>
                          <button
                            title="Copiar contato"
                            style={s.iconBtn}
                            onClick={() => handleCopy(c.contato, 'Telefone/Contato')}
                          >
                            Copiar
                          </button>
                        </div>
                        {waLink && (
                          <div style={{ marginTop: 3 }}>
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={s.waLink}
                            >
                              Abrir no WhatsApp &rarr;
                            </a>
                          </div>
                        )}
                        {c.email && (
                          <div style={{ ...s.contactRow, marginTop: 4 }}>
                            <a href={`mailto:${c.email}`} style={s.emailLink}>
                              {c.email}
                            </a>
                            <button
                              title="Copiar e-mail"
                              style={s.iconBtn}
                              onClick={() => handleCopy(c.email, 'E-mail')}
                            >
                              Copiar
                            </button>
                          </div>
                        )}
                      </td>

                      <td style={s.td}>
                        <span style={s.catBadge}>{c.categoria || 'Geral'}</span>
                      </td>

                      <td style={{ ...s.td, maxWidth: 260 }}>
                        {c.obs ? (
                          <div style={s.obsBox} title={c.obs}>
                            {c.obs}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>

                      <td style={s.td}>
                        <span style={{ fontSize: 12, color: 'var(--text)' }}>
                          {c.responsavel || '—'}
                        </span>
                      </td>

                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <div style={s.actionsRow}>
                          <button
                            title="Copiar todos os dados"
                            style={s.actionBtn}
                            onClick={() => handleCopyFull(c)}
                          >
                            Copiar
                          </button>
                          <button
                            title="Editar contato"
                            style={s.actionBtn}
                            onClick={() => setModalItem(c)}
                          >
                            Editar
                          </button>
                          <button
                            title="Excluir contato"
                            style={{ ...s.actionBtn, color: '#ef4444' }}
                            onClick={() => setDeleteItem(c)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards Mobile */}
          <div className="payment-cards-mobile">
            {contacts.map((c) => {
              const waLink = formatPhoneLink(c.contato);
              return (
                <div key={c._id} style={s.mobileCard}>
                  <div style={s.mCardTop}>
                    <div>
                      <span style={s.catBadge}>{c.categoria || 'Geral'}</span>
                    </div>
                    <div style={s.actionsRow}>
                      <button style={s.actionBtn} onClick={() => setModalItem(c)}>
                        Editar
                      </button>
                      <button
                        style={{ ...s.actionBtn, color: '#ef4444' }}
                        onClick={() => setDeleteItem(c)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>

                  <div style={s.mCardTitle}>{c.nome}</div>

                  <div style={s.mCardOrg}>
                    <strong>{c.organizacao}</strong> • {c.funcao}
                  </div>

                  <div style={s.mCardMeta}>
                    <div style={s.mMetaRow}>
                      <span style={s.mLabel}>Contato: </span>
                      <span style={s.mVal}>{c.contato}</span>
                      <button
                        style={s.iconBtn}
                        onClick={() => handleCopy(c.contato, 'Telefone/Contato')}
                      >
                        Copiar
                      </button>
                    </div>

                    {waLink && (
                      <div style={{ marginTop: 2, marginBottom: 4 }}>
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={s.waLink}
                        >
                          Abrir no WhatsApp &rarr;
                        </a>
                      </div>
                    )}

                    {c.email && (
                      <div style={s.mMetaRow}>
                        <span style={s.mLabel}>E-mail: </span>
                        <a href={`mailto:${c.email}`} style={s.emailLink}>
                          {c.email}
                        </a>
                        <button style={s.iconBtn} onClick={() => handleCopy(c.email, 'E-mail')}>
                          Copiar
                        </button>
                      </div>
                    )}

                    {c.responsavel && (
                      <div style={s.mMetaRow}>
                        <span style={s.mLabel}>Responsável: </span>
                        <span style={s.mVal}>{c.responsavel}</span>
                      </div>
                    )}

                    {c.obs && (
                      <div style={{ marginTop: 6, ...s.obsBoxMobile }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Obs: </span>
                        {c.obs}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 10, textAlign: 'right' }}>
                    <button style={s.actionBtn} onClick={() => handleCopyFull(c)}>
                      Copiar todos os dados
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modais */}
      {modalItem && (
        <ContactModal
          item={modalItem._id ? modalItem : null}
          existingCategories={categorias}
          existingOrs={organizacoes}
          onClose={() => setModalItem(null)}
          onSaved={() => {
            setModalItem(null);
            fetchContacts();
          }}
        />
      )}

      {deleteItem && (
        <DeleteModal
          item={deleteItem}
          deleting={deleting}
          onClose={() => setDeleteItem(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────
const s = {
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '24px 16px 60px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginTop: 4,
    maxWidth: 600,
    lineHeight: 1.4,
  },
  primaryBtn: {
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    padding: '9px 18px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
    whiteSpace: 'nowrap',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '14px 16px',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  statVal: {
    fontSize: 22,
    fontWeight: 800,
    color: 'var(--text)',
    marginTop: 4,
  },
  statDesc: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  filterCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '14px 16px',
    marginBottom: 20,
  },
  filterRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchWrapper: {
    position: 'relative',
    flex: '1 1 280px',
  },
  searchInput: {
    width: '100%',
    background: 'var(--bg-card2, #1f1f1f)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    padding: '8px 32px 8px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  },
  clearBtn: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 12,
    padding: 4,
  },
  selectWrapper: {
    flex: '0 0 auto',
    minWidth: 180,
  },
  select: {
    width: '100%',
    background: 'var(--bg-card2, #1f1f1f)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    padding: '8px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  pillBar: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingTop: 12,
    marginTop: 12,
    borderTop: '1px solid var(--border)',
    scrollbarWidth: 'none',
  },
  pillBtn: {
    background: 'var(--bg-card2, #1f1f1f)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    padding: '5px 12px',
    borderRadius: 16,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  pillBtnActive: {
    background: 'var(--primary)',
    borderColor: 'var(--primary)',
    color: '#fff',
    fontWeight: 600,
  },
  centerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid var(--border)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  emptyCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '48px 24px',
    textAlign: 'center',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  theadRow: {
    background: 'var(--bg-card2, #1a1a1a)',
    borderBottom: '1px solid var(--border)',
  },
  th: {
    padding: '12px 14px',
    color: 'var(--text-muted)',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.15s',
  },
  td: {
    padding: '12px 14px',
    verticalAlign: 'middle',
  },
  nameTitle: {
    fontWeight: 700,
    color: 'var(--text)',
    fontSize: 14,
  },
  orgName: {
    fontWeight: 600,
    color: 'var(--text)',
    fontSize: 13,
  },
  roleName: {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  contactRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  contactVal: {
    fontSize: 13,
    color: 'var(--text)',
    fontWeight: 500,
  },
  iconBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    borderRadius: 4,
    padding: '2px 6px',
    fontSize: 10,
    cursor: 'pointer',
  },
  waLink: {
    fontSize: 11,
    color: '#22c55e',
    textDecoration: 'none',
    fontWeight: 500,
  },
  emailLink: {
    fontSize: 12,
    color: '#38bdf8',
    textDecoration: 'none',
  },
  catBadge: {
    background: 'rgba(56,189,248,0.12)',
    color: '#38bdf8',
    border: '1px solid rgba(56,189,248,0.3)',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 600,
    display: 'inline-block',
    whiteSpace: 'nowrap',
  },
  obsBox: {
    fontSize: 12,
    color: 'var(--text-muted)',
    lineHeight: 1.4,
    maxHeight: 48,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  obsBoxMobile: {
    fontSize: 12,
    color: 'var(--text)',
    background: 'var(--bg-card2, #1f1f1f)',
    padding: '6px 10px',
    borderRadius: 4,
    lineHeight: 1.4,
  },
  actionsRow: {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    background: 'var(--bg-card-alt, #262626)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: 'var(--radius)',
    padding: '4px 9px',
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  mobileCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '14px 16px',
    marginBottom: 12,
  },
  mCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mCardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text)',
  },
  mCardOrg: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginTop: 2,
    marginBottom: 10,
  },
  mCardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 13,
  },
  mMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  mLabel: {
    color: 'var(--text-muted)',
    fontSize: 12,
  },
  mVal: {
    color: 'var(--text)',
    fontWeight: 500,
    fontSize: 12,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: 'var(--bg-card, #171717)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius, 8px)',
    width: '100%',
    maxWidth: 620,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
  },
  modalSubTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--primary)',
    letterSpacing: '0.05em',
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 16,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  modalBody: {
    padding: '16px 20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  formGrid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  input: {
    background: 'var(--bg-card2, #1f1f1f)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    padding: '8px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    padding: '16px 20px',
    borderTop: '1px solid var(--border)',
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: 'var(--radius)',
    padding: '8px 16px',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  },
  saveBtn: {
    background: 'var(--primary)',
    border: '1px solid var(--primary)',
    color: '#fff',
    borderRadius: 'var(--radius)',
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

import React, { useState, useEffect, useCallback } from 'react';
import { getMembers, deleteMember, updateMember } from '../services/api';
import toast from 'react-hot-toast';

function fmt(val) { return val || '—'; }
function fmtDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('pt-BR');
}

// Colunas publicas: nome, area, curso, empresa (ex), entrada, saida
// Colunas admin: tudo acima + CPF + celular + acoes

export default function MemberList({ isAdmin, reloadKey, onEdit }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMember, setViewMember] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMembers(search);
      setMembers(data);
    } catch {
      toast.error('Erro ao carregar membros');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (reloadKey > 0) load(); }, [reloadKey]);

  const handleDelete = async (m) => {
    if (!window.confirm(`Remover ${m.nome}?`)) return;
    try {
      await deleteMember(m._id);
      toast.success('Membro removido');
      load();
    } catch {
      toast.error('Erro ao remover membro');
    }
  };

  const handleEdit = (m) => { if (onEdit) onEdit(m); };

  const handleDeactivate = async (m) => {
    if (!window.confirm(`Marcar ${m.nome} como ex-membro da equipe?`)) return;
    const saida = window.prompt('Saiu da Microraptor (Mês/Ano) — ex: 03/2024\nDeixe em branco para preencher depois:') ?? '';
    try {
      await updateMember(m._id, { tipoMembro: 'ex-membro', ...(saida.trim() && { saidaMicro: saida.trim() }) });
      toast.success(`${m.nome} marcado como ex-membro`);
      load();
    } catch {
      toast.error('Erro ao atualizar membro');
    }
  };

  // Cabeçalhos da tabela: publicos + extras admin
  const headers = isAdmin
    ? ['Nome', 'Area', 'Curso', 'Entrou', 'Saiu', 'Empresa', 'CPF', 'Celular', '']
    : ['Nome', 'Area', 'Curso', 'Entrou na Micro', 'Saiu da Micro', 'Empresa'];

  return (
    <div>
      <div style={s.toolbar}>
        <input
          style={s.search}
          placeholder="Buscar por nome, area, curso..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {!isAdmin && (
          <span style={s.publicNote}>Informacoes publicas da equipe Microraptor</span>
        )}
      </div>

      {loading && (
        <div style={s.center}>
          <div style={s.spinner} />
          <span style={{ color: 'var(--text-muted)', marginTop: 12 }}>Carregando...</span>
        </div>
      )}

      {!loading && members.length === 0 && (
        <div style={s.empty}>
          {search ? 'Nenhum membro encontrado.' : 'Nenhum membro cadastrado.'}
        </div>
      )}

      {!loading && members.length > 0 && (
        <>
          {/* Desktop */}
          <div className="payment-table-desktop">
            <table style={s.table}>
              <thead>
                <tr>
                  {headers.map((h) => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m._id} style={s.tr} onClick={() => setViewMember(m)}>
                    <td style={s.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={s.name}>{m.nome}</span>
                        {m.tipoMembro === 'ex-membro'
                          ? <span style={s.badgeEx}>Ex-membro</span>
                          : <span style={s.badgeAtivo}>Ativo</span>
                        }
                      </div>
                    </td>
                    <td style={s.td}>{fmt(m.area)}</td>
                    <td style={s.td}>{fmt(m.curso)}</td>
                    <td style={s.td}>{fmt(m.entradaMicro)}</td>
                    <td style={s.td}>{m.tipoMembro === 'ex-membro' ? fmt(m.saidaMicro) : '—'}</td>
                    <td style={s.td}>{m.tipoMembro === 'ex-membro' && m.trabalhando ? fmt(m.empresa) : '—'}</td>
                    {isAdmin && (
                      <>
                        <td style={s.td}>{fmt(m.cpf)}</td>
                        <td style={s.td}>{fmt(m.numeroCelular)}</td>
                        <td style={s.td} onClick={(e) => e.stopPropagation()}>
                          <div style={s.actions}>
                            <button style={s.editBtn} onClick={() => handleEdit(m)}>Editar</button>
                            {m.tipoMembro === 'membro' && (
                              <button style={s.exitBtn} onClick={() => handleDeactivate(m)}>Saiu</button>
                            )}
                            <button style={s.delBtn} onClick={() => handleDelete(m)}>Remover</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="payment-cards-mobile">
            {members.map((m) => (
              <div key={m._id} style={s.card} onClick={() => setViewMember(m)}>
                <div style={s.cardHeader}>
                  <span style={s.cardName}>{m.nome}</span>
                  {m.tipoMembro === 'ex-membro'
                    ? <span style={s.badgeEx}>Ex-membro</span>
                    : <span style={s.badgeAtivo}>Ativo</span>
                  }
                </div>
                <div style={s.cardRow}><span style={s.cardLabel}>Area</span><span>{fmt(m.area)}</span></div>
                <div style={s.cardRow}><span style={s.cardLabel}>Curso</span><span>{fmt(m.curso)}</span></div>
                <div style={s.cardRow}><span style={s.cardLabel}>Entrou</span><span>{fmt(m.entradaMicro)}</span></div>
                {m.tipoMembro === 'ex-membro' && (
                  <div style={s.cardRow}><span style={s.cardLabel}>Saiu</span><span>{fmt(m.saidaMicro)}</span></div>
                )}
                {m.tipoMembro === 'ex-membro' && m.trabalhando && (
                  <div style={s.cardRow}><span style={s.cardLabel}>Empresa</span><span>{fmt(m.empresa)}</span></div>
                )}
                {isAdmin && (
                  <div style={s.cardActions} onClick={(e) => e.stopPropagation()}>
                    <button style={s.editBtn} onClick={() => handleEdit(m)}>Editar</button>
                    {m.tipoMembro === 'membro' && (
                      <button style={s.exitBtn} onClick={() => handleDeactivate(m)}>Saiu da equipe</button>
                    )}
                    <button style={s.delBtn} onClick={() => handleDelete(m)}>Remover</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {viewMember && (
        <MemberDetail
          member={viewMember}
          isAdmin={isAdmin}
          onClose={() => setViewMember(null)}
          onEdit={() => { handleEdit(viewMember); setViewMember(null); }}
          onDeactivate={() => { handleDeactivate(viewMember); setViewMember(null); }}
        />
      )}
    </div>
  );
}

function MemberDetail({ member: m, isAdmin, onClose, onEdit, onDeactivate }) {
  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.detailModal}>
        <div style={s.detailHeader}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={s.detailName}>{m.nome}</h2>
              {m.tipoMembro === 'ex-membro'
                ? <span style={s.badgeEx}>Ex-membro</span>
                : <span style={s.badgeAtivo}>Membro Ativo</span>
              }
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {fmt(m.area)}{m.curso ? ` · ${m.curso}` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isAdmin && <button style={s.editBtn} onClick={onEdit}>Editar</button>}
            {isAdmin && m.tipoMembro === 'membro' && (
              <button style={s.exitBtn} onClick={onDeactivate}>Saiu da equipe</button>
            )}
            <button onClick={onClose} style={s.closeBtn}>✕</button>
          </div>
        </div>

        <div style={s.detailBody}>

          {/* ── Informacoes publicas ── */}
          <DetailSection title="Microraptor">
            <DetailRow label="Area" value={m.area} />
            <DetailRow label="Curso" value={m.curso} />
            <DetailRow label="Entrou na Micro" value={m.entradaMicro} />
            {m.tipoMembro === 'ex-membro' && <DetailRow label="Saiu da Micro" value={m.saidaMicro} />}
            {m.tipoMembro === 'ex-membro' && m.trabalhando && (
              <DetailRow label="Empresa atual" value={m.empresa} />
            )}
          </DetailSection>

          {/* ── Restante: apenas admin ── */}
          {isAdmin ? (
            <>
              <DetailSection title="Dados Pessoais">
                <DetailRow label="CPF" value={m.cpf} />
                <DetailRow label="E-mail" value={m.email} />
                <DetailRow label="Sexo" value={{ M: 'Masculino', F: 'Feminino', Outro: 'Outro' }[m.sexo] || '—'} />
                <DetailRow label="Data de Nascimento" value={fmtDate(m.dataNascimento)} />
                <DetailRow label="Tipo Sanguineo" value={m.tipoSanguineo} />
                <DetailRow label="Cidade Natal" value={m.cidadeNatal} />
              </DetailSection>

              <DetailSection title="Endereco">
                <DetailRow label="Endereco" value={m.endereco} />
                <DetailRow label="Bairro" value={m.bairro} />
                <DetailRow label="Cidade" value={m.cidade} />
                <DetailRow label="UF" value={m.uf} />
                <DetailRow label="CEP" value={m.cep} />
              </DetailSection>

              {m.tipoMembro === 'membro' && (
                <DetailSection title="Familia">
                  <DetailRow label="Nome do Pai" value={m.nomePai} />
                  <DetailRow label="Nome da Mae" value={m.nomeMae} />
                </DetailSection>
              )}

              <DetailSection title="Academico">
                <DetailRow label="Matricula" value={m.numeroMatricula} />
                <DetailRow label="Ingresso na Faculdade" value={m.ingressoFaculdade} />
                <DetailRow label="Previsao de Formatura" value={m.previsaoFormatura} />
              </DetailSection>

              {m.tipoMembro === 'membro' && (
                <DetailSection title="Documentos">
                  <DetailRow label="RG" value={m.rg} />
                  <DetailRow label="Orgao Expedidor" value={m.orgaoExpedidor} />
                  <DetailRow label="Data de Emissao" value={fmtDate(m.dataEmissaoRG)} />
                </DetailSection>
              )}

              <DetailSection title="Contatos">
                <DetailRow label="Celular" value={m.numeroCelular} />
                <DetailRow label="Telefone Fixo" value={m.telefoneFixo} />
              </DetailSection>

              {m.tipoMembro === 'membro' && (
                <DetailSection title="Saude">
                  <DetailRow label="Alergias" value={m.alergias} />
                  <DetailRow label="Problemas de Saude" value={m.problemasSaude} />
                  <DetailRow label="Plano de Saude" value={m.temPlanoSaude ? 'Sim' : 'Nao'} />
                  {m.temPlanoSaude && <DetailRow label="Nome do Plano" value={m.nomePlanoSaude} />}
                </DetailSection>
              )}
            </>
          ) : (
            <div style={s.privateNote}>
              Demais informacoes acessiveis apenas pela gestao e capitania da Microraptor.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <div style={s.detailSection}>
      <div style={s.detailSectionTitle}>{title}</div>
      <div style={s.detailGrid}>{children}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={s.detailRow}>
      <span style={s.detailLabel}>{label}</span>
      <span style={s.detailValue}>{value || '—'}</span>
    </div>
  );
}

const s = {
  toolbar: {
    display: 'flex', gap: 12, marginBottom: 20,
    alignItems: 'center', flexWrap: 'wrap',
  },
  search: {
    flex: 1, minWidth: 200,
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    color: 'var(--text)', borderRadius: 8, padding: '9px 14px', fontSize: 14,
  },
  publicNote: {
    fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic',
  },
  center: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', minHeight: 200,
  },
  spinner: {
    width: 32, height: 32,
    border: '3px solid var(--border)', borderTop: '3px solid #a80303',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  empty: { textAlign: 'center', color: 'var(--text-muted)', padding: '48px 24px', fontSize: 15 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
    padding: '10px 12px', borderBottom: '1px solid var(--border)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  tr: { borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.12s' },
  td: { padding: '12px 12px', fontSize: 14, verticalAlign: 'middle' },
  name: { fontWeight: 600 },
  actions: { display: 'flex', gap: 6 },
  editBtn: {
    background: 'transparent', color: 'var(--primary)',
    border: '1px solid var(--primary)', padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
  },
  delBtn: {
    background: 'transparent', color: 'var(--danger)',
    border: '1px solid var(--danger)', padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
  },
  exitBtn: {
    background: 'transparent', color: '#d97706',
    border: '1px solid #d97706', padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
  },
  closeBtn: {
    background: 'transparent', color: 'var(--text-muted)',
    fontSize: 18, padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
  },
  badgeEx: { background: '#6366f1', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4 },
  badgeAtivo: { background: 'var(--success)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4 },
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
  },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardName: { fontWeight: 700, fontSize: 15 },
  cardRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 },
  cardLabel: { fontWeight: 600, color: 'var(--text-muted)' },
  cardActions: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    zIndex: 1000, padding: 16, overflowY: 'auto',
  },
  detailModal: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', width: '100%', maxWidth: 680,
    marginTop: 16, marginBottom: 16, boxShadow: 'var(--shadow)',
  },
  detailHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '20px 24px', borderBottom: '1px solid var(--border)', gap: 12,
  },
  detailName: { fontSize: 20, fontWeight: 700, marginBottom: 2 },
  detailBody: { padding: '0 24px 24px' },
  detailSection: { marginTop: 20 },
  detailSectionTitle: {
    fontSize: 12, fontWeight: 700, color: 'var(--primary)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    marginBottom: 10, paddingBottom: 5, borderBottom: '1px solid var(--border)',
  },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px 20px' },
  detailRow: { display: 'flex', flexDirection: 'column', gap: 2 },
  detailLabel: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' },
  detailValue: { fontSize: 14, color: 'var(--text)' },
  privateNote: {
    marginTop: 20, padding: '14px 16px',
    background: 'var(--bg-card2)', border: '1px solid var(--border)',
    borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
  },
};

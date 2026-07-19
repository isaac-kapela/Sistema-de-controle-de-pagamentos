import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  getFeedbackCampaigns,
  getFeedbackStats,
  getFeedbackCampaignStats,
  getFeedbackResponses,
  deleteFeedbackCampaign,
  duplicateFeedbackCampaign,
  archiveFeedbackCampaign,
  toggleFeedbackStatus,
  validateMemberCode,
  generateMemberCode,
  getMembers,
} from '../services/api';
import FeedbackCampaignModal from '../components/FeedbackCampaignModal';
import FeedbackApplyModal from '../components/FeedbackApplyModal';
import { generateMemberFeedbackPdf, generateAllMembersPdf } from '../services/feedbackPdf';

const TIPO_LABELS = {
  'pos-offseason': 'Pós-Offseason',
  'pos-relatorio': 'Pós-Relatório',
  'pos-competicao': 'Pós-Competição',
  outro: 'Outro',
};

const STATUS_COLORS = {
  ativo: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '#22c55e', label: 'Ativo' },
  inativo: { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af', border: '#9ca3af', label: 'Inativo' },
  arquivado: { bg: 'rgba(168,3,3,0.12)', color: '#a80303', border: '#a80303', label: 'Arquivado' },
};

function StatCard({ label, value, sub }) {
  return (
    <div style={s.statCard}>
      <div style={s.statValue}>{value}</div>
      <div style={s.statLabel}>{label}</div>
      {sub && <div style={s.statSub}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div style={s.progressWrap}>
      <div style={{ ...s.progressFill, width: `${Math.min(100, value || 0)}%` }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.inativo;
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        borderRadius: 20,
        padding: '2px 10px',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {cfg.label}
    </span>
  );
}

function TipoBadge({ tipo, tipoCustom }) {
  return (
    <span style={s.tipoBadge}>{TIPO_LABELS[tipo] || tipoCustom || tipo}</span>
  );
}

function CampaignDetailModal({ campaign, onClose, onRefresh }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedAvaliador, setSelectedAvaliador] = useState(null);
  const [avaliadorRespostas, setAvaliadorRespostas] = useState([]);
  const [loadingRespostas, setLoadingRespostas] = useState(false);
  const [membrosComCodigos, setMembrosComCodigos] = useState([]);
  const [generatingCode, setGeneratingCode] = useState(null);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'codes'

  useEffect(() => {
    if (activeTab !== 'codes') return;
    const ids = (campaign.membros || []).map((m) => (typeof m === 'object' ? m._id : m));
    if (!ids.length) return;
    getMembers()
      .then((all) => {
        const inCampaign = all.filter((m) => ids.includes(m._id));
        setMembrosComCodigos(inCampaign);
      })
      .catch(() => toast.error('Erro ao carregar membros'));
  }, [activeTab, campaign.membros]);

  async function handleGerarCodigo(membroId) {
    setGeneratingCode(membroId);
    try {
      const data = await generateMemberCode(membroId);
      setMembrosComCodigos((prev) =>
        prev.map((m) => (m._id === membroId ? { ...m, codigoAcesso: data.codigoAcesso } : m))
      );
      toast.success('Código gerado');
    } catch {
      toast.error('Erro ao gerar código');
    } finally {
      setGeneratingCode(null);
    }
  }

  function handleCopiar(codigo) {
    navigator.clipboard.writeText(codigo).then(() => toast.success('Código copiado'));
  }

  async function handleGerarTodos() {
    const semCodigo = membrosComCodigos.filter((m) => !m.codigoAcesso);
    if (!semCodigo.length) {
      toast('Todos os membros já possuem código');
      return;
    }
    for (const m of semCodigo) {
      await handleGerarCodigo(m._id);
    }
  }

  async function toggleAvaliador(memberId) {
    if (selectedAvaliador === memberId) {
      setSelectedAvaliador(null);
      setAvaliadorRespostas([]);
      return;
    }
    setSelectedAvaliador(memberId);
    setLoadingRespostas(true);
    try {
      const data = await getFeedbackResponses(campaign._id, { avaliadorId: memberId });
      setAvaliadorRespostas(data);
    } catch {
      toast.error('Erro ao carregar respostas');
    } finally {
      setLoadingRespostas(false);
    }
  }

  useEffect(() => {
    getFeedbackCampaignStats(campaign._id)
      .then(setStats)
      .catch(() => toast.error('Erro ao carregar estatísticas'))
      .finally(() => setLoading(false));
  }, [campaign._id]);

  async function downloadPdf(member) {
    setPdfLoading(true);
    try {
      await generateMemberFeedbackPdf(campaign._id, member);
    } catch {
      toast.error('Erro ao gerar PDF');
    } finally {
      setPdfLoading(false);
    }
  }

  async function downloadAllPdfs() {
    if (!stats?.memberAverages?.length) return;
    setPdfLoading(true);
    try {
      await generateAllMembersPdf(campaign, stats.memberAverages.map((m) => m.member));
      toast.success('PDFs gerados com sucesso');
    } catch {
      toast.error('Erro ao gerar PDFs');
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 780 }} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div>
            <h2 style={s.modalTitle}>{campaign.nome}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <TipoBadge tipo={campaign.tipo} tipoCustom={campaign.tipoCustom} />
              <StatusBadge status={campaign.status} />
            </div>
          </div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
          {[
            { key: 'stats', label: 'Estatísticas' },
            { key: 'codes', label: 'Códigos de Acesso' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 700 : 400,
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ ...s.modalBody, padding: 24 }}>
          {activeTab === 'codes' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <p style={s.muted}>
                  Distribua os códigos para os membros. Cada um usa seu código para acessar o feedback.
                </p>
                <button style={s.genBtn} onClick={handleGerarTodos}>
                  Gerar ausentes
                </button>
              </div>
              {membrosComCodigos.length === 0 ? (
                <p style={s.muted}>Nenhum membro nesta campanha.</p>
              ) : (
                membrosComCodigos.map((m) => (
                  <div key={m._id} style={s.codeRow}>
                    <div style={s.codeName}>
                      {m.nome}
                      {m.area && <span style={{ ...s.muted, marginLeft: 6 }}>· {m.area}</span>}
                    </div>
                    {m.codigoAcesso ? (
                      <>
                        <span style={s.codeValue}>{m.codigoAcesso}</span>
                        <button style={s.copyBtn} onClick={() => handleCopiar(m.codigoAcesso)}>
                          Copiar
                        </button>
                        <button
                          style={s.genBtn}
                          onClick={() => handleGerarCodigo(m._id)}
                          disabled={generatingCode === m._id}
                        >
                          {generatingCode === m._id ? '...' : 'Regen.'}
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={s.codeEmpty}>Sem código</span>
                        <button
                          style={{ ...s.genBtn, borderColor: 'var(--primary)', color: 'var(--primary)' }}
                          onClick={() => handleGerarCodigo(m._id)}
                          disabled={generatingCode === m._id}
                        >
                          {generatingCode === m._id ? '...' : 'Gerar'}
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : loading ? (
            <p style={s.muted}>Carregando estatísticas...</p>
          ) : stats ? (
            <>
              {/* Summary cards */}
              <div style={s.statsRow}>
                <div style={s.miniCard}>
                  <div style={s.miniVal}>{stats.totalResponses}</div>
                  <div style={s.miniLabel}>Respostas recebidas</div>
                </div>
                <div style={s.miniCard}>
                  <div style={s.miniVal}>{stats.memberCompletion?.length || 0}</div>
                  <div style={s.miniLabel}>Membros participantes</div>
                </div>
                <div style={s.miniCard}>
                  <div style={s.miniVal}>
                    {stats.memberCompletion?.length > 0
                      ? Math.round(
                          stats.memberCompletion.reduce(
                            (a, b) => a + b.percentual,
                            0
                          ) / stats.memberCompletion.length
                        )
                      : 0}%
                  </div>
                  <div style={s.miniLabel}>Conclusão média</div>
                </div>
              </div>

              {/* Completion per member */}
              {stats.memberCompletion?.length > 0 && (
                <div style={s.detailSection}>
                  <div style={s.detailSectionTitle}>Progresso por Avaliador</div>
                  {stats.memberCompletion.map((mc) => (
                    <div key={mc.member?._id}>
                      <div style={s.memberProgressRow}>
                        <div style={s.memberProgressName}>
                          {mc.member?.nome || '-'}
                          {mc.member?.area && (
                            <span style={s.memberAreaLabel}> · {mc.member.area}</span>
                          )}
                        </div>
                        <div style={s.memberProgressMeta}>
                          <ProgressBar value={mc.percentual} />
                          <span style={s.memberProgressPct}>{mc.percentual}%</span>
                          <span style={s.memberProgressCount}>
                            {mc.done}/{mc.expected}
                          </span>
                          <button
                            style={s.verBtn}
                            onClick={() => toggleAvaliador(mc.member?._id)}
                          >
                            {selectedAvaliador === mc.member?._id ? 'Fechar' : 'Ver respostas'}
                          </button>
                        </div>
                      </div>

                      {selectedAvaliador === mc.member?._id && (
                        <div style={s.respostasBlock}>
                          {loadingRespostas ? (
                            <p style={s.muted}>Carregando...</p>
                          ) : avaliadorRespostas.length === 0 ? (
                            <p style={s.muted}>Nenhuma resposta concluída.</p>
                          ) : (
                            avaliadorRespostas.map((r, idx) => (
                              <div key={idx} style={s.respostaItem}>
                                <div style={s.respostaTitulo}>
                                  {r.tipo === 'membro'
                                    ? `Avaliou: ${r.avaliado?.nome || '-'}`
                                    : `Área: ${r.area}`}
                                  {r.concluido
                                    ? <span style={s.concluidoTag}>Concluído</span>
                                    : <span style={s.parcialtag}>Parcial</span>}
                                </div>
                                {r.respostas?.map((rr, i) => (
                                  <div key={i} style={s.respostaLinha}>
                                    <span style={s.respostaPergunta}>{rr.pergunta}</span>
                                    <span style={s.respostaValor}>
                                      {rr.tipoCriterio === 'aberta'
                                        ? rr.valor || '—'
                                        : `${rr.valor ?? '—'}/${rr.tipoCriterio === 'nota10' ? 10 : 5}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Membros — PDF sempre disponível */}
              {stats.memberAverages?.length > 0 && (
                <div style={s.detailSection}>
                  <div style={s.detailSectionTitle}>
                    Membros
                    <button
                      style={s.downloadAllBtn}
                      onClick={downloadAllPdfs}
                      disabled={pdfLoading}
                    >
                      {pdfLoading ? 'Gerando...' : 'Baixar todos os PDFs'}
                    </button>
                  </div>
                  {stats.memberAverages.map((ma) => (
                    <div key={ma.member?._id} style={s.avgRow}>
                      <div style={s.avgName}>{ma.member?.nome || '-'}</div>
                      <div style={s.avgRight}>
                        <span
                          style={{
                            ...s.avgValue,
                            color: ma.average === null ? 'var(--text-muted)' : '#22c55e',
                          }}
                        >
                          {ma.average !== null ? `Média ${ma.average}` : 'Sem respostas'}
                        </span>
                        <span style={s.avgCount}>{ma.count} aval.</span>
                        <button
                          style={s.pdfBtn}
                          onClick={() => downloadPdf(ma.member)}
                          disabled={pdfLoading}
                        >
                          Baixar PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Area averages */}
              {stats.areaAverages?.length > 0 && (
                <div style={s.detailSection}>
                  <div style={s.detailSectionTitle}>Ranking por Área</div>
                  {[...stats.areaAverages]
                    .sort((a, b) => (b.average || 0) - (a.average || 0))
                    .map((aa) => (
                      <div key={aa.area} style={s.avgRow}>
                        <div style={s.avgName}>{aa.area}</div>
                        <div style={s.avgRight}>
                          <span
                            style={{
                              ...s.avgValue,
                              color:
                                aa.average === null
                                  ? 'var(--text-muted)'
                                  : '#22c55e',
                            }}
                          >
                            {aa.average !== null ? aa.average : '—'}
                          </span>
                          <span style={s.avgCount}>{aa.count} aval.</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          ) : (
            <p style={s.muted}>Sem dados disponíveis</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberFeedbackView() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyData, setApplyData] = useState(null);

  useEffect(() => {
    getFeedbackCampaigns({ status: 'ativo' })
      .then(setCampaigns)
      .catch(() => toast.error('Erro ao carregar feedbacks'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div>
          <h1 style={s.pageTitle}>Feedbacks</h1>
          <p style={s.pageSubtitle}>Avaliações abertas para resposta</p>
        </div>
      </div>

      {loading ? (
        <p style={s.muted}>Carregando...</p>
      ) : campaigns.length === 0 ? (
        <div style={s.emptyState}>
          <p style={s.emptyTitle}>Nenhum feedback aberto no momento</p>
          <p style={s.muted}>Quando um feedback for criado pelo administrador, ele aparecerá aqui.</p>
        </div>
      ) : (
        <div style={s.campaignList}>
          {campaigns.map((c) => (
            <div key={c._id} style={s.campaignCard}>
              <div style={s.cardTop}>
                <div style={s.cardTopLeft}>
                  <h3 style={s.cardName}>{c.nome}</h3>
                  <div style={s.cardBadges}>
                    <TipoBadge tipo={c.tipo} tipoCustom={c.tipoCustom} />
                    {c.anonimo && <span style={s.anonBadge}>Anônimo</span>}
                  </div>
                </div>
                <button style={s.createBtn} onClick={() => setApplyData(c)}>
                  Responder
                </button>
              </div>

              {c.descricao && <p style={s.cardDesc}>{c.descricao}</p>}

              <div style={s.cardMeta}>
                <span style={s.metaItem}>
                  {new Date(c.dataInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} –{' '}
                  {new Date(c.dataEncerramento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </span>
                <span style={s.metaItem}>{c.membros?.length || 0} membros</span>
                <span style={s.metaItem}>{c.criterios?.length || 0} critérios</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {applyData && (
        <ApplyPickerModal campaign={applyData} onClose={() => setApplyData(null)} />
      )}
    </div>
  );
}

export default function FeedbacksPage() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminFeedbackView /> : <MemberFeedbackView />;
}

function AdminFeedbackView() {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', tipo: '', search: '' });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [detailCampaign, setDetailCampaign] = useState(null);
  const [applyData, setApplyData] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!openMenu) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.tipo) params.tipo = filters.tipo;
      if (filters.search) params.search = filters.search;

      const [camp, st] = await Promise.all([
        getFeedbackCampaigns(params),
        getFeedbackStats(),
      ]);
      setCampaigns(camp);
      setStats(st);
    } catch {
      toast.error('Erro ao carregar feedbacks');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id) {
    if (!window.confirm('Excluir esta campanha de feedback e todas as respostas? Esta ação não pode ser desfeita.')) return;
    try {
      await deleteFeedbackCampaign(id);
      toast.success('Campanha excluída');
      load();
    } catch {
      toast.error('Erro ao excluir campanha');
    }
  }

  async function handleDuplicate(id) {
    try {
      await duplicateFeedbackCampaign(id);
      toast.success('Campanha duplicada');
      load();
    } catch {
      toast.error('Erro ao duplicar campanha');
    }
  }

  async function handleArchive(id) {
    try {
      await archiveFeedbackCampaign(id);
      toast.success('Campanha arquivada');
      load();
    } catch {
      toast.error('Erro ao arquivar campanha');
    }
  }

  async function handleToggleStatus(id) {
    try {
      await toggleFeedbackStatus(id);
      load();
    } catch {
      toast.error('Erro ao alterar status');
    }
  }

  function setFilter(key, val) {
    setFilters((f) => ({ ...f, [key]: val }));
  }

  const activeCampaigns = campaigns.filter((c) => c.status === 'ativo');
  const nonArchivedCount = campaigns.filter((c) => c.status !== 'arquivado').length;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.topBar}>
        <div>
          <h1 style={s.pageTitle}>Feedbacks</h1>
          <p style={s.pageSubtitle}>Gerenciamento de avaliações internas da equipe</p>
        </div>
        <button style={s.createBtn} onClick={() => setShowCreateModal(true)}>
          + Novo Feedback
        </button>
      </div>

      {/* Stats cards */}
      <div style={s.statsGrid}>
        <StatCard
          label="Campanhas ativas"
          value={stats?.ativos ?? '—'}
          sub={`de ${nonArchivedCount || 0} total`}
        />
        <StatCard
          label="Respostas recebidas"
          value={stats?.totalRespostas ?? '—'}
          sub="feedbacks concluídos"
        />
        <StatCard
          label="Em andamento"
          value={activeCampaigns.length}
          sub="campanhas abertas"
        />
        <StatCard
          label="Total de campanhas"
          value={campaigns.length}
          sub="incluindo arquivados"
        />
      </div>

      {/* Filters */}
      <div style={s.filters}>
        <input
          style={s.searchInput}
          placeholder="Buscar campanha..."
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
        />
        <select
          style={s.filterSelect}
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="arquivado">Arquivado</option>
        </select>
        <select
          style={s.filterSelect}
          value={filters.tipo}
          onChange={(e) => setFilter('tipo', e.target.value)}
        >
          <option value="">Todos os tipos</option>
          <option value="pos-offseason">Pós-Offseason</option>
          <option value="pos-relatorio">Pós-Relatório</option>
          <option value="pos-competicao">Pós-Competição</option>
          <option value="outro">Outro</option>
        </select>
        <button style={s.clearBtn} onClick={() => setFilters({ status: '', tipo: '', search: '' })}>
          Limpar
        </button>
      </div>

      {/* Campaign list */}
      {loading ? (
        <div style={s.emptyState}>
          <p style={s.muted}>Carregando campanhas...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div style={s.emptyState}>
          <p style={s.emptyTitle}>Nenhum feedback encontrado</p>
          <p style={s.muted}>Crie o primeiro feedback para a equipe.</p>
          <button style={s.createBtn} onClick={() => setShowCreateModal(true)}>
            + Novo Feedback
          </button>
        </div>
      ) : (
        <div style={s.campaignList}>
          {campaigns.map((c) => (
            <div key={c._id} style={s.campaignCard}>
              <div style={s.cardTop}>
                <div style={s.cardTopLeft}>
                  <h3 style={s.cardName}>{c.nome}</h3>
                  <div style={s.cardBadges}>
                    <TipoBadge tipo={c.tipo} tipoCustom={c.tipoCustom} />
                    <StatusBadge status={c.status} />
                    {c.anonimo && <span style={s.anonBadge}>Anônimo</span>}
                  </div>
                </div>
                <div style={{ position: 'relative' }} ref={openMenu === c._id ? menuRef : null}>
                  <button
                    style={s.menuBtn}
                    onClick={() => setOpenMenu(openMenu === c._id ? null : c._id)}
                  >
                    ···
                  </button>
                  {openMenu === c._id && (
                    <div style={s.dropdown}>
                      <button style={s.dropdownItem} onClick={() => { setDetailCampaign(c); setOpenMenu(null); }}>
                        Estatísticas
                      </button>
                      <button style={s.dropdownItem} onClick={() => { setApplyData(c); setOpenMenu(null); }}>
                        Responder
                      </button>
                      <button style={s.dropdownItem} onClick={() => { setEditingCampaign(c); setOpenMenu(null); }}>
                        Editar
                      </button>
                      <button style={s.dropdownItem} onClick={() => { handleDuplicate(c._id); setOpenMenu(null); }}>
                        Duplicar
                      </button>
                      {c.status !== 'arquivado' && (
                        <button style={s.dropdownItem} onClick={() => { handleToggleStatus(c._id); setOpenMenu(null); }}>
                          {c.status === 'ativo' ? 'Desativar' : 'Ativar'}
                        </button>
                      )}
                      {c.status !== 'arquivado' && (
                        <button style={s.dropdownItem} onClick={() => { handleArchive(c._id); setOpenMenu(null); }}>
                          Arquivar
                        </button>
                      )}
                      <div style={s.dropdownDivider} />
                      <button style={{ ...s.dropdownItem, color: 'var(--primary)' }} onClick={() => { handleDelete(c._id); setOpenMenu(null); }}>
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {c.descricao && (
                <p style={s.cardDesc}>{c.descricao}</p>
              )}

              <div style={s.cardMeta}>
                <span style={s.metaItem}>
                  {new Date(c.dataInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} –{' '}
                  {new Date(c.dataEncerramento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </span>
                <span style={s.metaItem}>
                  {c.membros?.length || 0} membros
                </span>
                <span style={s.metaItem}>
                  {c.areas?.length || 0} áreas
                </span>
                <span style={s.metaItem}>
                  {c.criterios?.length || 0} critérios
                </span>
              </div>

              {/* Progress */}
              <div style={s.cardProgress}>
                <div style={s.progressLabel}>
                  <span style={s.muted}>Conclusão</span>
                  <span style={s.progressPct}>
                    {c.percentual ?? 0}%
                    <span style={{ ...s.muted, fontSize: 11, marginLeft: 6 }}>
                      ({c.totalReceived}/{c.totalExpected} respostas)
                    </span>
                  </span>
                </div>
                <ProgressBar value={c.percentual} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {(showCreateModal || editingCampaign) && (
        <FeedbackCampaignModal
          campaign={editingCampaign}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCampaign(null);
          }}
          onSaved={() => {
            setShowCreateModal(false);
            setEditingCampaign(null);
            load();
          }}
        />
      )}

      {detailCampaign && (
        <CampaignDetailModal
          campaign={detailCampaign}
          onClose={() => setDetailCampaign(null)}
          onRefresh={load}
        />
      )}

      {applyData && (
        <ApplyPickerModal
          campaign={applyData}
          onClose={() => setApplyData(null)}
        />
      )}
    </div>
  );
}

// Modal para escolher quem está avaliando antes de abrir o apply
function ApplyPickerModal({ campaign, onClose }) {
  const [codigo, setCodigo] = useState('');
  const [membro, setMembro] = useState(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [showApply, setShowApply] = useState(false);

  if (showApply && membro) {
    return (
      <FeedbackApplyModal
        campaign={campaign}
        avaliadorId={membro._id}
        onClose={onClose}
      />
    );
  }

  async function handleValidar(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const data = await validateMemberCode(codigo);
      const estaNA = (campaign.membros || []).some((m) => {
        const id = typeof m === 'object' ? m._id : m;
        return id === data._id;
      });
      if (!estaNA) {
        setErro('Você não está incluído neste feedback.');
        return;
      }
      setMembro(data);
    } catch (err) {
      setErro(err.response?.data?.error || 'Código inválido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>Código de acesso</h2>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>
        <div style={{ ...s.modalBody, padding: 24 }}>
          {!membro ? (
            <form onSubmit={handleValidar}>
              <p style={{ ...s.muted, marginBottom: 16 }}>
                Digite o código recebido do administrador para acessar o feedback.
              </p>
              <input
                style={{ ...s.searchInput, width: '100%', fontSize: 20, textAlign: 'center', letterSpacing: 6, textTransform: 'uppercase', boxSizing: 'border-box' }}
                value={codigo}
                onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setErro(''); }}
                placeholder="------"
                maxLength={6}
                autoFocus
              />
              {erro && <p style={s.erroText}>{erro}</p>}
              <button
                type="submit"
                style={{ ...s.createBtn, width: '100%', marginTop: 16 }}
                disabled={loading || codigo.length < 6}
              >
                {loading ? 'Verificando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <div>
              <p style={{ ...s.muted, marginBottom: 8 }}>Identificado como:</p>
              <div style={s.membroConfirm}>
                <div style={s.membroConfirmNome}>{membro.nome}</div>
                {membro.area && <div style={s.muted}>{membro.area}</div>}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button style={s.cancelBtn} onClick={() => setMembro(null)}>Trocar</button>
                <button style={{ ...s.createBtn, flex: 1 }} onClick={() => setShowApply(true)}>
                  Continuar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    padding: 'clamp(14px, 3vw, 28px) clamp(14px, 4vw, 32px)',
    maxWidth: 1100,
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
  pageTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  pageSubtitle: {
    fontSize: 13,
    color: 'var(--text-muted)',
    margin: '4px 0 0',
  },
  createBtn: {
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '18px 20px',
    boxShadow: 'var(--shadow)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text)',
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 4,
    fontWeight: 500,
  },
  statSub: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
    opacity: 0.7,
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
    minWidth: 0,
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
    minWidth: 0,
    flex: '1 1 140px',
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
  campaignList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  campaignCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '18px 20px',
    boxShadow: 'var(--shadow)',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  cardTopLeft: { flex: 1 },
  cardName: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text)',
    margin: '0 0 6px',
  },
  cardBadges: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  tipoBadge: {
    background: 'rgba(168,3,3,0.12)',
    color: 'var(--primary)',
    border: '1px solid rgba(168,3,3,0.3)',
    borderRadius: 20,
    padding: '2px 10px',
    fontSize: 11,
    fontWeight: 600,
  },
  anonBadge: {
    background: 'rgba(156,163,175,0.12)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    padding: '2px 10px',
    fontSize: 11,
  },
  cardActions: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  actionBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-muted)',
    padding: '4px 10px',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'border-color 0.1s',
    whiteSpace: 'nowrap',
  },
  cardDesc: {
    fontSize: 13,
    color: 'var(--text-muted)',
    margin: '10px 0 0',
    lineHeight: 1.5,
  },
  cardMeta: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  metaItem: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  cardProgress: {
    marginTop: 12,
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressPct: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text)',
  },
  progressWrap: {
    height: 5,
    background: 'var(--border)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--primary)',
    borderRadius: 3,
    transition: 'width 0.3s',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  emptyIcon: { fontSize: 48, margin: 0 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text)',
    margin: 0,
  },
  muted: {
    color: 'var(--text-muted)',
    fontSize: 13,
    margin: 0,
  },
  // Modal styles
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
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--border)',
    gap: 12,
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 18,
    cursor: 'pointer',
    padding: 4,
    flexShrink: 0,
  },
  modalBody: {
    overflowY: 'auto',
    flex: 1,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(130px, 100%), 1fr))',
    gap: 10,
    marginBottom: 24,
  },
  miniCard: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '14px 16px',
    textAlign: 'center',
  },
  miniVal: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text)',
  },
  miniLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: '1px solid var(--border)',
    paddingBottom: 6,
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  downloadAllBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-muted)',
    padding: '3px 10px',
    fontSize: 11,
    cursor: 'pointer',
    textTransform: 'none',
    letterSpacing: 0,
  },
  memberProgressRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  memberProgressName: {
    fontSize: 13,
    color: 'var(--text)',
    minWidth: 120,
  },
  memberAreaLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  memberProgressMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  memberProgressPct: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    minWidth: 36,
    textAlign: 'right',
  },
  memberProgressCount: {
    fontSize: 11,
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  avgRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap',
    gap: 6,
  },
  avgName: {
    fontSize: 13,
    color: 'var(--text)',
    flex: 1,
  },
  avgRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  avgValue: {
    fontSize: 16,
    fontWeight: 700,
    minWidth: 36,
    textAlign: 'right',
  },
  avgCount: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  pdfBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text-muted)',
    padding: '2px 8px',
    fontSize: 10,
    cursor: 'pointer',
    fontWeight: 600,
  },
  memberPickCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 14px',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--text)',
    transition: 'border-color 0.1s',
  },
  memberPickCardActive: {
    borderColor: 'var(--primary)',
    background: 'rgba(168,3,3,0.08)',
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    borderRadius: 6,
    padding: '9px 20px',
    fontSize: 14,
    cursor: 'pointer',
  },
  menuBtn: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    padding: '5px 14px',
    fontSize: 16,
    cursor: 'pointer',
    letterSpacing: 2,
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 6px)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    boxShadow: 'var(--shadow)',
    minWidth: 160,
    zIndex: 100,
    overflow: 'hidden',
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: 'var(--text)',
    padding: '9px 16px',
    fontSize: 13,
    textAlign: 'left',
    cursor: 'pointer',
  },
  dropdownDivider: {
    height: 1,
    background: 'var(--border)',
    margin: '4px 0',
  },
  verBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 5,
    color: 'var(--text-muted)',
    padding: '2px 8px',
    fontSize: 11,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  respostasBlock: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  respostaItem: {
    borderBottom: '1px solid var(--border)',
    paddingBottom: 10,
  },
  respostaTitulo: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  concluidoTag: {
    fontSize: 10,
    color: 'var(--success)',
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid var(--success)',
    borderRadius: 10,
    padding: '1px 7px',
  },
  parcialtag: {
    fontSize: 10,
    color: 'var(--text-muted)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '1px 7px',
  },
  respostaLinha: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    padding: '3px 0',
  },
  respostaPergunta: {
    fontSize: 12,
    color: 'var(--text-muted)',
    flex: 1,
  },
  respostaValor: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
  },
  erroText: {
    color: 'var(--primary)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  membroConfirm: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '14px 16px',
    textAlign: 'center',
  },
  membroConfirmNome: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: 4,
  },
  codeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '9px 0',
    borderBottom: '1px solid var(--border)',
    gap: 8,
    flexWrap: 'wrap',
  },
  codeName: {
    fontSize: 13,
    color: 'var(--text)',
    flex: 1,
  },
  codeValue: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--primary)',
    letterSpacing: 3,
    minWidth: 60,
    textAlign: 'center',
  },
  codeEmpty: {
    fontSize: 12,
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    minWidth: 60,
    textAlign: 'center',
  },
  copyBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text-muted)',
    padding: '2px 8px',
    fontSize: 11,
    cursor: 'pointer',
  },
  genBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text-muted)',
    padding: '2px 8px',
    fontSize: 11,
    cursor: 'pointer',
  },
};

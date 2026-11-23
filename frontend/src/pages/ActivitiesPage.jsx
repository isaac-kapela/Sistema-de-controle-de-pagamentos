import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  getActivities,
  createActivity,
  updateActivity,
  toggleActivityComplete,
  sendActivityReminder,
  checkTomorrowActivities,
  deleteActivity,
} from '../services/api';

const CATEGORIES = [
  'Reunião Geral',
  'Workshop / Treinamento',
  'Entrega / Relatório',
  'Competição',
  'Marco de Projeto',
  'Social / Integração',
  'Outro',
];

const PRIORITIES = [
  { value: 'alta', label: 'Alta', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  { value: 'media', label: 'Média', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  { value: 'baixa', label: 'Baixa', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
];

const EMPTY_FORM = {
  titulo: '',
  descricao: '',
  data: '',
  hora: '',
  local: '',
  categoria: 'Reunião Geral',
  prioridade: 'media',
  responsavel: '',
  notificarEmail: true,
};

function formatIsoDateForInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return 'Data não definida';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getRelativeDayLabel(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { label: 'Hoje', badgeColor: '#ef4444', isUrgent: true };
  if (diffDays === 1) return { label: 'Amanhã', badgeColor: '#f59e0b', isUrgent: true };
  if (diffDays > 1 && diffDays <= 7) return { label: `Em ${diffDays} dias`, badgeColor: '#10b981', isUrgent: false };
  if (diffDays > 7) return { label: `Em ${diffDays} dias`, badgeColor: '#6b7280', isUrgent: false };
  return { label: `Há ${Math.abs(diffDays)} dia(s)`, badgeColor: '#4b5563', isUrgent: false, isPast: true };
}

// ── Modal de Criação / Edição ─────────────────────────────────
function ActivityModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    if (item) {
      return {
        ...item,
        data: formatIsoDateForInput(item.data),
      };
    }
    return {
      ...EMPTY_FORM,
      data: new Date().toISOString().split('T')[0],
    };
  });
  const [saving, setSaving] = useState(false);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.titulo.trim()) {
      toast.error('Título da atividade é obrigatório');
      return;
    }
    if (!form.data) {
      toast.error('Data da atividade é obrigatória');
      return;
    }

    setSaving(true);
    try {
      if (item) {
        await updateActivity(item._id, form);
        toast.success('Atividade atualizada com sucesso');
      } else {
        await createActivity(form);
        toast.success('Atividade criada com sucesso!');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar atividade');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div>
            <div style={s.modalSubTitle}>{item ? 'EDITAR ATIVIDADE' : 'NOVA ATIVIDADE / EVENTO'}</div>
            <h2 style={s.modalTitle}>{item ? item.titulo : 'Agendar Atividade na Agenda'}</h2>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.formGroup}>
            <label style={s.label}>Título do Evento / Atividade *</label>
            <input
              style={s.input}
              type="text"
              placeholder="Ex: Reunião Geral de Alinhamento Semanal"
              value={form.titulo}
              onChange={(e) => setField('titulo', e.target.value)}
              required
            />
          </div>

          <div style={s.formRow}>
            <div style={s.formGroup}>
              <label style={s.label}>Categoria *</label>
              <select
                style={s.select}
                value={form.categoria}
                onChange={(e) => setField('categoria', e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Prioridade *</label>
              <select
                style={s.select}
                value={form.prioridade}
                onChange={(e) => setField('prioridade', e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={s.formRow}>
            <div style={s.formGroup}>
              <label style={s.label}>Data do Evento *</label>
              <input
                style={s.input}
                type="date"
                value={form.data}
                onChange={(e) => setField('data', e.target.value)}
                required
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Horário (opcional)</label>
              <input
                style={s.input}
                type="text"
                placeholder="Ex: 14:00 ou 18:30 às 20:00"
                value={form.hora || ''}
                onChange={(e) => setField('hora', e.target.value)}
              />
            </div>
          </div>

          <div style={s.formRow}>
            <div style={s.formGroup}>
              <label style={s.label}>Local ou Link da Reunião</label>
              <input
                style={s.input}
                type="text"
                placeholder="Ex: Lab Microraptor ou https://meet.google.com/..."
                value={form.local || ''}
                onChange={(e) => setField('local', e.target.value)}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Responsável / Líder</label>
              <input
                style={s.input}
                type="text"
                placeholder="Ex: Capitão / Diretor de Projetos"
                value={form.responsavel || ''}
                onChange={(e) => setField('responsavel', e.target.value)}
              />
            </div>
          </div>

          <div style={s.formGroup}>
            <label style={s.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.notificarEmail}
                onChange={(e) => setField('notificarEmail', e.target.checked)}
                style={s.checkbox}
              />
              <span>
                <strong>Notificar membros ativos por e-mail 1 dia antes</strong>
                <span style={s.checkboxSub}> (O sistema dispara um e-mail com pauta e detalhes para a equipe)</span>
              </span>
            </label>
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Descrição / Pauta / Informações Adicionais</label>
            <textarea
              style={s.textarea}
              rows={4}
              placeholder="Descreva a pauta da reunião, materiais necessários, links importantes ou detalhes da entrega..."
              value={form.descricao || ''}
              onChange={(e) => setField('descricao', e.target.value)}
            />
          </div>

          <div style={s.modalFooter}>
            <button type="button" style={s.cancelBtn} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" style={s.submitBtn} disabled={saving}>
              {saving ? 'Salvando...' : item ? 'Salvar Alterações' : 'Criar Atividade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────
export default function ActivitiesPage() {
  const { isAdmin } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('abertas'); // 'todas', 'abertas', 'proximas', 'concluidas', 'alta'
  const [modalItem, setModalItem] = useState(null); // null = fechado, 'new' = novo, obj = editar
  const [checkingTomorrow, setCheckingTomorrow] = useState(false);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActivities();
      const list = Array.isArray(data) ? data : (data?.activities || []);
      setActivities(list);
    } catch (err) {
      toast.error('Erro ao carregar atividades');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Estatísticas Rápidas (KPIs)
  const stats = useMemo(() => {
    const list = Array.isArray(activities) ? activities : [];
    const total = list.length;
    const open = list.filter((a) => !a.concluida);
    const completed = list.filter((a) => a.concluida);
    const highPriority = open.filter((a) => a.prioridade === 'alta');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDays = new Date(today);
    sevenDays.setDate(sevenDays.getDate() + 7);

    const next7Days = open.filter((a) => {
      if (!a.data) return false;
      const d = new Date(a.data);
      const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return target >= today && target <= sevenDays;
    });

    return {
      total,
      open: open.length,
      completed: completed.length,
      highPriority: highPriority.length,
      next7Days: next7Days.length,
    };
  }, [activities]);

  // Filtros aplicados
  const filteredActivities = useMemo(() => {
    const list = Array.isArray(activities) ? activities : [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDays = new Date(today);
    sevenDays.setDate(sevenDays.getDate() + 7);

    return list.filter((act) => {
      // Busca textual
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = act.titulo?.toLowerCase().includes(q);
        const matchDesc = act.descricao?.toLowerCase().includes(q);
        const matchLocal = act.local?.toLowerCase().includes(q);
        const matchResp = act.responsavel?.toLowerCase().includes(q);
        const matchCat = act.categoria?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLocal && !matchResp && !matchCat) return false;
      }

      // Categoria
      if (categoryFilter && act.categoria !== categoryFilter) return false;

      // Status / Período
      if (statusFilter === 'abertas' && act.concluida) return false;
      if (statusFilter === 'concluidas' && !act.concluida) return false;
      if (statusFilter === 'alta') {
        if (act.concluida || act.prioridade !== 'alta') return false;
      }
      if (statusFilter === 'proximas') {
        if (act.concluida || !act.data) return false;
        const d = new Date(act.data);
        const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        if (target < today || target > sevenDays) return false;
      }

      return true;
    });
  }, [activities, search, categoryFilter, statusFilter]);

  async function handleToggleComplete(act) {
    try {
      const updated = await toggleActivityComplete(act._id);
      toast.success(updated.concluida ? 'Atividade marcada como concluída!' : 'Atividade reaberta!');
      setActivities((prev) => prev.map((a) => (a._id === act._id ? updated : a)));
    } catch (err) {
      toast.error('Erro ao alterar status da atividade');
    }
  }

  async function handleSendReminder(act) {
    if (!window.confirm(`Deseja disparar o lembrete por e-mail agora para todos os membros ativos sobre "${act.titulo}"?`)) {
      return;
    }

    const tId = toast.loading('Disparando e-mails para membros ativos...');
    try {
      const res = await sendActivityReminder(act._id);
      toast.success(res.message || 'Lembrete enviado com sucesso!', { id: tId });
      fetchActivities();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar lembretes', { id: tId });
    }
  }

  async function handleCheckTomorrow() {
    setCheckingTomorrow(true);
    const tId = toast.loading('Verificando eventos de amanhã...');
    try {
      const res = await checkTomorrowActivities();
      if (res.processedCount > 0) {
        toast.success(`Processamento concluído: ${res.processedCount} evento(s) notificado(s)!`, { id: tId });
      } else {
        toast.success(res.message || 'Nenhum evento pendente para amanhã.', { id: tId });
      }
      fetchActivities();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao verificar eventos', { id: tId });
    } finally {
      setCheckingTomorrow(false);
    }
  }

  async function handleDelete(act) {
    if (!window.confirm(`Tem certeza que deseja excluir a atividade "${act.titulo}"?`)) return;
    try {
      await deleteActivity(act._id);
      toast.success('Atividade excluída com sucesso');
      setActivities((prev) => prev.filter((a) => a._id !== act._id));
    } catch (err) {
      toast.error('Erro ao excluir atividade');
    }
  }

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Atividades & Agenda</h1>
          <p style={s.pageSubtitle}>
            Acompanhe eventos importantes, reuniões, competições e entregas. Membros ativos recebem lembrete por e-mail 1 dia antes.
          </p>
        </div>
        <div style={s.headerActions}>
          <button
            style={s.secondaryBtn}
            onClick={handleCheckTomorrow}
            disabled={checkingTomorrow}
            title="Verifica se há eventos agendados para amanhã e dispara os e-mails pendentes"
          >
            {checkingTomorrow ? 'Verificando...' : 'Verificar Eventos de Amanhã'}
          </button>
          <button style={s.primaryBtn} onClick={() => setModalItem('new')}>
            + Nova Atividade
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={s.kpiGrid}>
        <div style={s.kpiCard} onClick={() => setStatusFilter('proximas')}>
          <div style={s.kpiValue}>{stats.next7Days}</div>
          <div style={s.kpiLabel}>Próximos 7 Dias</div>
          <div style={{ ...s.kpiIndicator, color: '#10b981' }}>Foco Imediato</div>
        </div>

        <div style={s.kpiCard} onClick={() => setStatusFilter('abertas')}>
          <div style={s.kpiValue}>{stats.open}</div>
          <div style={s.kpiLabel}>Atividades em Aberto</div>
          <div style={{ ...s.kpiIndicator, color: '#3b82f6' }}>Pendentes na Agenda</div>
        </div>

        <div style={s.kpiCard} onClick={() => setStatusFilter('alta')}>
          <div style={s.kpiValue}>{stats.highPriority}</div>
          <div style={s.kpiLabel}>Alta Prioridade</div>
          <div style={{ ...s.kpiIndicator, color: '#ef4444' }}>Crítico / Importante</div>
        </div>

        <div style={s.kpiCard} onClick={() => setStatusFilter('concluidas')}>
          <div style={s.kpiValue}>{stats.completed}</div>
          <div style={s.kpiLabel}>Concluídas</div>
          <div style={{ ...s.kpiIndicator, color: '#9ca3af' }}>Histórico finalizado</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div style={s.filterBar}>
        <div style={s.searchWrap}>
          <input
            style={s.searchInput}
            type="text"
            placeholder="Buscar por título, local, responsável ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button style={s.clearSearchBtn} onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div style={s.filterGroup}>
          <select
            style={s.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="abertas">Em Aberto</option>
            <option value="proximas">Próximos 7 Dias</option>
            <option value="alta">Alta Prioridade</option>
            <option value="concluidas">Concluídas</option>
            <option value="todas">Todas as Atividades</option>
          </select>

          <select
            style={s.filterSelect}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Todas as Categorias</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity List */}
      {loading ? (
        <div style={s.emptyState}>Carregando atividades da agenda...</div>
      ) : filteredActivities.length === 0 ? (
        <div style={s.emptyState}>
          <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>Nenhuma atividade encontrada</p>
          <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>
            {search || categoryFilter || statusFilter !== 'abertas'
              ? 'Tente ajustar os filtros ou termo de busca acima.'
              : 'Clique em "+ Nova Atividade" para agendar o primeiro evento da equipe.'}
          </p>
        </div>
      ) : (
        <div style={s.activityList}>
          {filteredActivities.map((act) => {
            const relDay = getRelativeDayLabel(act.data);
            const prioInfo = PRIORITIES.find((p) => p.value === act.prioridade) || PRIORITIES[1];
            const isMeetLink = act.local && (act.local.startsWith('http://') || act.local.startsWith('https://'));

            return (
              <div
                key={act._id}
                style={{
                  ...s.activityCard,
                  ...(act.concluida ? s.activityCardCompleted : {}),
                }}
              >
                {/* Left/Main Column */}
                <div style={s.activityMain}>
                  <div style={s.activityTopRow}>
                    <span style={s.categoryBadge}>{act.categoria}</span>
                    <span
                      style={{
                        ...s.priorityBadge,
                        color: prioInfo.color,
                        background: prioInfo.bg,
                      }}
                    >
                      Prioridade {prioInfo.label}
                    </span>
                    {relDay && (
                      <span
                        style={{
                          ...s.dayBadge,
                          background: relDay.badgeColor,
                        }}
                      >
                        {relDay.label}
                      </span>
                    )}
                    {act.concluida && <span style={s.completedBadge}>✓ Concluída</span>}
                  </div>

                  <h3 style={{ ...s.activityTitle, textDecoration: act.concluida ? 'line-through' : 'none' }}>
                    {act.titulo}
                  </h3>

                  {/* Meta Details (Date, Time, Location, Leader) */}
                  <div style={s.metaGrid}>
                    <div style={s.metaItem}>
                      <span style={s.metaLabel}>Data:</span>
                      <span>{formatDateDisplay(act.data)}</span>
                      {act.hora && <span style={s.metaSub}>às {act.hora}</span>}
                    </div>

                    {act.local && (
                      <div style={s.metaItem}>
                        <span style={s.metaLabel}>Local:</span>
                        {isMeetLink ? (
                          <a
                            href={act.local}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={s.link}
                          >
                            Abrir Link / Reunião
                          </a>
                        ) : (
                          <span>{act.local}</span>
                        )}
                      </div>
                    )}

                    {act.responsavel && (
                      <div style={s.metaItem}>
                        <span style={s.metaLabel}>Responsável:</span>
                        <span>{act.responsavel}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {act.descricao && (
                    <div style={s.activityDesc}>
                      {act.descricao}
                    </div>
                  )}

                  {/* Notification Status Banner */}
                  <div style={s.notifStatus}>
                    {act.notificarEmail ? (
                      act.notificacaoEnviada ? (
                        <span style={{ color: '#10b981', fontSize: 12 }}>
                          Lembrete enviado por e-mail aos membros ativos
                          {act.notificadoEm && ` em ${new Date(act.notificadoEm).toLocaleString('pt-BR')}`}
                        </span>
                      ) : (
                        <span style={{ color: '#f59e0b', fontSize: 12 }}>
                          Notificação por e-mail agendada (disparo automático 1 dia antes às 08:00)
                        </span>
                      )
                    ) : (
                      <span style={{ color: '#6b7280', fontSize: 12 }}>
                        Notificação por e-mail desativada para este evento
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Action Column */}
                <div style={s.activityActions}>
                  <button
                    style={act.concluida ? s.reopenBtn : s.completeBtn}
                    onClick={() => handleToggleComplete(act)}
                    title={act.concluida ? 'Reabrir atividade' : 'Marcar como concluída'}
                  >
                    {act.concluida ? 'Reabrir' : 'Concluir'}
                  </button>

                  <button
                    style={s.emailBtn}
                    onClick={() => handleSendReminder(act)}
                    title="Dispara e-mail de lembrete agora para todos os membros ativos"
                  >
                    Disparar E-mail
                  </button>

                  <button
                    style={s.editBtn}
                    onClick={() => setModalItem(act)}
                    title="Editar atividade"
                  >
                    Editar
                  </button>

                  {isAdmin && (
                    <button
                      style={s.deleteBtn}
                      onClick={() => handleDelete(act)}
                      title="Excluir atividade"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalItem && (
        <ActivityModal
          item={modalItem === 'new' ? null : modalItem}
          onClose={() => setModalItem(null)}
          onSaved={() => {
            setModalItem(null);
            fetchActivities();
          }}
        />
      )}
    </div>
  );
}

// ── Estilos Dark Theme ─────────────────────────────────────────
const s = {
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '24px 16px',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  pageSubtitle: {
    fontSize: 14,
    color: 'var(--text-muted)',
    marginTop: 6,
    marginBottom: 0,
    maxWidth: 680,
  },
  headerActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    background: '#10b981',
    color: '#fff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: 'var(--radius)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  secondaryBtn: {
    background: 'var(--card-bg)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    padding: '10px 16px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '18px 20px',
    cursor: 'pointer',
    transition: 'transform 0.15s, border-color 0.15s',
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  kpiLabel: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginTop: 4,
    fontWeight: 500,
  },
  kpiIndicator: {
    fontSize: 11,
    fontWeight: 600,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  searchWrap: {
    position: 'relative',
    flex: '1 1 300px',
  },
  searchInput: {
    width: '100%',
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '10px 14px',
    paddingRight: 32,
    borderRadius: 'var(--radius)',
    fontSize: 14,
    outline: 'none',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 12,
  },
  filterGroup: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  filterSelect: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '10px 14px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  },
  emptyState: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '48px 24px',
    textAlign: 'center',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  activityCard: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '18px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    flexWrap: 'wrap',
    transition: 'border-color 0.2s',
  },
  activityCardCompleted: {
    opacity: 0.65,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  activityMain: {
    flex: '1 1 500px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  activityTopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: 600,
    background: 'rgba(255, 255, 255, 0.08)',
    color: 'var(--text-primary)',
    padding: '3px 8px',
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  priorityBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 4,
  },
  dayBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#fff',
    padding: '3px 8px',
    borderRadius: 4,
  },
  completedBadge: {
    fontSize: 11,
    fontWeight: 600,
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    padding: '3px 8px',
    borderRadius: 4,
  },
  activityTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: '2px 0 4px 0',
  },
  metaGrid: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    fontSize: 13,
    color: 'var(--text-muted)',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaSub: {
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  link: {
    color: '#3b82f6',
    textDecoration: 'underline',
  },
  activityDesc: {
    fontSize: 13,
    color: 'var(--text-muted)',
    lineHeight: 1.5,
    marginTop: 4,
    whiteSpace: 'pre-wrap',
  },
  notifStatus: {
    marginTop: 6,
    paddingTop: 8,
    borderTop: '1px dashed var(--border)',
  },
  activityActions: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  completeBtn: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    padding: '6px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  reopenBtn: {
    background: 'rgba(107, 114, 128, 0.15)',
    color: '#9ca3af',
    border: '1px solid rgba(107, 114, 128, 0.3)',
    padding: '6px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  emailBtn: {
    background: 'rgba(59, 130, 246, 0.12)',
    color: '#60a5fa',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    padding: '6px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
  editBtn: {
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    padding: '6px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    cursor: 'pointer',
  },
  deleteBtn: {
    background: 'rgba(239, 68, 68, 0.12)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    padding: '6px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    cursor: 'pointer',
  },

  // Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  },
  modal: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    width: '100%',
    maxWidth: 620,
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: 24,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalSubTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: 0.8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: '4px 0 0 0',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 18,
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  input: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '10px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 14,
    outline: 'none',
  },
  select: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '10px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
  },
  textarea: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '10px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--text-primary)',
  },
  checkbox: {
    marginTop: 2,
    accentColor: '#10b981',
  },
  checkboxSub: {
    color: 'var(--text-muted)',
    fontSize: 12,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    padding: '10px 16px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    cursor: 'pointer',
  },
  submitBtn: {
    background: '#10b981',
    border: 'none',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: 'var(--radius)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

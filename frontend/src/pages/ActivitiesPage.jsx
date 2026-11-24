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

const CATEGORY_COLORS = {
  'Reunião Geral': { bg: '#0284c7', text: '#ffffff', lightBg: 'rgba(2, 132, 199, 0.15)', border: '#0284c7' },
  'Workshop / Treinamento': { bg: '#10b981', text: '#ffffff', lightBg: 'rgba(16, 185, 129, 0.15)', border: '#10b981' },
  'Entrega / Relatório': { bg: '#f59e0b', text: '#ffffff', lightBg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b' },
  'Competição': { bg: '#ef4444', text: '#ffffff', lightBg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444' },
  'Marco de Projeto': { bg: '#8b5cf6', text: '#ffffff', lightBg: 'rgba(139, 92, 246, 0.15)', border: '#8b5cf6' },
  'Social / Integração': { bg: '#ec4899', text: '#ffffff', lightBg: 'rgba(236, 72, 153, 0.15)', border: '#ec4899' },
  'Aniversário': { bg: '#e11d48', text: '#ffffff', lightBg: 'rgba(225, 29, 72, 0.15)', border: '#e11d48' },
  'Outro': { bg: '#6b7280', text: '#ffffff', lightBg: 'rgba(107, 114, 128, 0.15)', border: '#6b7280' },
};

const CATEGORIES = Object.keys(CATEGORY_COLORS);

const PRIORITIES = [
  { value: 'alta', label: 'Alta', color: '#ef4444' },
  { value: 'media', label: 'Média', color: '#f59e0b' },
  { value: 'baixa', label: 'Baixa', color: '#3b82f6' },
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function getCategoryColor(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS['Outro'];
}

const DEFAULT_PAUTA_LINK = 'https://docs.google.com/document/d/1JRl84EZZ2GDFJYrld4Sfck__olyE6RX1Yq_664zqdhw/edit?tab=t.0';

function renderTextWithLinks(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#0284c7', textDecoration: 'underline', wordBreak: 'break-all' }}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

function formatDateISO(d) {
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseActivityDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10), 12, 0, 0);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function parseActivityDateKey(dateStr) {
  if (!dateStr) return '';
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = parseActivityDate(dateStr);
  if (!d) return '';
  return formatDateISO(d);
}

// ── Mini Calendário para o Painel Lateral ─────────────────────
function MiniCalendar({ currentYear, currentMonth, selectedDate, onSelectDate }) {
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const today = new Date();
  const isThisMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  return (
    <div style={s.miniCal}>
      <div style={s.miniCalWeekdays}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((wd, i) => (
          <span key={i} style={s.miniCalWeekday}>{wd}</span>
        ))}
      </div>
      <div style={s.miniCalGrid}>
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} style={s.miniCalCellEmpty} />;
          const isToday = isThisMonth && today.getDate() === day;
          const cellDate = new Date(currentYear, currentMonth, day);
          const isSelected = selectedDate && formatDateISO(selectedDate) === formatDateISO(cellDate);

          return (
            <button
              key={day}
              style={{
                ...s.miniCalCell,
                ...(isToday ? s.miniCalCellToday : {}),
                ...(isSelected ? s.miniCalCellSelected : {}),
              }}
              onClick={() => onSelectDate(cellDate)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Modal de Detalhes / Visualização do Evento ────────────────
function EventDetailsModal({ event, onClose, onEdit, onDelete, onToggleComplete, onOpenReminderModal }) {
  if (!event) return null;
  const catColor = getCategoryColor(event.categoria);
  const prio = PRIORITIES.find((p) => p.value === event.prioridade) || PRIORITIES[1];
  const isMeet = event.local && (event.local.startsWith('http://') || event.local.startsWith('https://'));

  const eventDate = parseActivityDate(event.data);
  const dateFormatted = eventDate
    ? eventDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : event.data;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.detailsModal} onClick={(e) => e.stopPropagation()}>
        {/* Top Color Accent */}
        <div style={{ ...s.detailsHeaderBar, backgroundColor: catColor.bg }}>
          <div style={s.detailsHeaderCategory}>{event.categoria}</div>
          <button style={s.detailsCloseBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.detailsContent}>
          <div style={s.detailsTopRow}>
            <span
              style={{
                ...s.priorityPill,
                color: prio.color,
                borderColor: prio.color,
              }}
            >
              Prioridade {prio.label}
            </span>
            {event.concluida && <span style={s.completedPill}>Concluída</span>}
          </div>

          <h2 style={{ ...s.detailsTitle, textDecoration: event.concluida ? 'line-through' : 'none' }}>
            {event.titulo}
          </h2>

          <div style={s.detailsSection}>
            <div style={s.detailsRow}>
              <span style={s.detailsLabel}>Data e Hora:</span>
              <span style={s.detailsValue}>
                {dateFormatted} {event.hora ? `às ${event.hora}` : ''}
              </span>
            </div>

            {event.local && (
              <div style={s.detailsRow}>
                <span style={s.detailsLabel}>Local / Link:</span>
                <span style={s.detailsValue}>
                  {isMeet ? (
                    <a href={event.local} target="_blank" rel="noopener noreferrer" style={s.meetLink}>
                      Acessar link da reunião
                    </a>
                  ) : (
                    event.local
                  )}
                </span>
              </div>
            )}

            {event.responsavel && (
              <div style={s.detailsRow}>
                <span style={s.detailsLabel}>Responsável:</span>
                <span style={s.detailsValue}>{event.responsavel}</span>
              </div>
            )}

            <div style={s.detailsRow}>
              <span style={s.detailsLabel}>Notificação:</span>
              <span style={s.detailsValue}>
                {event.notificarEmail ? (
                  event.notificacaoEnviada ? (
                    <span style={{ color: '#10b981' }}>
                      E-mail enviado em {new Date(event.notificadoEm).toLocaleDateString('pt-BR')}
                    </span>
                  ) : (
                    <span style={{ color: '#f59e0b' }}>
                      Agendado para envio 1 dia antes às 08:00
                    </span>
                  )
                ) : (
                  <span style={{ color: '#6b7280' }}>Desativada</span>
                )}
              </span>
            </div>

            {event.descricao && (
              <div style={s.detailsDescBox}>
                <div style={s.detailsLabel}>Descrição / Pauta:</div>
                <div style={s.detailsDescText}>{renderTextWithLinks(event.descricao)}</div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={s.detailsActions}>
            <button style={s.actionBtnSecondary} onClick={() => onToggleComplete(event)}>
              {event.concluida ? 'Reabrir Atividade' : 'Marcar como Concluída'}
            </button>
            <button style={s.actionBtnEmail} onClick={() => onOpenReminderModal(event)}>
              Disparar Lembrete
            </button>
            <button style={s.actionBtnSecondary} onClick={() => onEdit(event)}>
              Editar
            </button>
            <button style={s.actionBtnDanger} onClick={() => onDelete(event)}>
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Disparo Manual de E-mail / Lembrete ─────────────
function ManualReminderModal({ activities = [], preselectedEvent = null, onClose, onSent }) {
  const openActivities = useMemo(() => {
    return activities.filter((a) => !a.concluida);
  }, [activities]);

  const [selectedId, setSelectedId] = useState(
    preselectedEvent?._id || openActivities[0]?._id || ''
  );
  const [recipientMode, setRecipientMode] = useState('teste'); // 'teste' ou 'todos'
  const [customEmail, setCustomEmail] = useState('dizolele.isaac@estudante.ufjf.br');
  const [sending, setSending] = useState(false);

  const selectedEvent = useMemo(() => {
    return (
      activities.find((a) => a._id === selectedId) ||
      preselectedEvent ||
      openActivities[0]
    );
  }, [activities, selectedId, preselectedEvent, openActivities]);

  async function handleSend(e) {
    e.preventDefault();
    if (!selectedEvent) {
      toast.error('Nenhuma atividade selecionada');
      return;
    }

    if (recipientMode === 'teste' && !customEmail.trim()) {
      toast.error('Informe o e-mail de teste');
      return;
    }

    if (recipientMode === 'todos') {
      const confirmAll = window.confirm(
        `Confirma o disparo oficial do lembrete sobre "${selectedEvent.titulo}" para TODOS os membros ativos da equipe?`
      );
      if (!confirmAll) return;
    }

    setSending(true);
    const isTest = recipientMode === 'teste';
    const target = isTest ? customEmail.trim() : undefined;
    const tId = toast.loading(
      isTest
        ? `Enviando e-mail de teste para ${customEmail.trim()}...`
        : 'Disparando e-mails para todos os membros ativos...'
    );

    try {
      const res = await sendActivityReminder(selectedEvent._id, { targetEmail: target });
      toast.success(res.message || 'Disparo manual concluído com sucesso!', { id: tId });
      onSent();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao disparar e-mail', { id: tId });
    } finally {
      setSending(false);
    }
  }

  const eventDate = selectedEvent ? parseActivityDate(selectedEvent.data) : null;
  const dateFormatted = eventDate
    ? eventDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.reminderModal} onClick={(e) => e.stopPropagation()}>
        <div style={s.reminderModalHeader}>
          <div>
            <div style={s.reminderModalSubtitle}>COMUNICAÇÃO & NOTIFICAÇÕES</div>
            <h2 style={s.reminderModalTitle}>Disparo Manual de Lembrete</h2>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSend} style={s.form}>
          <div style={s.formGroup}>
            <label style={s.formLabel}>Selecione a Atividade para Notificar *</label>
            <select
              style={s.formSelect}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {openActivities.map((act) => (
                <option key={act._id} value={act._id}>
                  {act.titulo} ({parseActivityDateKey(act.data)}{act.hora ? ` às ${act.hora}` : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Resumo do Evento Selecionado */}
          {selectedEvent && (
            <div style={s.eventPreviewBox}>
              <div style={s.eventPreviewTop}>
                <span style={s.eventPreviewCat}>{selectedEvent.categoria}</span>
                <span style={s.eventPreviewDate}>Data: {dateFormatted} {selectedEvent.hora ? `às ${selectedEvent.hora}` : ''}</span>
              </div>
              <div style={s.eventPreviewTitle}>{selectedEvent.titulo}</div>
              {selectedEvent.local && (
                <div style={s.eventPreviewSub}>Local: {selectedEvent.local}</div>
              )}
              {selectedEvent.descricao && (
                <div style={s.eventPreviewDesc}>{renderTextWithLinks(selectedEvent.descricao)}</div>
              )}
            </div>
          )}

          <div style={s.formGroup}>
            <label style={s.formLabel}>Destinatário do Disparo *</label>
            
            <div style={s.radioGroup}>
              <label style={s.radioLabel}>
                <input
                  type="radio"
                  name="recipientMode"
                  value="teste"
                  checked={recipientMode === 'teste'}
                  onChange={() => setRecipientMode('teste')}
                  style={{ accentColor: '#0284c7' }}
                />
                <div>
                  <strong>E-mail de Teste</strong>
                  <div style={s.radioSub}>Envia apenas para o e-mail informado abaixo para validação</div>
                </div>
              </label>

              <label style={s.radioLabel}>
                <input
                  type="radio"
                  name="recipientMode"
                  value="todos"
                  checked={recipientMode === 'todos'}
                  onChange={() => setRecipientMode('todos')}
                  style={{ accentColor: '#0284c7' }}
                />
                <div>
                  <strong>Todos os Membros Ativos</strong>
                  <div style={s.radioSub}>Dispara para todos os integrantes com status Ativo no sistema</div>
                </div>
              </label>
            </div>
          </div>

          {recipientMode === 'teste' && (
            <div style={s.formGroup}>
              <label style={s.formLabel}>E-mail de Destino para Teste *</label>
              <input
                style={s.formInput}
                type="email"
                placeholder="nome@estudante.ufjf.br"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div style={s.formFooter}>
            <button type="button" style={s.cancelBtn} onClick={onClose} disabled={sending}>
              Cancelar
            </button>
            <button type="submit" style={s.submitBtn} disabled={sending}>
              {sending ? 'Disparando E-mail...' : 'Confirmar e Disparar E-mail'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal de Criação / Edição (Estilo Google Agenda) ─────────
function EventFormModal({ item, initialDate, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    if (item) {
      const d = item.data ? parseActivityDate(item.data) : new Date();
      return {
        ...item,
        data: d ? formatDateISO(d) : '',
      };
    }
    return {
      titulo: '',
      descricao: 'Pauta da reunião / Informações: ' + DEFAULT_PAUTA_LINK,
      data: initialDate ? formatDateISO(initialDate) : formatDateISO(new Date()),
      hora: '12:00',
      local: '',
      categoria: 'Reunião Geral',
      prioridade: 'media',
      responsavel: '',
      notificarEmail: true,
    };
  });
  const [saving, setSaving] = useState(false);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.titulo.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    if (!form.data) {
      toast.error('Data é obrigatória');
      return;
    }

    setSaving(true);
    try {
      if (item && item._id) {
        await updateActivity(item._id, form);
        toast.success('Atividade atualizada');
      } else {
        await createActivity(form);
        toast.success('Atividade agendada com sucesso');
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
      <div style={s.formModal} onClick={(e) => e.stopPropagation()}>
        <div style={s.formHeader}>
          <h2 style={s.formTitle}>{item ? 'Editar Evento' : 'Novo Evento / Atividade'}</h2>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.formGroup}>
            <label style={s.formLabel}>Título da Atividade *</label>
            <input
              style={s.formInput}
              type="text"
              placeholder="Ex: Reunião Geral de Alinhamento"
              value={form.titulo}
              onChange={(e) => setField('titulo', e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={s.formRow}>
            <div style={s.formGroup}>
              <label style={s.formLabel}>Categoria *</label>
              <select
                style={s.formSelect}
                value={form.categoria}
                onChange={(e) => setField('categoria', e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>Prioridade *</label>
              <select
                style={s.formSelect}
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
              <label style={s.formLabel}>Data *</label>
              <input
                style={s.formInput}
                type="date"
                value={form.data}
                onChange={(e) => setField('data', e.target.value)}
                required
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>Horário</label>
              <input
                style={s.formInput}
                type="text"
                placeholder="Ex: 12:00 ou 12:00 às 13:00"
                value={form.hora || ''}
                onChange={(e) => setField('hora', e.target.value)}
              />
            </div>
          </div>

          <div style={s.formRow}>
            <div style={s.formGroup}>
              <label style={s.formLabel}>Local ou Link da Reunião</label>
              <input
                style={s.formInput}
                type="text"
                placeholder="Ex: Lab Microraptor ou https://meet.google.com/..."
                value={form.local || ''}
                onChange={(e) => setField('local', e.target.value)}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>Responsável / Líder</label>
              <input
                style={s.formInput}
                type="text"
                placeholder="Ex: Capitania / Projetos"
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
                <span style={s.checkboxSub}> (Disparo automático às 08:00 com detalhes)</span>
              </span>
            </label>
          </div>

          <div style={s.formGroup}>
            <label style={s.formLabel}>Descrição / Pauta / Notas</label>
            <textarea
              style={s.formTextarea}
              rows={3}
              placeholder="Descreva a pauta, links ou informações adicionais..."
              value={form.descricao || ''}
              onChange={(e) => setField('descricao', e.target.value)}
            />
          </div>

          <div style={s.formFooter}>
            <button type="button" style={s.cancelBtn} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" style={s.submitBtn} disabled={saving}>
              {saving ? 'Salvando...' : item ? 'Salvar Alterações' : 'Salvar no Calendário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Componente Principal: Google Agenda ───────────────────────
export default function ActivitiesPage() {
  const { isAdmin } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navegação no Calendário (Ano / Mês / Data Selecionada)
  const [viewDate, setViewDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState('mes'); // 'mes', 'semana', 'agenda'
  const [search, setSearch] = useState('');

  // Filtro de Categorias no Painel Lateral
  const [activeCategories, setActiveCategories] = useState(() => new Set(CATEGORIES));

  // Modais
  const [detailsEvent, setDetailsEvent] = useState(null);
  const [formModalItem, setFormModalItem] = useState(null); // null = fechado, 'new' = novo, obj = editar
  const [formInitialDate, setFormInitialDate] = useState(null);
  const [reminderModalItem, setReminderModalItem] = useState(null); // null = fechado, 'open' = geral, obj = pre-selecionado
  const [checkingTomorrow, setCheckingTomorrow] = useState(false);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActivities();
      const list = Array.isArray(data) ? data : (data?.activities || []);
      setActivities(list);
    } catch {
      toast.error('Erro ao carregar atividades da agenda');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Navegação de Datas
  function handlePrev() {
    setViewDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'mes') {
        next.setMonth(next.getMonth() - 1);
      } else if (viewMode === 'semana') {
        next.setDate(next.getDate() - 7);
      } else {
        next.setMonth(next.getMonth() - 1);
      }
      return next;
    });
  }

  function handleNext() {
    setViewDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'mes') {
        next.setMonth(next.getMonth() + 1);
      } else if (viewMode === 'semana') {
        next.setDate(next.getDate() + 7);
      } else {
        next.setMonth(next.getMonth() + 1);
      }
      return next;
    });
  }

  function handleToday() {
    setViewDate(new Date());
  }

  function toggleCategory(cat) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  function selectAllCategories() {
    setActiveCategories(new Set(CATEGORIES));
  }

  // Filtragem dos eventos
  const filteredActivities = useMemo(() => {
    const list = Array.isArray(activities) ? activities : [];
    return list.filter((act) => {
      if (!activeCategories.has(act.categoria)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = act.titulo?.toLowerCase().includes(q);
        const matchDesc = act.descricao?.toLowerCase().includes(q);
        const matchLocal = act.local?.toLowerCase().includes(q);
        const matchResp = act.responsavel?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLocal && !matchResp) return false;
      }
      return true;
    });
  }, [activities, activeCategories, search]);

  // Mapa de eventos por data ISO (YYYY-MM-DD)
  const activitiesByDate = useMemo(() => {
    const map = {};
    for (const act of filteredActivities) {
      const key = parseActivityDateKey(act.data);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(act);
    }
    // Ordena eventos do dia por horário
    for (const key in map) {
      map[key].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    }
    return map;
  }, [filteredActivities]);

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    const list = Array.isArray(activities) ? activities : [];
    const open = list.filter((a) => !a.concluida);
    const completed = list.filter((a) => a.concluida);
    const high = open.filter((a) => a.prioridade === 'alta');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in7 = new Date(today);
    in7.setDate(in7.getDate() + 7);

    const next7Days = open.filter((a) => {
      if (!a.data) return false;
      const d = parseActivityDate(a.data);
      if (!d) return false;
      const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return target >= today && target <= in7;
    });

    return {
      total: list.length,
      open: open.length,
      completed: completed.length,
      high: high.length,
      next7Days: next7Days.length,
    };
  }, [activities]);

  // Ações de Eventos
  async function handleToggleComplete(act) {
    try {
      const updated = await toggleActivityComplete(act._id);
      toast.success(updated.concluida ? 'Atividade concluída' : 'Atividade reaberta');
      setActivities((prev) => prev.map((a) => (a._id === act._id ? updated : a)));
      if (detailsEvent && detailsEvent._id === act._id) {
        setDetailsEvent(updated);
      }
    } catch {
      toast.error('Erro ao atualizar status');
    }
  }

  async function handleSendTestEmail(act) {
    const defaultEmail = 'dizolele.isaac@estudante.ufjf.br';
    const inputEmail = window.prompt(
      `Enviar e-mail sobre "${act.titulo}".\nDigite o e-mail de destino para teste (ou deixe em branco para enviar a todos os membros ativos):`,
      defaultEmail
    );

    if (inputEmail === null) return;

    const isTest = Boolean(inputEmail.trim());
    const tId = toast.loading(isTest ? `Enviando e-mail de teste para ${inputEmail.trim()}...` : 'Disparando e-mails para membros ativos...');
    try {
      const res = await sendActivityReminder(act._id, { targetEmail: isTest ? inputEmail.trim() : undefined });
      toast.success(res.message || 'Lembrete enviado com sucesso', { id: tId });
      fetchActivities();
      if (detailsEvent && detailsEvent._id === act._id) {
        setDetailsEvent((prev) => ({ ...prev, notificacaoEnviada: true, notificadoEm: new Date() }));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar e-mail', { id: tId });
    }
  }

  async function handleDelete(act) {
    if (!window.confirm(`Excluir a atividade "${act.titulo}"?`)) return;
    try {
      await deleteActivity(act._id);
      toast.success('Atividade excluída');
      setActivities((prev) => prev.filter((a) => a._id !== act._id));
      setDetailsEvent(null);
    } catch {
      toast.error('Erro ao excluir atividade');
    }
  }

  async function handleCheckTomorrow() {
    setCheckingTomorrow(true);
    const tId = toast.loading('Verificando eventos de amanhã...');
    try {
      const res = await checkTomorrowActivities();
      if (res.processedCount > 0) {
        toast.success(`Processamento concluído: ${res.processedCount} evento(s) notificado(s)`, { id: tId });
      } else {
        toast.success(res.message || 'Nenhum evento pendente para amanhã', { id: tId });
      }
      fetchActivities();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao verificar eventos', { id: tId });
    } finally {
      setCheckingTomorrow(false);
    }
  }

  function handleOpenCreate(date = null) {
    setFormInitialDate(date || viewDate);
    setFormModalItem('new');
  }

  // Cálculos para a grade de Mês
  const monthDaysGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = [];

    // Dias do mês anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      grid.push({ date: d, isCurrentMonth: false, dayNum });
    }

    // Dias do mês atual
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateObj = new Date(year, month, d);
      grid.push({ date: dateObj, isCurrentMonth: true, dayNum: d });
    }

    // Dias do próximo mês para completar 35 ou 42 células
    const remaining = (7 - (grid.length % 7)) % 7;
    const totalCells = grid.length + remaining < 35 ? 35 : grid.length + remaining;
    const neededNext = totalCells - grid.length;

    for (let d = 1; d <= neededNext; d++) {
      const dateObj = new Date(year, month + 1, d);
      grid.push({ date: dateObj, isCurrentMonth: false, dayNum: d });
    }

    return grid;
  }, [viewDate]);

  // Cálculos para a visualização de Semana
  const weekDays = useMemo(() => {
    const curr = new Date(viewDate);
    const dayOfWeek = curr.getDay(); // 0 = Dom
    const startOfWeek = new Date(curr);
    startOfWeek.setDate(curr.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [viewDate]);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const todayStr = formatDateISO(new Date());

  return (
    <div style={s.googleAgendaWrapper}>
      {/* ── Top Bar / Google Calendar Header ── */}
      <header style={s.gCalHeader}>
        <div style={s.headerLeft}>
          <button style={s.todayBtn} onClick={handleToday}>
            Hoje
          </button>
          <div style={s.navArrows}>
            <button style={s.arrowBtn} onClick={handlePrev} title="Anterior">
              ‹
            </button>
            <button style={s.arrowBtn} onClick={handleNext} title="Próximo">
              ›
            </button>
          </div>
          <h1 style={s.currentMonthTitle}>
            {MONTHS[currentMonth]} de {currentYear}
          </h1>
        </div>

        <div style={s.headerRight}>
          <div style={s.searchBox}>
            <input
              style={s.searchInput}
              type="text"
              placeholder="Pesquisar atividades..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button style={s.clearSearchBtn} onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          <div style={s.viewToggleGroup}>
            <button
              style={{
                ...s.viewToggleBtn,
                ...(viewMode === 'mes' ? s.viewToggleBtnActive : {}),
              }}
              onClick={() => setViewMode('mes')}
            >
              Mês
            </button>
            <button
              style={{
                ...s.viewToggleBtn,
                ...(viewMode === 'semana' ? s.viewToggleBtnActive : {}),
              }}
              onClick={() => setViewMode('semana')}
            >
              Semana
            </button>
            <button
              style={{
                ...s.viewToggleBtn,
                ...(viewMode === 'agenda' ? s.viewToggleBtnActive : {}),
              }}
              onClick={() => setViewMode('agenda')}
            >
              Agenda
            </button>
          </div>

          <button
            style={s.manualReminderHeaderBtn}
            onClick={() => setReminderModalItem('open')}
            title="Disparar lembretes por e-mail manualmente (teste ou equipe)"
          >
            Disparo Manual de E-mail
          </button>

          <button
            style={s.tomorrowCheckBtn}
            onClick={handleCheckTomorrow}
            disabled={checkingTomorrow}
            title="Verifica se há eventos agendados para amanhã e dispara os e-mails pendentes"
          >
            {checkingTomorrow ? 'Verificando...' : 'Verificar Amanhã'}
          </button>

          <button style={s.gCalCreateBtn} onClick={() => handleOpenCreate()}>
            + Criar Atividade
          </button>
        </div>
      </header>

      {/* ── Main Layout: Sidebar + Calendar Grid ── */}
      <div style={s.gCalBody}>
        {/* Left Sidebar */}
        <aside style={s.gCalSidebar}>
          {/* Mini Calendar Widget */}
          <div style={s.sidebarSection}>
            <MiniCalendar
              currentYear={currentYear}
              currentMonth={currentMonth}
              selectedDate={viewDate}
              onSelectDate={(d) => setViewDate(d)}
            />
          </div>

          {/* KPI Summary */}
          <div style={s.sidebarSection}>
            <div style={s.sidebarSectionHeader}>Resumo de Compromissos</div>
            <div style={s.kpiMiniGrid}>
              <div style={s.kpiMiniCard}>
                <div style={s.kpiMiniVal}>{stats.next7Days}</div>
                <div style={s.kpiMiniLbl}>Próximos 7 Dias</div>
              </div>
              <div style={s.kpiMiniCard}>
                <div style={s.kpiMiniVal}>{stats.open}</div>
                <div style={s.kpiMiniLbl}>Em Aberto</div>
              </div>
              <div style={s.kpiMiniCard}>
                <div style={{ ...s.kpiMiniVal, color: '#ef4444' }}>{stats.high}</div>
                <div style={s.kpiMiniLbl}>Alta Prioridade</div>
              </div>
              <div style={s.kpiMiniCard}>
                <div style={{ ...s.kpiMiniVal, color: '#10b981' }}>{stats.completed}</div>
                <div style={s.kpiMiniLbl}>Concluídas</div>
              </div>
            </div>
          </div>

          {/* Categorias / Agendas */}
          <div style={s.sidebarSection}>
            <div style={s.sidebarSectionHeaderRow}>
              <span style={s.sidebarSectionHeader}>Minhas Agendas</span>
              <button style={s.sidebarLinkBtn} onClick={selectAllCategories}>
                Todas
              </button>
            </div>
            <div style={s.categoryFilterList}>
              {CATEGORIES.map((cat) => {
                const color = getCategoryColor(cat);
                const isChecked = activeCategories.has(cat);
                return (
                  <label key={cat} style={s.categoryCheckItem}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCategory(cat)}
                      style={{ accentColor: color.bg }}
                    />
                    <span
                      style={{
                        ...s.categoryDot,
                        backgroundColor: color.bg,
                      }}
                    />
                    <span style={s.categoryCheckLabel}>{cat}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Calendar View Area */}
        <main style={s.gCalMain}>
          {loading ? (
            <div style={s.loadingBox}>Carregando agenda...</div>
          ) : viewMode === 'mes' ? (
            /* ── Visualização: Grade de Mês ── */
            <div style={s.monthViewWrapper}>
              {/* Cabeçalho dos dias da semana */}
              <div style={s.monthHeaderGrid}>
                {WEEKDAYS.map((wd, i) => (
                  <div key={i} style={s.monthHeaderCell}>
                    {wd.toUpperCase()}
                  </div>
                ))}
              </div>

              {/* Grade de dias do mês */}
              <div style={s.monthGrid}>
                {monthDaysGrid.map(({ date, isCurrentMonth, dayNum }, idx) => {
                  const dateKey = formatDateISO(date);
                  const isToday = dateKey === todayStr;
                  const dayEvents = activitiesByDate[dateKey] || [];

                  return (
                    <div
                      key={idx}
                      style={{
                        ...s.monthCell,
                        ...(isCurrentMonth ? {} : s.monthCellOtherMonth),
                        ...(isToday ? s.monthCellToday : {}),
                      }}
                      onClick={() => handleOpenCreate(date)}
                    >
                      <div style={s.monthCellTop}>
                        <span
                          style={{
                            ...s.monthDayNumber,
                            ...(isToday ? s.monthDayNumberToday : {}),
                            ...(isCurrentMonth ? {} : s.monthDayNumberMuted),
                          }}
                        >
                          {dayNum}
                        </span>
                      </div>

                      {/* Lista de Eventos no Dia */}
                      <div style={s.monthCellEvents}>
                        {dayEvents.slice(0, 3).map((act) => {
                          const catColor = getCategoryColor(act.categoria);
                          return (
                            <div
                              key={act._id}
                              style={{
                                ...s.eventChip,
                                backgroundColor: catColor.bg,
                                color: catColor.text,
                                opacity: act.concluida ? 0.5 : 1,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailsEvent(act);
                              }}
                              title={`${act.hora ? act.hora + ' - ' : ''}${act.titulo}`}
                            >
                              <span style={s.eventChipTime}>{act.hora || '•'}</span>
                              <span style={s.eventChipTitle}>{act.titulo}</span>
                            </div>
                          );
                        })}

                        {dayEvents.length > 3 && (
                          <div
                            style={s.moreEventsPill}
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewDate(date);
                              setViewMode('agenda');
                            }}
                          >
                            +{dayEvents.length - 3} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === 'semana' ? (
            /* ── Visualização: Grade de Semana ── */
            <div style={s.weekViewWrapper}>
              <div style={s.weekHeaderGrid}>
                {weekDays.map((d, i) => {
                  const dateKey = formatDateISO(d);
                  const isToday = dateKey === todayStr;
                  return (
                    <div
                      key={i}
                      style={{
                        ...s.weekHeaderCell,
                        ...(isToday ? s.weekHeaderCellToday : {}),
                      }}
                    >
                      <div style={s.weekHeaderWeekday}>{WEEKDAYS[d.getDay()]}</div>
                      <div
                        style={{
                          ...s.weekHeaderDayNum,
                          ...(isToday ? s.weekHeaderDayNumToday : {}),
                        }}
                      >
                        {d.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={s.weekColumnsGrid}>
                {weekDays.map((d, i) => {
                  const dateKey = formatDateISO(d);
                  const isToday = dateKey === todayStr;
                  const dayEvents = activitiesByDate[dateKey] || [];

                  return (
                    <div
                      key={i}
                      style={{
                        ...s.weekColumn,
                        ...(isToday ? s.weekColumnToday : {}),
                      }}
                      onClick={() => handleOpenCreate(d)}
                    >
                      {dayEvents.length === 0 ? (
                        <div style={s.weekEmptyCol}>Clique para agendar</div>
                      ) : (
                        dayEvents.map((act) => {
                          const catColor = getCategoryColor(act.categoria);
                          return (
                            <div
                              key={act._id}
                              style={{
                                ...s.weekEventCard,
                                borderLeftColor: catColor.bg,
                                backgroundColor: catColor.lightBg,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailsEvent(act);
                              }}
                            >
                              <div style={s.weekEventTime}>{act.hora || 'Horário flexível'}</div>
                              <div style={s.weekEventTitle}>{act.titulo}</div>
                              {act.local && <div style={s.weekEventSub}>{act.local}</div>}
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Visualização: Agenda / Lista Cronológica ── */
            <div style={s.agendaViewWrapper}>
              {filteredActivities.length === 0 ? (
                <div style={s.agendaEmpty}>
                  Nenhuma atividade encontrada com os filtros selecionados.
                </div>
              ) : (
                <div style={s.agendaList}>
                  {filteredActivities.map((act) => {
                    const catColor = getCategoryColor(act.categoria);
                    const prio = PRIORITIES.find((p) => p.value === act.prioridade) || PRIORITIES[1];
                    const actDate = parseActivityDate(act.data);
                    const isMeet = act.local && (act.local.startsWith('http://') || act.local.startsWith('https://'));

                    return (
                      <div
                        key={act._id}
                        style={{
                          ...s.agendaCard,
                          borderLeftColor: catColor.bg,
                          opacity: act.concluida ? 0.6 : 1,
                        }}
                        onClick={() => setDetailsEvent(act)}
                      >
                        <div style={s.agendaCardDateCol}>
                          <div style={s.agendaCardDayNumber}>{actDate.getDate()}</div>
                          <div style={s.agendaCardMonth}>
                            {MONTHS[actDate.getMonth()]?.slice(0, 3)}
                          </div>
                          <div style={s.agendaCardWeekday}>{WEEKDAYS[actDate.getDay()]}</div>
                        </div>

                        <div style={s.agendaCardContent}>
                          <div style={s.agendaCardTopRow}>
                            <span
                              style={{
                                ...s.categoryPill,
                                backgroundColor: catColor.lightBg,
                                color: catColor.bg,
                              }}
                            >
                              {act.categoria}
                            </span>
                            <span style={{ ...s.priorityText, color: prio.color }}>
                              Prioridade {prio.label}
                            </span>
                            {act.concluida && <span style={s.completedTag}>Concluída</span>}
                          </div>

                          <h3 style={s.agendaCardTitle}>{act.titulo}</h3>

                          <div style={s.agendaCardMeta}>
                            {act.hora && <span>Horário: {act.hora}</span>}
                            {act.local && (
                              <span>
                                Local: {isMeet ? 'Link Online (Meet)' : act.local}
                              </span>
                            )}
                            {act.responsavel && <span>Resp.: {act.responsavel}</span>}
                          </div>

                          {act.descricao && (
                            <div style={s.agendaCardDesc}>{renderTextWithLinks(act.descricao)}</div>
                          )}
                        </div>

                        <div style={s.agendaCardActions}>
                          <button
                            style={s.agendaActionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setReminderModalItem(act);
                            }}
                          >
                            Disparar E-mail
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Modais ── */}
      {detailsEvent && (
        <EventDetailsModal
          event={detailsEvent}
          onClose={() => setDetailsEvent(null)}
          onEdit={(e) => {
            setDetailsEvent(null);
            setFormModalItem(e);
          }}
          onDelete={(e) => handleDelete(e)}
          onToggleComplete={(e) => handleToggleComplete(e)}
          onOpenReminderModal={(e) => {
            setDetailsEvent(null);
            setReminderModalItem(e);
          }}
        />
      )}

      {reminderModalItem && (
        <ManualReminderModal
          activities={activities}
          preselectedEvent={reminderModalItem === 'open' ? null : reminderModalItem}
          onClose={() => setReminderModalItem(null)}
          onSent={() => {
            setReminderModalItem(null);
            fetchActivities();
          }}
        />
      )}

      {formModalItem && (
        <EventFormModal
          item={formModalItem === 'new' ? null : formModalItem}
          initialDate={formInitialDate}
          onClose={() => {
            setFormModalItem(null);
            setFormInitialDate(null);
          }}
          onSaved={() => {
            setFormModalItem(null);
            setFormInitialDate(null);
            fetchActivities();
          }}
        />
      )}
    </div>
  );
}

// ── Estilos Google Agenda (Dark Theme) ────────────────────────
const s = {
  googleAgendaWrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 120px)',
    minHeight: 650,
    background: 'var(--bg)',
    color: 'var(--text-primary)',
    margin: '-16px -16px 0 -16px',
    overflow: 'hidden',
  },

  // ── Header Superior ──
  gCalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--card-bg)',
    gap: 16,
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  todayBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '7px 14px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  navArrows: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  arrowBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 20,
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  currentMonthTitle: {
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
    color: 'var(--text-primary)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  searchBox: {
    position: 'relative',
    width: 220,
  },
  searchInput: {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '7px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    outline: 'none',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 11,
  },
  viewToggleGroup: {
    display: 'flex',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
  },
  viewToggleBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    padding: '7px 12px',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
  viewToggleBtnActive: {
    background: 'var(--border)',
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  tomorrowCheckBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    padding: '7px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    cursor: 'pointer',
  },
  manualReminderHeaderBtn: {
    background: 'rgba(2, 132, 199, 0.15)',
    border: '1px solid #0284c7',
    color: '#38bdf8',
    padding: '7px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  gCalCreateBtn: {
    background: '#0284c7',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
  },

  // ── Corpo da Agenda ──
  gCalBody: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },

  // ── Sidebar Lateral ──
  gCalSidebar: {
    width: 260,
    minWidth: 240,
    borderRight: '1px solid var(--border)',
    background: 'var(--card-bg)',
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    flexShrink: 0,
  },
  sidebarSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sidebarSectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarSectionHeader: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sidebarLinkBtn: {
    background: 'transparent',
    border: 'none',
    color: '#0284c7',
    fontSize: 11,
    cursor: 'pointer',
  },
  kpiMiniGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  kpiMiniCard: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '8px 10px',
  },
  kpiMiniVal: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  kpiMiniLbl: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  categoryFilterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  categoryCheckItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    cursor: 'pointer',
    color: 'var(--text-primary)',
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  categoryCheckLabel: {
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  // ── Mini Calendário ──
  miniCal: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  miniCalWeekdays: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    textAlign: 'center',
  },
  miniCalWeekday: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  miniCalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 2,
  },
  miniCalCellEmpty: {
    height: 26,
  },
  miniCalCell: {
    height: 26,
    background: 'transparent',
    border: 'none',
    borderRadius: '50%',
    color: 'var(--text-primary)',
    fontSize: 11,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCalCellToday: {
    border: '1px solid #0284c7',
    fontWeight: 700,
    color: '#0284c7',
  },
  miniCalCellSelected: {
    background: '#0284c7',
    color: '#ffffff',
    fontWeight: 700,
  },

  // ── Área Principal do Calendário ──
  gCalMain: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: 'var(--bg)',
  },
  loadingBox: {
    padding: 40,
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: 14,
  },

  // ── Grade Mensal (Month View) ──
  monthViewWrapper: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  monthHeaderGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    borderBottom: '1px solid var(--border)',
    background: 'var(--card-bg)',
    flexShrink: 0,
  },
  monthHeaderCell: {
    padding: '8px 4px',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: 0.5,
  },
  monthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gridAutoRows: '1fr',
    flex: 1,
    overflowY: 'auto',
  },
  monthCell: {
    borderRight: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
    padding: '6px 6px',
    minHeight: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    cursor: 'pointer',
    background: 'var(--bg)',
    transition: 'background 0.1s',
  },
  monthCellOtherMonth: {
    background: 'rgba(0, 0, 0, 0.18)',
    opacity: 0.5,
  },
  monthCellToday: {
    background: 'rgba(2, 132, 199, 0.05)',
  },
  monthCellTop: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 2,
  },
  monthDayNumber: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDayNumberToday: {
    background: '#0284c7',
    color: '#ffffff',
    fontWeight: 700,
  },
  monthDayNumberMuted: {
    color: 'var(--text-muted)',
  },
  monthCellEvents: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    overflow: 'hidden',
  },
  eventChip: {
    fontSize: 11,
    fontWeight: 500,
    padding: '2px 6px',
    borderRadius: 3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    cursor: 'pointer',
  },
  eventChipTime: {
    fontSize: 10,
    fontWeight: 700,
    opacity: 0.9,
  },
  eventChipTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  moreEventsPill: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-muted)',
    padding: '1px 4px',
    cursor: 'pointer',
  },

  // ── Grade Semanal (Week View) ──
  weekViewWrapper: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  weekHeaderGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    borderBottom: '1px solid var(--border)',
    background: 'var(--card-bg)',
    flexShrink: 0,
  },
  weekHeaderCell: {
    padding: '10px 4px',
    textAlign: 'center',
    borderRight: '1px solid var(--border)',
  },
  weekHeaderCellToday: {
    background: 'rgba(2, 132, 199, 0.08)',
  },
  weekHeaderWeekday: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  weekHeaderDayNum: {
    fontSize: 18,
    fontWeight: 700,
    marginTop: 4,
    color: 'var(--text-primary)',
  },
  weekHeaderDayNumToday: {
    color: '#0284c7',
  },
  weekColumnsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    flex: 1,
    overflowY: 'auto',
  },
  weekColumn: {
    borderRight: '1px solid var(--border)',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    cursor: 'pointer',
  },
  weekColumnToday: {
    background: 'rgba(2, 132, 199, 0.03)',
  },
  weekEmptyCol: {
    fontSize: 11,
    color: 'var(--text-muted)',
    opacity: 0.4,
    textAlign: 'center',
    marginTop: 20,
  },
  weekEventCard: {
    borderLeft: '4px solid #0284c7',
    borderRadius: 'var(--radius)',
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    cursor: 'pointer',
  },
  weekEventTime: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  weekEventTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  weekEventSub: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },

  // ── Agenda / Lista Cronológica ──
  agendaViewWrapper: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
  },
  agendaEmpty: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--text-muted)',
    fontSize: 14,
  },
  agendaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxWidth: 900,
    margin: '0 auto',
  },
  agendaCard: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderLeft: '5px solid #0284c7',
    borderRadius: 'var(--radius)',
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    cursor: 'pointer',
  },
  agendaCardDateCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 50,
    borderRight: '1px solid var(--border)',
    paddingRight: 14,
  },
  agendaCardDayNumber: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  agendaCardMonth: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#0284c7',
  },
  agendaCardWeekday: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  agendaCardContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  agendaCardTopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  categoryPill: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: 600,
  },
  completedTag: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: 600,
  },
  agendaCardTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: '2px 0',
    color: 'var(--text-primary)',
  },
  agendaCardMeta: {
    display: 'flex',
    gap: 14,
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  agendaCardDesc: {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 4,
  },
  agendaCardActions: {
    display: 'flex',
    alignItems: 'center',
  },
  agendaActionBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '6px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    cursor: 'pointer',
  },

  // ── Modais ──
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
  detailsModal: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    width: '100%',
    maxWidth: 520,
    overflow: 'hidden',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
  },
  detailsHeaderBar: {
    padding: '12px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#ffffff',
  },
  detailsHeaderCategory: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailsCloseBtn: {
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: 16,
    cursor: 'pointer',
  },
  detailsContent: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  detailsTopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  priorityPill: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid',
  },
  completedPill: {
    fontSize: 11,
    fontWeight: 600,
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    padding: '2px 8px',
    borderRadius: 4,
  },
  detailsTitle: {
    fontSize: 19,
    fontWeight: 700,
    margin: 0,
    color: 'var(--text-primary)',
  },
  detailsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    borderTop: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
    padding: '12px 0',
  },
  detailsRow: {
    display: 'flex',
    gap: 8,
    fontSize: 13,
  },
  detailsLabel: {
    fontWeight: 600,
    color: 'var(--text-muted)',
    minWidth: 90,
  },
  detailsValue: {
    color: 'var(--text-primary)',
    flex: 1,
  },
  meetLink: {
    color: '#0284c7',
    textDecoration: 'underline',
  },
  detailsDescBox: {
    marginTop: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  detailsDescText: {
    fontSize: 13,
    color: 'var(--text-muted)',
    background: 'var(--bg)',
    padding: '10px 12px',
    borderRadius: 'var(--radius)',
    whiteSpace: 'pre-wrap',
  },
  detailsActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  actionBtnSecondary: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '7px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    cursor: 'pointer',
  },
  actionBtnEmail: {
    background: '#0284c7',
    border: 'none',
    color: '#ffffff',
    padding: '7px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  actionBtnDanger: {
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    padding: '7px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    cursor: 'pointer',
  },

  // ── Modal de Formulário ──
  formModal: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    width: '100%',
    maxWidth: 580,
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '24px',
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    color: 'var(--text-primary)',
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
    gap: 14,
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
  formLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  formInput: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '9px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 14,
    outline: 'none',
  },
  formSelect: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '9px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
  },
  formTextarea: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '9px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
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
    accentColor: '#0284c7',
  },
  checkboxSub: {
    color: 'var(--text-muted)',
    fontSize: 12,
  },
  formFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    padding: '9px 16px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    cursor: 'pointer',
  },
  submitBtn: {
    background: '#0284c7',
    border: 'none',
    color: '#ffffff',
    padding: '9px 18px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },

  // ── Modal de Disparo Manual de Lembrete ──
  reminderModal: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    width: '100%',
    maxWidth: 540,
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '24px',
  },
  reminderModalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid var(--border)',
  },
  reminderModalSubtitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0284c7',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  reminderModalTitle: {
    fontSize: 18,
    fontWeight: 700,
    margin: '4px 0 0 0',
    color: 'var(--text-primary)',
  },
  eventPreviewBox: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  eventPreviewTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
  },
  eventPreviewCat: {
    fontWeight: 600,
    color: '#0284c7',
  },
  eventPreviewDate: {
    color: 'var(--text-muted)',
  },
  eventPreviewTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  eventPreviewSub: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  eventPreviewDesc: {
    fontSize: 12,
    color: 'var(--text-muted)',
    borderTop: '1px dashed var(--border)',
    paddingTop: 6,
    marginTop: 4,
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 12px',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--text-primary)',
  },
  radioSub: {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
};

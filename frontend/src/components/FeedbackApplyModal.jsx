import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { getFeedbackResponses, saveFeedbackResponse } from '../services/api';

function NoteInput({ tipo, value, onChange }) {
  const max = tipo === 'nota10' ? 10 : 5;
  if (tipo === 'aberta') {
    return (
      <textarea
        style={si.textarea}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escreva seu feedback..."
        rows={3}
      />
    );
  }
  return (
    <div style={si.noteRow}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          style={{
            ...si.noteBtn,
            ...(value === n ? si.noteBtnActive : {}),
          }}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function CriterioItem({ criterio, resposta, onChange }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={si.criterioBlock}>
      <button
        type="button"
        style={si.criterioHeader}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={si.criterioTitulo}>
          {criterio.pergunta}
          {criterio.obrigatorio && <span style={si.req}> *</span>}
        </span>
        <span style={si.tipoLabel}>
          {criterio.tipo === 'nota5'
            ? '1–5'
            : criterio.tipo === 'nota10'
            ? '1–10'
            : 'Aberta'}
        </span>
        <span style={si.chevron}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={si.criterioBody}>
          <NoteInput
            tipo={criterio.tipo}
            value={resposta?.valor}
            onChange={(val) => onChange('valor', val)}
          />
          {criterio.tipo !== 'aberta' && (
            <input
              style={si.commentInput}
              placeholder="Comentário opcional..."
              value={resposta?.comentario || ''}
              onChange={(e) => onChange('comentario', e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function FeedbackApplyModal({ campaign, avaliadorId, onClose }) {
  const [activeTab, setActiveTab] = useState(null);
  const [responses, setResponses] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedKeys, setSavedKeys] = useState({});
  const debounceRef = useRef({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const members = (campaign.membros || []).filter(
    (m) => (typeof m === 'object' ? m._id : m) !== avaliadorId
  );
  const areas = campaign.areas || [];
  const criterios = campaign.criterios || [];

  const tabs = [
    ...members.map((m) => ({
      key: `membro_${typeof m === 'object' ? m._id : m}`,
      label: typeof m === 'object' ? m.nome : m,
      tipo: 'membro',
      alvo: typeof m === 'object' ? m._id : m,
      nome: typeof m === 'object' ? m.nome : m,
    })),
    ...areas.map((area) => ({
      key: `area_${area}`,
      label: area,
      tipo: 'area',
      alvo: area,
      nome: area,
    })),
  ];

  useEffect(() => {
    if (tabs.length > 0 && !activeTab) {
      setActiveTab(tabs[0].key);
    }
  }, [tabs, activeTab]);

  // Load existing responses
  useEffect(() => {
    if (!avaliadorId) return;
    getFeedbackResponses(campaign._id, { avaliadorId })
      .then((data) => {
        const map = {};
        data.forEach((r) => {
          const key =
            r.tipo === 'membro'
              ? `membro_${typeof r.avaliado === 'object' ? r.avaliado._id : r.avaliado}`
              : `area_${r.area}`;
          map[key] = r.respostas || [];
          if (r.concluido) setSavedKeys((prev) => ({ ...prev, [key]: 'concluido' }));
        });
        setResponses(map);
      })
      .catch(() => {});
  }, [campaign._id, avaliadorId]);

  function getRespostaForCriterio(tabKey, criterioId) {
    const list = responses[tabKey] || [];
    return list.find((r) => r.criterioId === criterioId);
  }

  function updateResposta(tabKey, criterioId, field, value) {
    setResponses((prev) => {
      const list = prev[tabKey] || [];
      const existing = list.find((r) => r.criterioId === criterioId);
      let next;
      if (existing) {
        next = list.map((r) =>
          r.criterioId === criterioId ? { ...r, [field]: value } : r
        );
      } else {
        const criterio = criterios.find(
          (c) => (c._id || c.id || c.pergunta) === criterioId
        );
        next = [
          ...list,
          {
            criterioId,
            pergunta: criterio?.pergunta || '',
            tipoCriterio: criterio?.tipo || 'nota5',
            [field]: value,
          },
        ];
      }
      scheduleSave(tabKey, next, false);
      return { ...prev, [tabKey]: next };
    });
  }

  const scheduleSave = useCallback(
    (tabKey, respostasList, concluido) => {
      if (debounceRef.current[tabKey]) clearTimeout(debounceRef.current[tabKey]);
      debounceRef.current[tabKey] = setTimeout(() => {
        doSave(tabKey, respostasList, concluido);
      }, 1200);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [campaign._id, avaliadorId, tabs]
  );

  async function doSave(tabKey, respostasList, concluido) {
    const tab = tabs.find((t) => t.key === tabKey);
    if (!tab) return;
    setSaving(true);
    try {
      const body = {
        avaliador: avaliadorId,
        tipo: tab.tipo,
        respostas: respostasList,
        concluido,
      };
      if (tab.tipo === 'membro') body.avaliado = tab.alvo;
      if (tab.tipo === 'area') body.area = tab.alvo;

      await saveFeedbackResponse(campaign._id, body);
      if (concluido) {
        setSavedKeys((prev) => ({ ...prev, [tabKey]: 'concluido' }));
      }
    } catch {
      // silently fail autosave
    } finally {
      setSaving(false);
    }
  }

  async function handleConcluir(tabKey) {
    const tab = tabs.find((t) => t.key === tabKey);
    if (!tab) return;

    // Validate required criteria (notas e campos de texto)
    const missing = criterios.filter((c) => {
      if (!c.obrigatorio) return false;
      const cid = c._id || c.id || c.pergunta;
      const r = getRespostaForCriterio(tabKey, cid);
      const val = r?.valor;
      if (val === undefined || val === null) return true;
      if (typeof val === 'string' && val.trim() === '') return true;
      return false;
    });

    if (missing.length > 0) {
      toast.error(`Preencha os critérios obrigatórios: ${missing.map((m) => m.pergunta).join(', ')}`);
      return;
    }

    // Cancel debounce and save immediately
    if (debounceRef.current[tabKey]) clearTimeout(debounceRef.current[tabKey]);
    await doSave(tabKey, responses[tabKey] || [], true);
    toast.success(`Avaliação de "${tab.nome}" concluída!`);
  }

  function isTabConcluido(tabKey) {
    return savedKeys[tabKey] === 'concluido';
  }

  function completionCount() {
    return tabs.filter((t) => isTabConcluido(t.key)).length;
  }

  const currentTab = tabs.find((t) => t.key === activeTab);

  const hasUnsaved = Object.keys(responses).some(
    (key) => (responses[key] || []).length > 0 && !isTabConcluido(key)
  );

  function handleClose() {
    if (hasUnsaved) {
      if (!window.confirm('Você tem avaliações não concluídas. O progresso parcial foi salvo automaticamente, mas é necessário clicar em "Concluir" em cada avaliação para registrá-la. Deseja sair mesmo assim?')) return;
    }
    onClose();
  }

  const prazo = campaign.dataEncerramento
    ? new Date(campaign.dataEncerramento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : null;

  const concluidos = completionCount();
  const total = tabs.length;

  return (
    <div style={si.overlay} onClick={handleClose}>
      <div style={si.modal} onClick={(e) => e.stopPropagation()}>
        <div style={si.header}>
          <div>
            <h2 style={si.title}>Preencher Feedback</h2>
            <p style={si.subtitle}>{campaign.nome}</p>
            {prazo && (
              <p style={si.prazo}>
                Prazo: <strong>{prazo}</strong>
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={si.progressLabel}>
              {concluidos}/{total} concluídos
            </span>
            {saving && <span style={si.savingBadge}>Salvando...</span>}
            <button onClick={handleClose} style={si.closeBtn}>✕</button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={si.progressBar}>
          <div
            style={{
              ...si.progressFill,
              width: `${tabs.length > 0 ? (completionCount() / tabs.length) * 100 : 0}%`,
            }}
          />
        </div>

        <div style={{ ...si.layout, flexDirection: isMobile ? 'column' : 'row' }}>
          {/* Sidebar — vertical no desktop, horizontal no mobile */}
          <div style={isMobile ? si.sidebarMobile : si.sidebar}>
            {tabs.map((t) => (
              <button
                key={t.key}
                style={{
                  ...(isMobile ? si.sideTabMobile : si.sideTab),
                  ...(activeTab === t.key
                    ? isMobile ? si.sideTabMobileActive : si.sideTabActive
                    : {}),
                }}
                onClick={() => setActiveTab(t.key)}
              >
                <span style={isMobile ? si.sideTabNameMobile : si.sideTabName}>
                  {t.label}
                </span>
                {isTabConcluido(t.key) && (
                  <span style={si.checkmark}>✓</span>
                )}
              </button>
            ))}
            {tabs.length === 0 && (
              <p style={si.muted}>Nenhuma avaliação configurada</p>
            )}
          </div>

          {/* Conteúdo da tab ativa */}
          <div style={si.content}>
            {currentTab ? (
              <>
                <div style={si.contentHeader}>
                  <h3 style={si.contentTitle}>
                    Avaliando:{' '}
                    <span style={{ color: 'var(--primary)' }}>
                      {currentTab.nome}
                    </span>
                  </h3>
                  {isTabConcluido(currentTab.key) && (
                    <span style={si.concluidoBadge}>Concluído ✓</span>
                  )}
                </div>

                <div style={si.criteriosList}>
                  {criterios.map((c, idx) => {
                    const cid = c._id || c.id || c.pergunta;
                    const resposta = getRespostaForCriterio(activeTab, cid);
                    return (
                      <CriterioItem
                        key={cid || idx}
                        criterio={c}
                        resposta={resposta}
                        onChange={(field, value) =>
                          updateResposta(activeTab, cid, field, value)
                        }
                      />
                    );
                  })}
                  {criterios.length === 0 && (
                    <p style={si.muted}>Nenhum critério configurado</p>
                  )}
                </div>

                {!isTabConcluido(currentTab.key) && criterios.length > 0 && (
                  <div style={si.tabActions}>
                    <button
                      style={si.concluirBtn}
                      onClick={() => handleConcluir(currentTab.key)}
                    >
                      Concluir esta avaliação
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={si.emptyContent}>
                <p style={si.muted}>Selecione um membro ou área para avaliar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const si = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
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
    maxWidth: 900,
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '20px 24px 12px',
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--text-muted)',
    margin: '4px 0 0',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 18,
    cursor: 'pointer',
    padding: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  prazo: {
    fontSize: 12,
    color: 'var(--text-muted)',
    margin: '4px 0 0',
  },
  savingBadge: {
    fontSize: 11,
    color: 'var(--text-muted)',
    background: 'var(--bg-card2)',
    padding: '2px 8px',
    borderRadius: 10,
  },
  progressBar: {
    height: 3,
    background: 'var(--border)',
    flexShrink: 0,
  },
  progressFill: {
    height: '100%',
    background: 'var(--success)',
    transition: 'width 0.3s',
  },
  layout: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  sidebar: {
    width: 200,
    flexShrink: 0,
    borderRight: '1px solid var(--border)',
    overflowY: 'auto',
    padding: '12px 0',
  },
  sidebarMobile: {
    display: 'flex',
    flexDirection: 'row',
    overflowX: 'auto',
    borderBottom: '1px solid var(--border)',
    padding: '0 8px',
    flexShrink: 0,
  },
  sideSection: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    padding: '4px 14px',
  },
  sideTab: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderLeft: '3px solid transparent',
    padding: '9px 14px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 13,
    color: 'var(--text-muted)',
    transition: 'background 0.1s',
  },
  sideTabActive: {
    color: 'var(--text)',
    background: 'rgba(168,3,3,0.08)',
    borderLeft: '3px solid var(--primary)',
  },
  sideTabMobile: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '10px 12px',
    cursor: 'pointer',
    fontSize: 12,
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  sideTabMobileActive: {
    color: 'var(--text)',
    borderBottom: '2px solid var(--primary)',
  },
  sideTabNameMobile: {
    fontSize: 12,
  },
  sideTabName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 13,
  },
  checkmark: {
    color: 'var(--success)',
    fontSize: 12,
    marginLeft: 4,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: 24,
  },
  contentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 8,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text)',
    margin: 0,
  },
  concluidoBadge: {
    background: 'rgba(34,197,94,0.15)',
    color: 'var(--success)',
    border: '1px solid var(--success)',
    borderRadius: 20,
    padding: '3px 12px',
    fontSize: 12,
    fontWeight: 600,
  },
  criteriosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  criterioBlock: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  criterioHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'transparent',
    border: 'none',
    padding: '12px 16px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  criterioTitulo: {
    flex: 1,
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text)',
  },
  req: { color: 'var(--primary)' },
  tipoLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '2px 8px',
    whiteSpace: 'nowrap',
  },
  chevron: {
    fontSize: 10,
    color: 'var(--text-muted)',
  },
  criterioBody: {
    padding: '0 16px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  noteRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  noteBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-muted)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.1s, color 0.1s',
  },
  noteBtnActive: {
    background: 'var(--primary)',
    color: '#fff',
    borderColor: 'var(--primary)',
  },
  textarea: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: 13,
    resize: 'vertical',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  },
  commentInput: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    padding: '7px 12px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  },
  tabActions: {
    marginTop: 20,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  concluirBtn: {
    background: 'var(--success)',
    border: 'none',
    color: '#fff',
    borderRadius: 6,
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  emptyContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  muted: {
    color: 'var(--text-muted)',
    fontSize: 13,
    fontStyle: 'italic',
    margin: 0,
  },
};

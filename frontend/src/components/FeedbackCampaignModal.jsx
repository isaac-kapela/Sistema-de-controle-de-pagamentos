import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  createFeedbackCampaign,
  updateFeedbackCampaign,
  getMembers,
} from '../services/api';

const TIPOS = [
  { value: 'pos-offseason', label: 'Pós-Offseason' },
  { value: 'pos-relatorio', label: 'Pós-Relatório' },
  { value: 'pos-competicao', label: 'Pós-Competição' },
  { value: 'outro', label: 'Outro (customizável)' },
];

const CRITERIOS_SUGERIDOS = [
  'Comunicação',
  'Trabalho em equipe',
  'Organização',
  'Liderança',
  'Comprometimento',
  'Entrega técnica',
  'Criatividade',
];

const EMPTY = {
  nome: '',
  tipo: 'pos-offseason',
  tipoCustom: '',
  dataInicio: '',
  dataEncerramento: '',
  descricao: '',
  status: 'ativo',
  membros: [],
  areas: [],
  criterios: [],
  anonimo: false,
};

function Section({ title, children }) {
  return (
    <div style={s.section}>
      <div style={s.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children, req }) {
  return (
    <div style={s.field}>
      <label style={s.label}>
        {label}
        {req && <span style={s.asterisk}> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function FeedbackCampaignModal({ onClose, onSaved, campaign }) {
  const isEdit = Boolean(campaign);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [novaArea, setNovaArea] = useState('');
  const [novaCriterioTexto, setNovaCriterioTexto] = useState('');
  const [novaCriterioTipo, setNovaCriterioTipo] = useState('nota5');
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    getMembers()
      .then((data) => setMembers(data.filter((m) => m.tipoMembro !== 'ex-membro')))
      .catch(() => toast.error('Erro ao carregar membros'))
      .finally(() => setLoadingMembers(false));
  }, []);

  useEffect(() => {
    if (campaign) {
      setForm({
        ...EMPTY,
        ...campaign,
        membros: (campaign.membros || []).map((m) =>
          typeof m === 'object' ? m._id : m
        ),
        dataInicio: campaign.dataInicio
          ? campaign.dataInicio.slice(0, 10)
          : '',
        dataEncerramento: campaign.dataEncerramento
          ? campaign.dataEncerramento.slice(0, 10)
          : '',
      });
    }
  }, [campaign]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleMembro(id) {
    set(
      'membros',
      form.membros.includes(id)
        ? form.membros.filter((m) => m !== id)
        : [...form.membros, id]
    );
  }

  function addArea() {
    const trimmed = novaArea.trim();
    if (!trimmed || form.areas.includes(trimmed)) return;
    set('areas', [...form.areas, trimmed]);
    setNovaArea('');
  }

  function removeArea(area) {
    set('areas', form.areas.filter((a) => a !== area));
  }

  function addCriterio() {
    const texto = novaCriterioTexto.trim();
    if (!texto) return;
    set('criterios', [
      ...form.criterios,
      { pergunta: texto, tipo: novaCriterioTipo, obrigatorio: true },
    ]);
    setNovaCriterioTexto('');
  }

  function removeCriterio(idx) {
    set(
      'criterios',
      form.criterios.filter((_, i) => i !== idx)
    );
  }

  function updateCriterio(idx, field, value) {
    set(
      'criterios',
      form.criterios.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  }

  function addSugerido(texto) {
    if (form.criterios.some((c) => c.pergunta === texto)) return;
    set('criterios', [
      ...form.criterios,
      { pergunta: texto, tipo: 'nota5', obrigatorio: true },
    ]);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error('Informe o nome do feedback');
      setActiveTab('info');
      return;
    }
    if (!form.dataInicio || !form.dataEncerramento) {
      toast.error('Informe as datas de início e encerramento');
      setActiveTab('info');
      return;
    }
    if (form.criterios.length === 0) {
      toast.error('Adicione ao menos um critério de avaliação');
      setActiveTab('criterios');
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await updateFeedbackCampaign(campaign._id, form);
        toast.success('Feedback atualizado com sucesso');
      } else {
        await createFeedbackCampaign(form);
        toast.success('Feedback criado com sucesso');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar feedback');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'info', label: 'Informações' },
    { key: 'membros', label: `Membros (${form.membros.length})` },
    { key: 'areas', label: `Áreas (${form.areas.length})` },
    { key: 'criterios', label: `Critérios (${form.criterios.length})` },
  ];

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <h2 style={s.title}>
            {isEdit ? 'Editar Feedback' : 'Novo Feedback'}
          </h2>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {/* Tabs internas */}
        <div style={s.tabBar}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                ...s.tab,
                ...(activeTab === t.key ? s.tabActive : {}),
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={s.body}>

            {/* ── Aba: Informações ── */}
            {activeTab === 'info' && (
              <>
                <Section title="Informações Gerais">
                  <Field label="Nome do Feedback" req>
                    <input
                      style={s.input}
                      value={form.nome}
                      onChange={(e) => set('nome', e.target.value)}
                      placeholder="Ex: Feedback Pós-Competição 2025"
                      required
                    />
                  </Field>

                  <div style={s.row}>
                    <Field label="Tipo" req>
                      <select
                        style={s.input}
                        value={form.tipo}
                        onChange={(e) => set('tipo', e.target.value)}
                      >
                        {TIPOS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Status">
                      <select
                        style={s.input}
                        value={form.status}
                        onChange={(e) => set('status', e.target.value)}
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </Field>
                  </div>

                  {form.tipo === 'outro' && (
                    <Field label="Tipo Customizado" req>
                      <input
                        style={s.input}
                        value={form.tipoCustom}
                        onChange={(e) => set('tipoCustom', e.target.value)}
                        placeholder="Descreva o tipo"
                      />
                    </Field>
                  )}
                </Section>

                <Section title="Período">
                  <div style={s.row}>
                    <Field label="Data de Início" req>
                      <input
                        style={s.input}
                        type="date"
                        value={form.dataInicio}
                        onChange={(e) => set('dataInicio', e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Data de Encerramento" req>
                      <input
                        style={s.input}
                        type="date"
                        value={form.dataEncerramento}
                        onChange={(e) => set('dataEncerramento', e.target.value)}
                        required
                      />
                    </Field>
                  </div>

                  <Field label="Descrição (opcional)">
                    <textarea
                      style={{ ...s.input, minHeight: 80, resize: 'vertical' }}
                      value={form.descricao}
                      onChange={(e) => set('descricao', e.target.value)}
                      placeholder="Contexto ou instruções para os avaliadores..."
                    />
                  </Field>

                  <label style={s.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={form.anonimo}
                      onChange={(e) => set('anonimo', e.target.checked)}
                      style={s.checkbox}
                    />
                    <span style={s.checkboxLabel}>Feedback anônimo</span>
                  </label>
                </Section>
              </>
            )}

            {/* ── Aba: Membros ── */}
            {activeTab === 'membros' && (
              <Section title="Participantes">
                <p style={s.hint}>
                  Selecione os membros que participarão (avaliarão e serão avaliados).
                </p>
                {loadingMembers ? (
                  <p style={s.muted}>Carregando membros...</p>
                ) : (
                  <div style={s.memberGrid}>
                    {members.map((m) => {
                      const selected = form.membros.includes(m._id);
                      return (
                        <label
                          key={m._id}
                          style={{
                            ...s.memberCard,
                            ...(selected ? s.memberCardSelected : {}),
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleMembro(m._id)}
                            style={{ display: 'none' }}
                          />
                          <div style={s.memberName}>{m.nome}</div>
                          {m.area && <div style={s.memberArea}>{m.area}</div>}
                        </label>
                      );
                    })}
                    {members.length === 0 && (
                      <p style={s.muted}>Nenhum membro encontrado</p>
                    )}
                  </div>
                )}
              </Section>
            )}

            {/* ── Aba: Áreas ── */}
            {activeTab === 'areas' && (
              <Section title="Áreas a Avaliar">
                <p style={s.hint}>
                  Informe as áreas da equipe que serão avaliadas.
                </p>
                <div style={s.addRow}>
                  <input
                    style={{ ...s.input, flex: 1 }}
                    value={novaArea}
                    onChange={(e) => setNovaArea(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addArea();
                      }
                    }}
                    placeholder="Ex: Aerodinâmica, Estruturas..."
                  />
                  <button type="button" style={s.addBtn} onClick={addArea}>
                    Adicionar
                  </button>
                </div>
                <div style={s.tags}>
                  {form.areas.map((area) => (
                    <span key={area} style={s.tag}>
                      {area}
                      <button
                        type="button"
                        style={s.tagRemove}
                        onClick={() => removeArea(area)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {form.areas.length === 0 && (
                    <span style={s.muted}>Nenhuma área adicionada</span>
                  )}
                </div>
              </Section>
            )}

            {/* ── Aba: Critérios ── */}
            {activeTab === 'criterios' && (
              <Section title="Critérios de Avaliação">
                <p style={s.hint}>Sugestões (clique para adicionar):</p>
                <div style={{ ...s.tags, marginBottom: 16 }}>
                  {CRITERIOS_SUGERIDOS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      style={s.sugestao}
                      onClick={() => addSugerido(c)}
                    >
                      + {c}
                    </button>
                  ))}
                </div>

                <div style={s.addRow}>
                  <input
                    style={{ ...s.input, flex: 1 }}
                    value={novaCriterioTexto}
                    onChange={(e) => setNovaCriterioTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCriterio();
                      }
                    }}
                    placeholder="Pergunta ou critério..."
                  />
                  <select
                    style={{ ...s.input, width: 130 }}
                    value={novaCriterioTipo}
                    onChange={(e) => setNovaCriterioTipo(e.target.value)}
                  >
                    <option value="nota5">Nota 1-5</option>
                    <option value="nota10">Nota 1-10</option>
                    <option value="aberta">Aberta</option>
                  </select>
                  <button type="button" style={s.addBtn} onClick={addCriterio}>
                    Adicionar
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  {form.criterios.map((c, idx) => (
                    <div key={idx} style={s.criterioRow}>
                      <input
                        style={{ ...s.input, flex: 1, fontSize: 13 }}
                        value={c.pergunta}
                        onChange={(e) =>
                          updateCriterio(idx, 'pergunta', e.target.value)
                        }
                      />
                      <select
                        style={{ ...s.input, width: 110, fontSize: 13 }}
                        value={c.tipo}
                        onChange={(e) =>
                          updateCriterio(idx, 'tipo', e.target.value)
                        }
                      >
                        <option value="nota5">Nota 1-5</option>
                        <option value="nota10">Nota 1-10</option>
                        <option value="aberta">Aberta</option>
                      </select>
                      <label style={{ ...s.checkboxRow, gap: 4, fontSize: 12 }}>
                        <input
                          type="checkbox"
                          checked={c.obrigatorio}
                          onChange={(e) =>
                            updateCriterio(idx, 'obrigatorio', e.target.checked)
                          }
                        />
                        Obrig.
                      </label>
                      <button
                        type="button"
                        style={s.removeBtn}
                        onClick={() => removeCriterio(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {form.criterios.length === 0 && (
                    <p style={s.muted}>Nenhum critério adicionado</p>
                  )}
                </div>
              </Section>
            )}
          </div>

          <div style={s.footer}>
            <button type="button" onClick={onClose} style={s.cancelBtn}>
              Cancelar
            </button>
            <button type="submit" style={s.submitBtn} disabled={loading}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
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
    maxWidth: 760,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 0',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 20,
    cursor: 'pointer',
    padding: 4,
    lineHeight: 1,
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid var(--border)',
    padding: '0 24px',
    gap: 0,
    marginTop: 16,
    overflowX: 'auto',
  },
  tab: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-muted)',
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'color 0.15s',
  },
  tabActive: {
    color: 'var(--text)',
    borderBottom: '2px solid var(--primary)',
    fontWeight: 700,
  },
  body: {
    overflowY: 'auto',
    padding: '20px 24px',
    flex: 1,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    padding: '16px 24px',
    borderTop: '1px solid var(--border)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 12,
    borderBottom: '1px solid var(--border)',
    paddingBottom: 6,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-muted)',
  },
  asterisk: { color: 'var(--primary)' },
  input: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    marginBottom: 8,
  },
  checkbox: { accentColor: 'var(--primary)', width: 16, height: 16 },
  checkboxLabel: { fontSize: 14, color: 'var(--text)' },
  hint: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginBottom: 12,
    margin: '0 0 12px',
  },
  muted: {
    color: 'var(--text-muted)',
    fontSize: 13,
    fontStyle: 'italic',
  },
  memberGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 10,
  },
  memberCard: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 12px',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  memberCardSelected: {
    borderColor: 'var(--primary)',
    background: 'rgba(168,3,3,0.1)',
  },
  memberName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: 2,
  },
  memberArea: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  addRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  addBtn: {
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 13,
    color: 'var(--text)',
  },
  tagRemove: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 11,
    padding: 0,
    lineHeight: 1,
  },
  sugestao: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    color: 'var(--text-muted)',
    padding: '4px 12px',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  criterioRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--bg-card2)',
    borderRadius: 8,
    padding: '8px 10px',
    border: '1px solid var(--border)',
  },
  removeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 13,
    padding: '2px 6px',
    borderRadius: 4,
    flexShrink: 0,
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
  submitBtn: {
    background: 'var(--primary)',
    border: 'none',
    color: '#fff',
    borderRadius: 6,
    padding: '9px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

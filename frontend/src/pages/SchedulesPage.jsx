import React, { useState, useEffect, useRef } from 'react';
import { parsePDF, getSchedules, createSchedule, deleteSchedule, clearAllSchedules } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ScheduleGrid from '../components/ScheduleGrid';
import toast from 'react-hot-toast';

const AREAS = [
  'Aerodinamica',
  'Aeroelasticidade',
  'Cargas',
  'Desempenho',
  'Eletrica',
  'Estabilidade e Controle',
  'Gestao e Design',
  'Plantas',
  'Estruturas e Ensaios Estruturais',
];

// Calcula aggregate a partir de uma lista de schedules
function buildAggregate(list) {
  const agg = {};
  for (const sc of list) {
    for (const slot of sc.slots) {
      const key = `${slot.day}-${slot.hour}`;
      agg[key] = (agg[key] || 0) + 1;
    }
  }
  return { total: list.length, aggregate: agg };
}

function firstName(nome) {
  return nome?.split(' ')[0] ?? nome;
}

export default function SchedulesPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab]             = useState('geral');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading]     = useState(true);

  // ── Meu Horário ──────────────────────────────────────────────
  const [uploading, setUploading]     = useState(false);
  const [parsed, setParsed]           = useState(null);
  const [editNome, setEditNome]       = useState('');
  const [editSemestre, setEditSemestre] = useState('');
  const [editArea, setEditArea]       = useState('');
  const [editCapitao, setEditCapitao] = useState(false);
  const [editLider, setEditLider]     = useState(false);
  const [editSlots, setEditSlots]     = useState([]);
  const [saving, setSaving]           = useState(false);
  const fileRef = useRef();

  // ── Comparar ─────────────────────────────────────────────────
  const [compareSelected, setCompareSelected] = useState(new Set());

  function toggleCompare(nome) {
    setCompareSelected(prev => {
      const next = new Set(prev);
      next.has(nome) ? next.delete(nome) : next.add(nome);
      return next;
    });
  }

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      setSchedules(await getSchedules());
    } catch {
      toast.error('Erro ao carregar horários');
    } finally {
      setLoading(false);
    }
  }

  // ── Derivados ─────────────────────────────────────────────────
  // Áreas com ao menos 1 membro cadastrado
  const presentAreas = AREAS.filter(a => schedules.some(sc => sc.area === a));

  // Liderança: capitão OU líder OU área Gestão e Design
  const lideres = schedules.filter(sc => sc.capitao || sc.lider || sc.area === 'Gestao e Design');

  // Aggregate geral
  const aggGeral = buildAggregate(schedules);

  // Aggregate liderança
  const aggLideranca = buildAggregate(lideres);

  // Aggregate por área
  function aggForArea(area) {
    return buildAggregate(schedules.filter(sc => sc.area === area));
  }

  // Schedule do membro da aba individual
  const memberSchedule = tab.startsWith('member:')
    ? schedules.find(sc => sc.nome === tab.slice(7))
    : null;

  // Área da aba de área
  const currentArea = tab.startsWith('area:') ? tab.slice(5) : null;
  const aggArea = currentArea ? aggForArea(currentArea) : null;

  // Comparação: aggregate dos selecionados
  const compareList = schedules.filter(sc => compareSelected.has(sc.nome));
  const aggCompare  = buildAggregate(compareList);

  // ── Upload PDF ────────────────────────────────────────────────
  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') { toast.error('Envie um arquivo PDF'); return; }
    setUploading(true);
    setParsed(null);
    try {
      const result = await parsePDF(file);
      setParsed(result);
      setEditNome(result.nome || '');
      setEditSemestre(result.semestre || '');
      setEditArea('');
      setEditCapitao(false);
      setEditLider(false);
      setEditSlots(result.slots || []);
      toast.success('Horário extraído com sucesso!');
    } catch {
      toast.error('Não foi possível processar o PDF. Tente outro arquivo.');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  }

  function handleToggleSlot(day, hour) {
    const exists = editSlots.some(s => s.day === day && s.hour === hour);
    setEditSlots(exists
      ? editSlots.filter(s => !(s.day === day && s.hour === hour))
      : [...editSlots, { day, hour }]
    );
  }

  async function handleSave() {
    if (!editNome.trim())       { toast.error('Informe seu nome'); return; }
    if (!editSemestre.trim())   { toast.error('Informe o semestre (ex: 2026.1)'); return; }
    if (!editArea)              { toast.error('Selecione sua área'); return; }
    if (editSlots.length === 0) { toast.error('Nenhum horário marcado'); return; }
    setSaving(true);
    try {
      await createSchedule({
        nome: editNome.trim(),
        semestre: editSemestre.trim(),
        area: editArea,
        capitao: editCapitao,
        lider: editLider,
        slots: editSlots,
      });
      toast.success('Horário salvo!');
      setParsed(null);
      setEditSlots([]);
      if (fileRef.current) fileRef.current.value = '';
      await loadAll();
      setTab(`member:${editNome.trim()}`);
    } catch {
      toast.error('Erro ao salvar horário');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setParsed(null);
    setEditSlots([]);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleClearAll() {
    if (!window.confirm('Tem certeza? Isso vai remover TODOS os horários cadastrados.')) return;
    try {
      const r = await clearAllSchedules();
      toast.success(`${r.count} horário${r.count !== 1 ? 's' : ''} removido${r.count !== 1 ? 's' : ''}`);
      setTab('geral');
      await loadAll();
    } catch {
      toast.error('Erro ao limpar horários');
    }
  }

  async function handleDelete(id, nome) {
    if (!window.confirm(`Remover horário de ${nome}?`)) return;
    try {
      await deleteSchedule(id);
      toast.success('Horário removido');
      if (tab === `member:${nome}`) setTab('geral');
      await loadAll();
    } catch {
      toast.error('Erro ao remover');
    }
  }

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={{ ...s.header, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={s.title}>Horários Gerais</h2>
          <p style={s.subtitle}>Grade de disponibilidade da equipe por área</p>
        </div>
        {isAdmin && schedules.length > 0 && (
          <button style={s.clearBtn} onClick={handleClearAll}>
            Limpar todos os horários
          </button>
        )}
      </div>

      {/* ── Barra de abas ── */}
      <div style={s.tabBar}>
        <TabBtn id="geral"    active={tab} onClick={setTab}>Visão Geral</TabBtn>
        <TabBtn id="meu"      active={tab} onClick={setTab}>+ Meu Horário</TabBtn>
        {schedules.length > 1 && (
          <TabBtn id="comparar" active={tab} onClick={setTab}>
            Comparar
            {compareSelected.size > 0 && <span style={s.compareBadge}>{compareSelected.size}</span>}
          </TabBtn>
        )}

        {/* Liderança */}
        {lideres.length > 0 && (
          <>
            <span style={s.sep} />
            <TabBtn id="lideranca" active={tab} onClick={setTab}>
              ★ Gestão e Liderança
            </TabBtn>
          </>
        )}

        {/* Abas por área */}
        {presentAreas.length > 0 && (
          <>
            <span style={s.sep} />
            {presentAreas.map(area => (
              <TabBtn key={area} id={`area:${area}`} active={tab} onClick={setTab}>
                {area}
              </TabBtn>
            ))}
          </>
        )}

        {/* Abas individuais */}
        {schedules.length > 0 && (
          <>
            <span style={s.sep} />
            {schedules.map(sc => (
              <TabBtn key={sc._id} id={`member:${sc.nome}`} active={tab} onClick={setTab}>
                {(sc.capitao || sc.lider) && <span style={s.star}>★ </span>}
                {firstName(sc.nome)}
              </TabBtn>
            ))}
          </>
        )}
      </div>

      {/* ══ Visão Geral ══════════════════════════════════════════ */}
      {tab === 'geral' && (
        <AggView
          data={aggGeral}
          loading={loading}
          emptyMsg='Clique em "+ Meu Horário" e anexe seu comprovante de matrícula.'
          isAdmin={isAdmin}
          schedules={schedules}
          onDelete={handleDelete}
        />
      )}

      {/* ══ Liderança ════════════════════════════════════════════ */}
      {tab === 'lideranca' && (
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <h3 style={s.sectionTitle}>★ Gestão e Liderança</h3>
            <span style={s.badge2}>{lideres.length} pessoa{lideres.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={s.memberChips}>
            {lideres.map(sc => (
              <span key={sc._id} style={s.chip}>
                {sc.capitao ? '★ ' : '◆ '}{sc.nome}
                {sc.area && <span style={s.chipArea}> · {sc.area}</span>}
              </span>
            ))}
          </div>
          {aggLideranca.total > 0 && (
            <div style={s.gridCard}>
              <ScheduleGrid mode="aggregate" aggregate={aggLideranca.aggregate} total={aggLideranca.total} />
            </div>
          )}
        </div>
      )}

      {/* ══ Comparar ═════════════════════════════════════════════ */}
      {tab === 'comparar' && (
        <div style={s.section}>
          <p style={s.compareHint}>
            Selecione duas ou mais pessoas para ver quando todas estão livres ao mesmo tempo.
          </p>

          {/* Chips de seleção */}
          <div style={s.compareChips}>
            {schedules.map(sc => {
              const sel = compareSelected.has(sc.nome);
              return (
                <button
                  key={sc._id}
                  onClick={() => toggleCompare(sc.nome)}
                  style={{
                    ...s.compareChip,
                    background: sel ? 'var(--primary)' : 'var(--bg-card2)',
                    color:      sel ? '#fff'            : 'var(--text-muted)',
                    border:     sel ? '1px solid var(--primary)' : '1px solid var(--border)',
                    fontWeight: sel ? 600 : 400,
                  }}
                >
                  {sc.capitao && '★ '}{sc.lider && !sc.capitao && '◆ '}
                  {firstName(sc.nome)}
                  {sc.area && <span style={{ opacity: 0.7, fontSize: 11, marginLeft: 4 }}>· {sc.area}</span>}
                </button>
              );
            })}
          </div>

          {compareSelected.size === 0 && (
            <div style={s.empty}>
              <span style={s.emptyIcon}>👥</span>
              <p>Selecione pelo menos duas pessoas acima.</p>
            </div>
          )}

          {compareSelected.size === 1 && (
            <div style={s.empty}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Selecione mais uma pessoa para comparar.</p>
            </div>
          )}

          {compareSelected.size >= 2 && (
            <>
              <div style={{ ...s.sectionHeader, marginTop: 24 }}>
                <h3 style={s.sectionTitle}>
                  {[...compareSelected].map(n => firstName(n)).join(' + ')}
                </h3>
                <span style={s.badge2}>{compareSelected.size} pessoas</span>
              </div>

              <div style={s.compareLegend}>
                <span style={{ ...s.legendDot, background: '#166534' }} />
                <span style={s.legendText}>Verde = todos livres — podem se reunir</span>
                <span style={{ ...s.legendDot, background: '#450a0a', marginLeft: 16 }} />
                <span style={s.legendText}>Vermelho = todos ocupados</span>
              </div>

              <div style={s.gridCard}>
                <ScheduleGrid
                  mode="aggregate"
                  aggregate={aggCompare.aggregate}
                  total={aggCompare.total}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ Aba por Área ═════════════════════════════════════════ */}
      {currentArea && aggArea && (
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <h3 style={s.sectionTitle}>{currentArea}</h3>
            <span style={s.badge2}>{aggArea.total} membro{aggArea.total !== 1 ? 's' : ''}</span>
          </div>
          <div style={s.memberChips}>
            {schedules.filter(sc => sc.area === currentArea).map(sc => (
              <span
                key={sc._id}
                style={{ ...s.chip, cursor: 'pointer' }}
                onClick={() => setTab(`member:${sc.nome}`)}
                title="Ver horário individual"
              >
                {sc.capitao && '★ '}{sc.lider && !sc.capitao && '◆ '}{sc.nome}
              </span>
            ))}
          </div>
          {aggArea.total > 0 && (
            <div style={s.gridCard}>
              <ScheduleGrid mode="aggregate" aggregate={aggArea.aggregate} total={aggArea.total} />
            </div>
          )}
        </div>
      )}

      {/* ══ Meu Horário ══════════════════════════════════════════ */}
      {tab === 'meu' && (
        <div style={s.section}>
          {!parsed ? (
            <div style={s.uploadCard}>
              <h3 style={s.uploadTitle}>Anexe seu comprovante de matrícula</h3>
              <p style={s.uploadHint}>
                Baixe o PDF no Portal Acadêmico da UFJF e envie aqui.
                O sistema extrai sua grade automaticamente.
              </p>
              <div
                style={{ ...s.dropZone, ...(uploading ? s.dropZoneLoading : {}) }}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => !uploading && fileRef.current?.click()}
              >
                {uploading ? (
                  <div style={s.spinWrap}>
                    <span style={s.spinner} />
                    <p style={s.spinText}>Processando PDF...</p>
                  </div>
                ) : (
                  <>
                    <span style={s.dropIcon}>📄</span>
                    <p style={s.dropText}>Arraste o PDF aqui ou clique para selecionar</p>
                    <p style={s.dropSub}>Comprovante_Matricula.pdf</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files?.[0])} />
            </div>
          ) : (
            <div style={s.previewCard}>
              <div style={s.previewHeader}>
                <h3 style={s.previewTitle}>Grade extraída — confira e ajuste</h3>
                <button style={s.resetBtn} onClick={handleReset}>← Enviar outro PDF</button>
              </div>

              {/* Nome + Semestre */}
              <div style={s.fieldRow}>
                <Field label="Seu nome *">
                  <input style={s.input} value={editNome} onChange={e => setEditNome(e.target.value)} placeholder="Ex: João Silva" />
                </Field>
                <Field label="Semestre *">
                  <input style={s.input} value={editSemestre} onChange={e => setEditSemestre(e.target.value)} placeholder="Ex: 2026.1" />
                </Field>
              </div>

              {/* Área */}
              <div style={{ marginBottom: 16 }}>
                <Field label="Área na Microraptor *">
                  <select style={{ ...s.input, cursor: 'pointer' }} value={editArea} onChange={e => setEditArea(e.target.value)}>
                    <option value="">Selecione a área</option>
                    {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </Field>
              </div>

              {/* Capitão + Líder */}
              <div style={{ ...s.fieldRow, marginBottom: 20 }}>
                <Field label="É capitão?">
                  <Toggle value={editCapitao} onChange={setEditCapitao} onLabel="Sim ★" offLabel="Não" />
                </Field>
                <Field label="É líder de área?">
                  <Toggle value={editLider} onChange={setEditLider} onLabel="Sim ◆" offLabel="Não" />
                </Field>
              </div>

              <p style={s.editHint}>Células azuis = aulas/compromissos. Clique para corrigir.</p>

              <div style={s.gridCard}>
                <ScheduleGrid mode="individual" slots={editSlots} editable onToggle={handleToggleSlot} />
              </div>

              <div style={s.saveRow}>
                <span style={s.slotCount}>{editSlots.length} horário{editSlots.length !== 1 ? 's' : ''} marcado{editSlots.length !== 1 ? 's' : ''}</span>
                <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar meu horário'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ Aba individual de membro ══════════════════════════════ */}
      {memberSchedule && (
        <div style={s.section}>
          <div style={s.memberHeader}>
            <div>
              <h3 style={s.memberName}>
                {memberSchedule.capitao && <span style={{ color: '#f59e0b' }}>★ </span>}
                {memberSchedule.lider && !memberSchedule.capitao && <span style={{ color: '#a78bfa' }}>◆ </span>}
                {memberSchedule.nome}
              </h3>
              <div style={s.memberMeta}>
                {memberSchedule.semestre && <span style={s.tagSem}>{memberSchedule.semestre}</span>}
                {memberSchedule.area     && <span style={s.tagArea}>{memberSchedule.area}</span>}
                {memberSchedule.capitao  && <span style={s.tagCap}>Capitão</span>}
                {memberSchedule.lider && !memberSchedule.capitao && <span style={s.tagLid}>Líder</span>}
                <span style={s.tagSlot}>{memberSchedule.slots.length} horários ocupados</span>
              </div>
            </div>
            {isAdmin && (
              <button style={s.deleteBtn} onClick={() => handleDelete(memberSchedule._id, memberSchedule.nome)}>
                Remover
              </button>
            )}
          </div>
          <div style={s.gridCard}>
            <ScheduleGrid mode="individual" slots={memberSchedule.slots} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-componente: AggView (usado em Visão Geral) ── */
function AggView({ data, loading, emptyMsg, isAdmin, schedules, onDelete }) {
  return (
    <div style={s.section}>
      <div style={s.filterRow}>
        <span style={s.badge2}>
          {data.total} membro{data.total !== 1 ? 's' : ''} com horário cadastrado
        </span>
      </div>
      {loading ? (
        <div style={s.loading}>Carregando...</div>
      ) : data.total === 0 ? (
        <div style={s.empty}>
          <span style={s.emptyIcon}>📅</span>
          <p>Nenhum horário cadastrado ainda.</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{emptyMsg}</p>
        </div>
      ) : (
        <div style={s.gridCard}>
          <ScheduleGrid mode="aggregate" aggregate={data.aggregate} total={data.total} />
        </div>
      )}

      {isAdmin && schedules.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={s.adminTitle}>Gerenciar horários</h3>
          <div style={s.scheduleList}>
            {schedules.map(sc => (
              <div key={sc._id} style={s.scheduleItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {sc.capitao && <span style={{ color: '#f59e0b', fontSize: 13 }}>★</span>}
                  {sc.lider && !sc.capitao && <span style={{ color: '#a78bfa', fontSize: 13 }}>◆</span>}
                  <span style={s.scNome}>{sc.nome}</span>
                  {sc.semestre && <span style={s.tagSem}>{sc.semestre}</span>}
                  {sc.area     && <span style={s.tagArea}>{sc.area}</span>}
                  {sc.capitao  && <span style={s.tagCap}>Capitão</span>}
                  {sc.lider && !sc.capitao && <span style={s.tagLid}>Líder</span>}
                  <span style={s.tagSlot}>{sc.slots.length} slots</span>
                </div>
                <button style={s.deleteBtn} onClick={() => onDelete(sc._id, sc.nome)}>Remover</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers de UI ── */
function Field({ label, children }) {
  return (
    <div style={s.fieldGroup}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, onLabel, offLabel }) {
  return (
    <label style={s.toggle}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
      <span style={{ ...s.toggleTrack, background: value ? 'var(--primary)' : 'var(--border)' }}>
        <span style={{ ...s.toggleThumb, transform: value ? 'translateX(20px)' : 'translateX(2px)' }} />
      </span>
      <span style={{ fontSize: 13, color: value ? 'var(--primary)' : 'var(--text-muted)', fontWeight: value ? 600 : 400 }}>
        {value ? onLabel : offLabel}
      </span>
    </label>
  );
}

function TabBtn({ id, active, onClick, children }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        background: 'none', border: 'none',
        borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
        marginBottom: -2,
        padding: '10px 16px',
        fontSize: 13,
        fontWeight: isActive ? 700 : 500,
        color: isActive ? 'var(--text)' : 'var(--text-muted)',
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {children}
    </button>
  );
}

/* ── Estilos ── */
const s = {
  page:     { padding: '28px 32px', maxWidth: 980, margin: '0 auto' },
  header:   { marginBottom: 20, gap: 16 },
  clearBtn: {
    background: 'transparent',
    border: '1px solid #ef4444',
    color: '#ef4444',
    borderRadius: 'var(--radius)',
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  title:    { fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 },
  subtitle: { fontSize: 14, color: 'var(--text-muted)', marginTop: 6, marginBottom: 0 },

  tabBar: {
    display: 'flex', overflowX: 'auto',
    borderBottom: '2px solid var(--border)',
    marginBottom: 28, scrollbarWidth: 'none',
  },
  sep: { width: 1, background: 'var(--border)', margin: '8px 6px', flexShrink: 0 },
  star: { color: '#f59e0b' },

  section: {},
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 },

  filterRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  badge2: {
    fontSize: 12, color: 'var(--text-muted)',
    background: 'var(--bg-card2)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '4px 12px',
  },

  memberChips: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    fontSize: 12, background: 'var(--bg-card2)',
    border: '1px solid var(--border)', borderRadius: 20,
    padding: '4px 12px', color: 'var(--text)',
  },
  chipArea: { color: 'var(--text-muted)' },

  loading:   { textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 14 },
  empty:     { textAlign: 'center', color: 'var(--text-muted)', padding: '48px 0' },
  emptyIcon: { fontSize: 40, display: 'block', marginBottom: 12 },

  gridCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: 20,
  },

  adminTitle:    { fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 12 },
  scheduleList:  { display: 'flex', flexDirection: 'column', gap: 8 },
  scheduleItem:  {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '10px 16px',
  },
  scNome:   { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  deleteBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: '#ef4444',
    fontSize: 12, padding: '5px 12px', cursor: 'pointer',
  },

  // Comparar
  compareHint:  { fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 },
  compareChips: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  compareChip:  {
    borderRadius: 20, padding: '6px 14px', fontSize: 13,
    cursor: 'pointer', transition: 'all 0.15s',
  },
  compareBadge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    marginLeft: 6, background: 'var(--primary)', color: '#fff',
    borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 700,
  },
  compareLegend: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  legendDot:  { width: 14, height: 14, borderRadius: 3, flexShrink: 0 },
  legendText: { fontSize: 12, color: 'var(--text-muted)' },

  // Tags
  tagSem:  { fontSize: 11, color: 'var(--primary)', background: 'rgba(99,102,241,.12)', borderRadius: 12, padding: '2px 8px' },
  tagArea: { fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,.1)',          borderRadius: 12, padding: '2px 8px' },
  tagCap:  { fontSize: 11, color: '#f59e0b', background: 'rgba(245,158,11,.12)',         borderRadius: 12, padding: '2px 8px' },
  tagLid:  { fontSize: 11, color: '#a78bfa', background: 'rgba(167,139,250,.12)',        borderRadius: 12, padding: '2px 8px' },
  tagSlot: { fontSize: 12, color: 'var(--text-muted)' },

  // Upload
  uploadCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: 32,
    maxWidth: 560, margin: '0 auto',
  },
  uploadTitle: { fontSize: 17, fontWeight: 700, color: 'var(--text)', marginTop: 0, marginBottom: 8 },
  uploadHint:  { fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 },
  dropZone: {
    border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
    padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
  },
  dropZoneLoading: { borderColor: 'var(--primary)', background: 'rgba(99,102,241,.05)', cursor: 'default' },
  dropIcon:  { fontSize: 36, display: 'block', marginBottom: 10 },
  dropText:  { fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: '0 0 6px' },
  dropSub:   { fontSize: 12, color: 'var(--text-muted)', margin: 0 },
  spinWrap:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  spinner: {
    display: 'inline-block', width: 28, height: 28,
    border: '3px solid var(--border)', borderTopColor: 'var(--primary)',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  spinText: { fontSize: 14, color: 'var(--text-muted)', margin: 0 },

  // Preview
  previewCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: 28,
  },
  previewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  previewTitle:  { fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 },
  resetBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--text-muted)',
    fontSize: 12, padding: '6px 12px', cursor: 'pointer',
  },
  fieldRow:   { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 180 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: {
    background: 'var(--bg-card2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--text)',
    padding: '9px 12px', fontSize: 14, outline: 'none',
  },

  toggle:      { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 2 },
  toggleTrack: { width: 44, height: 24, borderRadius: 12, position: 'relative', transition: 'background 0.2s', flexShrink: 0 },
  toggleThumb: {
    position: 'absolute', top: 2, width: 20, height: 20,
    borderRadius: '50%', background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,.3)', transition: 'transform 0.2s',
  },

  editHint: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 },
  saveRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  slotCount: { fontSize: 13, color: 'var(--text-muted)' },
  saveBtn: {
    background: 'var(--primary)', color: '#fff', border: 'none',
    borderRadius: 'var(--radius)', padding: '10px 24px',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },

  // Membro individual
  memberHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  memberName:   { fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' },
  memberMeta:   { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
};

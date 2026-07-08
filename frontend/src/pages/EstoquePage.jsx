import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import {
  getStockItems,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  adjustStockQty,
  sendStockAlert,
  getStockCategories,
  createStockCategory,
  deleteStockCategory,
} from '../services/api';
import toast from 'react-hot-toast';

const UNIDADES = ['un', 'g', 'kg', 'm', 'cm', 'rolo', 'caixa', 'folha', 'par'];

const STATUS_META = {
  normal:   { label: 'Normal',   bg: 'rgba(34,197,94,0.18)',  color: '#22c55e', dot: '#22c55e' },
  baixo:    { label: 'Baixo',    bg: 'rgba(234,179,8,0.18)',  color: '#eab308', dot: '#eab308' },
  esgotado: { label: 'Esgotado', bg: 'rgba(239,68,68,0.18)',  color: '#ef4444', dot: '#ef4444' },
};

function calcStatus(item) {
  if (item.quantidade === 0) return 'esgotado';
  if (item.quantidade <= item.estoqueMinimo) return 'baixo';
  return 'normal';
}

function makeEmpty(cats) {
  return {
    nome: '', categoria: cats[0]?.nome || '', quantidade: '', unidade: 'un',
    estoqueMinimo: '5', descricao: '',
  };
}

// ─── Componentes pequenos ────────────────────────────────────────────────────

function StatusBadge({ item }) {
  const st = calcStatus(item);
  const m  = STATUS_META[st];
  return (
    <span style={{ ...s.badge, background: m.bg, color: m.color }}>
      <span style={{ ...s.badgeDot, background: m.dot }} />
      {m.label}
    </span>
  );
}

function SummaryCard({ label, value, color, sub }) {
  return (
    <div style={{ ...s.card, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={s.cardLabel}>{label}</div>
      {sub !== undefined && <div style={s.cardSub}>{sub}</div>}
    </div>
  );
}

// ─── Modal lista de compras ───────────────────────────────────────────────────

function ShoppingListModal({ onClose }) {
  const [criticos, setCriticos] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    getStockItems()
      .then(all => setCriticos(all.filter(i => calcStatus(i) !== 'normal')))
      .catch(() => toast.error('Erro ao carregar itens.'))
      .finally(() => setLoading(false));
  }, []);

  const esgotados = criticos.filter(i => calcStatus(i) === 'esgotado');
  const baixos    = criticos.filter(i => calcStatus(i) === 'baixo');

  const buildText = () => {
    const data = new Date().toLocaleDateString('pt-BR');
    const lines = [`Lista de Compras — Microraptor`, `Data: ${data}`, ''];

    if (esgotados.length) {
      lines.push(`ESGOTADOS (${esgotados.length})`);
      esgotados.forEach(i => lines.push(`  • ${i.nome} — ${i.categoria} (0 ${i.unidade}, min. ${i.estoqueMinimo})`));
      lines.push('');
    }
    if (baixos.length) {
      lines.push(`ESTOQUE BAIXO (${baixos.length})`);
      baixos.forEach(i => lines.push(`  • ${i.nome} — ${i.categoria} (${i.quantidade} ${i.unidade}, min. ${i.estoqueMinimo})`));
    }
    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const data = new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 18;

    // Titulo
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Lista de Compras — Microraptor', 14, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Gerada em ${data}`, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 10;

    const drawTable = (titulo, itens, corFundo, corTexto) => {
      if (!itens.length) return;

      // Faixa de titulo da secao
      doc.setFillColor(...corFundo);
      doc.roundedRect(14, y, pageW - 28, 8, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...corTexto);
      doc.text(`${titulo} — ${itens.length} item(s)`, 18, y + 5.5);
      doc.setTextColor(0, 0, 0);
      y += 12;

      // Cabecalho da tabela
      doc.setFillColor(245, 245, 245);
      doc.rect(14, y, pageW - 28, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('MATERIAL',   16, y + 5);
      doc.text('CATEGORIA',  80, y + 5);
      doc.text('QTD ATUAL', 130, y + 5);
      doc.text('MINIMO',    165, y + 5);
      doc.setTextColor(0, 0, 0);
      y += 7;

      // Linhas
      itens.forEach((item, idx) => {
        if (y > 270) { doc.addPage(); y = 18; }
        if (idx % 2 === 0) {
          doc.setFillColor(252, 252, 252);
          doc.rect(14, y, pageW - 28, 7, 'F');
        }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(item.nome.substring(0, 35),     16, y + 5);
        doc.text(item.categoria.substring(0, 20), 80, y + 5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...corTexto);
        doc.text(`${item.quantidade} ${item.unidade}`, 130, y + 5);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(`${item.estoqueMinimo} ${item.unidade}`, 165, y + 5);

        // Linha separadora
        doc.setDrawColor(230, 230, 230);
        doc.line(14, y + 7, pageW - 14, y + 7);
        y += 7;
      });

      y += 6;
    };

    drawTable('ESGOTADOS',    esgotados, [254, 226, 226], [185, 28,  28]);
    drawTable('ESTOQUE BAIXO', baixos,   [254, 249, 195], [146, 64,  14]);

    doc.save('lista-de-compras.pdf');
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, maxWidth: 520 }}>
        <div style={s.modalHeader}>
          <div>
            <h3 style={s.modalTitle}>Lista de Compras</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' })}
            </span>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '16px 24px 24px' }}>
          {loading ? (
            <div style={{ ...s.center, padding: '40px 0' }}>
              <div style={s.spinner} />
            </div>
          ) : criticos.length === 0 ? (
            <div style={s.emptyList}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>—</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Estoque em dia!</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Nenhum material esgotado ou abaixo do mínimo.
              </div>
            </div>
          ) : (
            <>
              {/* Esgotados */}
              {esgotados.length > 0 && (
                <div style={s.listSection}>
                  <div style={{ ...s.listSectionTitle, ...s.titleRed }}>
                    Esgotados — {esgotados.length} item(s)
                  </div>
                  {esgotados.map(item => (
                    <div key={item._id} style={s.listRow}>
                      <div style={s.listRowLeft}>
                        <span style={s.listName}>{item.nome}</span>
                        <span style={s.listCat}>{item.categoria}</span>
                      </div>
                      <div style={s.listRowRight}>
                        <span style={s.listQtyRed}>0 {item.unidade}</span>
                        <span style={s.listMin}>mín. {item.estoqueMinimo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Baixo */}
              {baixos.length > 0 && (
                <div style={s.listSection}>
                  <div style={{ ...s.listSectionTitle, ...s.titleYellow }}>
                    Estoque baixo — {baixos.length} item(s)
                  </div>
                  {baixos.map(item => (
                    <div key={item._id} style={s.listRow}>
                      <div style={s.listRowLeft}>
                        <span style={s.listName}>{item.nome}</span>
                        <span style={s.listCat}>{item.categoria}</span>
                      </div>
                      <div style={s.listRowRight}>
                        <span style={s.listQtyYellow}>{item.quantidade} {item.unidade}</span>
                        <span style={s.listMin}>mín. {item.estoqueMinimo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Ações */}
          {!loading && criticos.length > 0 && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={s.btnOutline} onClick={handleDownloadPDF}>Baixar PDF</button>
              <button style={s.btnPrimary} onClick={handleCopy}>
                {copied ? 'Copiado!' : 'Copiar lista'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal de gerenciamento de categorias ────────────────────────────────────

function CatManagerModal({ categories, onClose, onChanged }) {
  const [nova, setNova]     = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDel]  = useState(null);

  const handleCreate = async () => {
    if (!nova.trim()) return;
    setSaving(true);
    try {
      await createStockCategory(nova.trim());
      toast.success('Categoria criada!');
      setNova('');
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar categoria.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (cat.itemCount > 0) {
      return toast.error(`Essa categoria tem ${cat.itemCount} item(s). Reatribua-os antes de excluir.`);
    }
    if (!window.confirm(`Remover a categoria "${cat.nome}"?`)) return;
    setDel(cat._id);
    try {
      await deleteStockCategory(cat._id);
      toast.success('Categoria removida.');
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao remover categoria.');
    } finally {
      setDel(null);
    }
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, maxWidth: 420 }}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Gerenciar Categorias</h3>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Criar nova */}
          <div style={s.label}>Nova categoria</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, marginBottom: 24 }}>
            <input
              style={{ ...s.input, flex: 1 }}
              placeholder="ex: Solda, Tinta, Eletrodos..."
              value={nova}
              onChange={e => setNova(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <button style={s.btnPrimary} onClick={handleCreate} disabled={saving || !nova.trim()}>
              {saving ? '...' : 'Criar'}
            </button>
          </div>

          {/* Lista */}
          <div style={s.label}>Categorias existentes</div>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {categories.map(cat => (
              <div key={cat._id} style={s.catRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={s.catRowName}>{cat.nome}</span>
                  <span style={s.catRowCount}>{cat.itemCount} {cat.itemCount === 1 ? 'item' : 'itens'}</span>
                </div>
                <button
                  style={{ ...s.delBtn, opacity: deleting === cat._id ? 0.5 : 1 }}
                  disabled={deleting === cat._id}
                  onClick={() => handleDelete(cat)}
                >
                  Remover
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nenhuma categoria cadastrada.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de formulário de item ─────────────────────────────────────────────

function ItemModal({ item, categories, onClose, onSaved }) {
  const [form, setForm] = useState(item ? {
    nome: item.nome,
    categoria: item.categoria,
    quantidade: String(item.quantidade),
    unidade: item.unidade,
    estoqueMinimo: String(item.estoqueMinimo),
    descricao: item.descricao || '',
  } : makeEmpty(categories));
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error('Nome é obrigatório.');
    if (!form.categoria) return toast.error('Selecione uma categoria.');
    if (form.quantidade === '' || isNaN(Number(form.quantidade))) return toast.error('Quantidade inválida.');

    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        categoria: form.categoria,
        quantidade: Number(form.quantidade),
        unidade: form.unidade,
        estoqueMinimo: Number(form.estoqueMinimo) || 0,
        descricao: form.descricao.trim(),
      };
      if (item) {
        await updateStockItem(item._id, payload);
        toast.success('Item atualizado!');
      } else {
        await createStockItem(payload);
        toast.success('Item adicionado!');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>{item ? 'Editar item' : 'Novo item'}</h3>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={s.modalBody}>
          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Nome *</label>
              <input style={s.input} value={form.nome} onChange={e => set('nome', e.target.value)}
                placeholder="ex: Cola branca" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Categoria *</label>
              <select style={s.input} value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                {categories.map(c => <option key={c._id} value={c.nome}>{c.nome}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Quantidade *</label>
              <input style={s.input} type="number" min="0" value={form.quantidade}
                onChange={e => set('quantidade', e.target.value)} placeholder="0" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Unidade</label>
              <select style={s.input} value={form.unidade} onChange={e => set('unidade', e.target.value)}>
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Estoque mínimo</label>
              <input style={s.input} type="number" min="0" value={form.estoqueMinimo}
                onChange={e => set('estoqueMinimo', e.target.value)} placeholder="5" />
              <span style={s.hint}>Abaixo desse valor o sistema envia alerta no WhatsApp</span>
            </div>
            <div style={s.field}>
              <label style={s.label}>Descrição</label>
              <input style={s.input} value={form.descricao} onChange={e => set('descricao', e.target.value)}
                placeholder="Opcional" />
            </div>
          </div>

          <div style={s.modalFooter}>
            <button type="button" style={s.btnOutline} onClick={onClose}>Cancelar</button>
            <button type="submit" style={s.btnPrimary} disabled={saving}>
              {saving ? 'Salvando...' : item ? 'Salvar alterações' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function EstoquePage() {
  const { isAdmin } = useAuth();
  const [items, setItems]             = useState([]);
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filterCat, setFilterCat]     = useState('Todos');
  const [search, setSearch]           = useState('');
  const [editItem, setEditItem]       = useState(null);
  const [showForm, setShowForm]       = useState(false);
  const [showCatMgr, setShowCatMgr]  = useState(false);
  const [alerting, setAlerting]       = useState(false);
  const [adjusting, setAdjusting]     = useState({});
  const [showShoppingList, setShowShoppingList] = useState(false);

  const loadCats = useCallback(async () => {
    try { setCategories(await getStockCategories()); } catch { /* silencioso */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCat !== 'Todos') params.categoria = filterCat;
      if (search.trim()) params.search = search.trim();
      setItems(await getStockItems(params));
    } catch {
      toast.error('Erro ao carregar estoque.');
    } finally {
      setLoading(false);
    }
  }, [filterCat, search]);

  useEffect(() => { loadCats(); }, [loadCats]);
  useEffect(() => { load(); }, [load]);

  // ── summary ─────────────────────────────────────────────────
  const total    = items.length;
  const esgotado = items.filter(i => calcStatus(i) === 'esgotado').length;
  const baixo    = items.filter(i => calcStatus(i) === 'baixo').length;
  const normal   = total - esgotado - baixo;

  // ── actions ─────────────────────────────────────────────────
  const openCreate  = () => { setEditItem(null); setShowForm(true); };
  const openEdit    = (item) => { setEditItem(item); setShowForm(true); };
  const closeForm   = () => { setShowForm(false); setEditItem(null); };
  const handleSaved = () => { closeForm(); load(); };
  const handleCatChanged = () => { loadCats(); load(); };

  const handleDelete = async (item) => {
    if (!window.confirm(`Remover "${item.nome}" do estoque?`)) return;
    try {
      await deleteStockItem(item._id);
      toast.success('Item removido.');
      load();
    } catch {
      toast.error('Erro ao remover item.');
    }
  };

  const handleAdjust = async (item, delta) => {
    setAdjusting(a => ({ ...a, [item._id]: true }));
    try {
      const updated = await adjustStockQty(item._id, delta);
      setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
      if (delta < 0 && calcStatus(updated) !== 'normal') {
        toast(`${updated.nome} com estoque ${calcStatus(updated)}`);
      }
    } catch {
      toast.error('Erro ao ajustar quantidade.');
    } finally {
      setAdjusting(a => ({ ...a, [item._id]: false }));
    }
  };

  const handleAlertAll = async () => {
    setAlerting(true);
    try {
      const { message, sent } = await sendStockAlert();
      if (sent > 0) toast.success(`Alerta enviado para ${sent} item(s)!`);
      else toast('Nenhum item em estado crítico.');
    } catch {
      toast.error('Erro ao enviar alerta por email.');
    } finally {
      setAlerting(false);
    }
  };

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Estoque da Sala</h2>
          <p style={s.subtitle}>Materiais de uso geral — cola, fita, fixadores, madeira e mais</p>
        </div>
        <div style={s.headerActions}>
          <button style={s.btnOutline} onClick={() => setShowShoppingList(true)}>
            Lista de Compras
          </button>
          <button style={s.btnAlert} onClick={handleAlertAll} disabled={alerting}>
            {alerting ? 'Enviando...' : 'Alertar Email'}
          </button>
          <button style={s.btnOutline} onClick={() => setShowCatMgr(true)}>
            Categorias
          </button>
          <button style={s.btnPrimary} onClick={openCreate}>+ Adicionar item</button>
        </div>
      </div>

      {/* ── Cards de resumo ── */}
      <div style={s.summaryRow}>
        <SummaryCard label="Total de itens"     value={total}    color="var(--text-muted)" />
        <SummaryCard label="Em estoque normal"  value={normal}   color="#22c55e" />
        <SummaryCard label="Estoque baixo"      value={baixo}    color="#eab308" sub="abaixo do mínimo" />
        <SummaryCard label="Esgotados"          value={esgotado} color="#ef4444" />
      </div>

      {/* ── Filtros ── */}
      <div style={s.filterBar}>
        <input
          style={s.searchInput}
          placeholder="Buscar por nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={s.catTabs}>
          {['Todos', ...categories.map(c => c.nome)].map(cat => (
            <button
              key={cat}
              style={{ ...s.catTab, ...(filterCat === cat ? s.catTabActive : {}) }}
              onClick={() => setFilterCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabela ── */}
      {loading ? (
        <div style={s.center}>
          <div style={s.spinner} />
          <span style={{ color: 'var(--text-muted)', marginTop: 12 }}>Carregando...</span>
        </div>
      ) : items.length === 0 ? (
        <div style={s.empty}>
          {search || filterCat !== 'Todos'
            ? 'Nenhum item encontrado com esses filtros.'
            : 'Nenhum item cadastrado. Clique em "+ Adicionar item" para começar.'}
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="payment-table-desktop">
            <table style={s.table}>
              <thead>
                <tr>
                  {['Nome', 'Categoria', 'Quantidade', 'Mín.', 'Status', isAdmin ? 'Ações' : ''].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item._id} style={s.tr}>
                    <td style={s.td}>
                      <div style={s.itemName}>{item.nome}</div>
                      {item.descricao && <div style={s.itemDesc}>{item.descricao}</div>}
                    </td>
                    <td style={s.td}>
                      <span style={s.catPill}>{item.categoria}</span>
                    </td>
                    <td style={s.td}>
                      <div style={s.qtyRow}>
                        <button style={s.qtyBtn}
                          disabled={!!adjusting[item._id]}
                          onClick={() => handleAdjust(item, -1)}>−</button>
                        <span style={s.qtyVal}>
                          {item.quantidade} <span style={s.unit}>{item.unidade}</span>
                        </span>
                        <button style={s.qtyBtn}
                          disabled={!!adjusting[item._id]}
                          onClick={() => handleAdjust(item, +1)}>+</button>
                      </div>
                    </td>
                    <td style={s.td}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {item.estoqueMinimo} {item.unidade}
                      </span>
                    </td>
                    <td style={s.td}><StatusBadge item={item} /></td>
                    {isAdmin && (
                      <td style={s.td}>
                        <div style={s.actions}>
                          <button style={s.editBtn} onClick={() => openEdit(item)}>Editar</button>
                          <button style={s.delBtn}  onClick={() => handleDelete(item)}>Remover</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="payment-cards-mobile">
            {items.map(item => (
              <div key={item._id} style={s.mobileCard}>
                <div style={s.mobileCardHeader}>
                  <div>
                    <div style={s.itemName}>{item.nome}</div>
                    <span style={s.catPill}>{item.categoria}</span>
                  </div>
                  <StatusBadge item={item} />
                </div>

                <div style={s.mobileQtyRow}>
                  <button style={s.qtyBtnLg} disabled={!!adjusting[item._id]}
                    onClick={() => handleAdjust(item, -1)}>−</button>
                  <div style={{ textAlign: 'center' }}>
                    <div style={s.qtyValLg}>{item.quantidade}</div>
                    <div style={s.unit}>{item.unidade}</div>
                  </div>
                  <button style={s.qtyBtnLg} disabled={!!adjusting[item._id]}
                    onClick={() => handleAdjust(item, +1)}>+</button>
                </div>

                <div style={s.mobileInfo}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    Mínimo: {item.estoqueMinimo} {item.unidade}
                  </span>
                  {item.descricao && <span style={s.itemDesc}>{item.descricao}</span>}
                </div>

                {isAdmin && (
                  <div style={s.actions}>
                    <button style={s.editBtn} onClick={() => openEdit(item)}>Editar</button>
                    <button style={s.delBtn}  onClick={() => handleDelete(item)}>Remover</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Modais ── */}
      {showForm && (
        <ItemModal item={editItem} categories={categories} onClose={closeForm} onSaved={handleSaved} />
      )}
      {showCatMgr && (
        <CatManagerModal categories={categories} onClose={() => setShowCatMgr(false)} onChanged={handleCatChanged} />
      )}
      {showShoppingList && (
        <ShoppingListModal onClose={() => setShowShoppingList(false)} />
      )}
    </div>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const s = {
  page: { paddingBottom: 40, minWidth: 0 },

  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 16, marginBottom: 28,
  },
  title:    { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'var(--text-muted)' },
  headerActions: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },

  // ── cards
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 14, marginBottom: 28,
  },
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '18px 20px',
  },
  cardLabel: { fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 },
  cardSub:   { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 },

  // ── filtros
  filterBar: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' },
  searchInput: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    color: 'var(--text)', borderRadius: 8, padding: '9px 14px', fontSize: 14,
    flex: 1, minWidth: 0, maxWidth: 320,
  },
  catTabs: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  catTab: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    color: 'var(--text-muted)', borderRadius: 20, padding: '5px 13px',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  catTabActive: {
    background: 'var(--primary)', color: '#fff',
    border: '1px solid var(--primary)',
  },

  // ── tabela
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
    padding: '10px 12px', borderBottom: '1px solid var(--border)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '13px 12px', fontSize: 14, verticalAlign: 'middle' },

  itemName: { fontWeight: 600, color: 'var(--text)' },
  itemDesc: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },

  catPill: {
    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
    background: 'rgba(168,3,3,0.12)', color: 'var(--primary)',
    letterSpacing: '0.03em',
  },

  // ── quantidade
  qtyRow: { display: 'flex', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 26, height: 26, borderRadius: 6,
    background: 'var(--bg-card2, rgba(255,255,255,0.06))',
    border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1,
  },
  qtyVal:  { fontWeight: 700, fontSize: 15, minWidth: 32, textAlign: 'center' },
  unit:    { fontSize: 11, color: 'var(--text-muted)' },

  // ── badge
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 9px', borderRadius: 20, fontSize: 12, fontWeight: 700,
  },
  badgeDot: { width: 7, height: 7, borderRadius: '50%' },

  // ── ações
  actions: { display: 'flex', gap: 6 },
  editBtn: {
    background: 'transparent', color: 'var(--primary)',
    border: '1px solid var(--primary)', padding: '5px 11px',
    borderRadius: 6, fontSize: 12, cursor: 'pointer',
  },
  delBtn: {
    background: 'transparent', color: 'var(--danger, #ef4444)',
    border: '1px solid var(--danger, #ef4444)', padding: '5px 11px',
    borderRadius: 6, fontSize: 12, cursor: 'pointer',
  },

  // ── mobile cards
  mobileCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 10,
  },
  mobileCardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 14, gap: 8,
  },
  mobileQtyRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 20, marginBottom: 12,
  },
  qtyBtnLg: {
    width: 36, height: 36, borderRadius: 8,
    background: 'var(--bg-card2, rgba(255,255,255,0.06))',
    border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: 22, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  qtyValLg: { fontSize: 26, fontWeight: 800, color: 'var(--text)', lineHeight: 1 },
  mobileInfo: { display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 12 },

  // ── botões
  btnPrimary: {
    background: 'var(--primary)', color: '#fff',
    padding: '9px 18px', borderRadius: 'var(--radius)',
    fontSize: 14, fontWeight: 600,
    boxShadow: '0 2px 8px rgba(168,3,3,0.35)',
    cursor: 'pointer', border: 'none',
  },
  btnAlert: {
    background: 'transparent', color: '#22c55e',
    border: '1px solid #22c55e', padding: '9px 16px',
    borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600,
    cursor: 'pointer',
  },
  btnOutline: {
    background: 'transparent', color: 'var(--text-muted)',
    border: '1px solid var(--border)', padding: '9px 16px',
    borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },

  // ── modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16,
  },
  modal: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', width: '100%', maxWidth: 560,
    boxShadow: 'var(--shadow)',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 24px', borderBottom: '1px solid var(--border)',
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: 'var(--text)' },
  closeBtn: {
    background: 'transparent', color: 'var(--text-muted)',
    fontSize: 18, padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
  },
  modalBody: { padding: 24 },
  modalFooter: {
    display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24,
  },

  // ── form
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px 18px' },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input: {
    background: 'var(--bg-card2, rgba(255,255,255,0.05))',
    border: '1px solid var(--border)', color: 'var(--text)',
    borderRadius: 8, padding: '9px 12px', fontSize: 14,
  },
  hint: { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 },

  // ── gerenciar categorias
  catRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', background: 'var(--bg-card2, rgba(255,255,255,0.04))',
    borderRadius: 8, border: '1px solid var(--border)',
  },
  catRowName:  { fontWeight: 600, fontSize: 14, color: 'var(--text)' },
  catRowCount: { fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 },

  // ── lista de compras
  emptyList: {
    textAlign: 'center', padding: '32px 0',
  },
  listSection: { marginBottom: 18 },
  listSectionTitle: {
    fontSize: 13, fontWeight: 700, padding: '6px 12px',
    borderRadius: 8, marginBottom: 8,
  },
  titleRed:    { background: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  titleYellow: { background: 'rgba(234,179,8,0.12)',  color: '#ca8a04' },
  listRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 10px', borderBottom: '1px solid var(--border)', gap: 8,
  },
  listRowLeft:  { display: 'flex', flexDirection: 'column', gap: 2 },
  listRowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  listName:     { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  listCat:      { fontSize: 11, color: 'var(--text-muted)' },
  listQtyRed:   { fontSize: 13, fontWeight: 700, color: '#ef4444' },
  listQtyYellow:{ fontSize: 13, fontWeight: 700, color: '#ca8a04' },
  listMin:      { fontSize: 11, color: 'var(--text-muted)' },

  // ── misc
  center: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '60px 0',
  },
  spinner: {
    width: 32, height: 32,
    border: '3px solid var(--border)', borderTop: '3px solid var(--primary)',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  empty: {
    textAlign: 'center', color: 'var(--text-muted)',
    padding: '60px 24px', fontSize: 15,
  },
};

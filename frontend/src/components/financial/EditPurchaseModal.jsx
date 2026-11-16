import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function EditPurchaseModal({
  purchase,
  meta,
  onClose,
  onUpdate,
}) {
  const [produto, setProduto] = useState(purchase.produto || '');
  const [descricao, setDescricao] = useState(purchase.descricao || '');
  const [categoria, setCategoria] = useState(purchase.categoria || 'Estrutura');
  const [quantidade, setQuantidade] = useState(purchase.quantidade ? purchase.quantidade.toString() : '1');
  const [valorUnitario, setValorUnitario] = useState(purchase.valorUnitario ? purchase.valorUnitario.toString() : '0');
  const [valorTotal, setValorTotal] = useState(purchase.valorTotal ? purchase.valorTotal.toString() : '0');
  const [fornecedor, setFornecedor] = useState(purchase.fornecedor || '');
  const [tipoLoja, setTipoLoja] = useState(purchase.tipoLoja || 'online');
  const [linkProduto, setLinkProduto] = useState(purchase.linkProduto || '');
  const [dataCompra, setDataCompra] = useState(
    purchase.dataCompra ? new Date(purchase.dataCompra).toISOString().slice(0, 10) : ''
  );
  const [formaPagamento, setFormaPagamento] = useState(purchase.formaPagamento || 'Pix');
  const [statusPagamento, setStatusPagamento] = useState(purchase.statusPagamento || 'pendente');
  const [valorPago, setValorPago] = useState(purchase.valorPago !== undefined ? purchase.valorPago.toString() : '0');
  const [dataPrevisaoEntrega, setDataPrevisaoEntrega] = useState(
    purchase.dataPrevisaoEntrega ? new Date(purchase.dataPrevisaoEntrega).toISOString().slice(0, 10) : ''
  );
  const [dataEntrega, setDataEntrega] = useState(
    purchase.dataEntrega ? new Date(purchase.dataEntrega).toISOString().slice(0, 10) : ''
  );
  const [statusEntrega, setStatusEntrega] = useState(purchase.statusEntrega || 'aguardando_envio');
  const [codigoRastreamento, setCodigoRastreamento] = useState(purchase.codigoRastreamento || '');
  const [observacoesEntrega, setObservacoesEntrega] = useState(purchase.observacoesEntrega || '');
  const [recebidoPor, setRecebidoPor] = useState(purchase.recebidoPor || '');
  const [comprador, setComprador] = useState(purchase.comprador || '');
  const [ajustarCaixa, setAjustarCaixa] = useState(Boolean(purchase.movimentacaoId));
  const [autor, setAutor] = useState('');
  const [saving, setSaving] = useState(false);

  const handleUnitOrQtyChange = (qtdVal, unitVal) => {
    const q = parseFloat(qtdVal) || 0;
    const u = parseFloat(unitVal) || 0;
    const tot = +(q * u).toFixed(2);
    setValorTotal(tot > 0 ? tot.toString() : valorTotal);
    if (statusPagamento === 'pago') {
      setValorPago(tot > 0 ? tot.toString() : valorPago);
    }
  };

  const handleStatusPagamentoChange = (newStatus) => {
    setStatusPagamento(newStatus);
    if (newStatus === 'pago') {
      setValorPago(valorTotal || '');
    } else if (newStatus === 'pendente') {
      setValorPago('0');
    }
  };

  const handleStatusEntregaChange = (newStatus) => {
    setStatusEntrega(newStatus);
    if (newStatus === 'entregue' && !dataEntrega) {
      setDataEntrega(new Date().toISOString().slice(0, 10));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!produto.trim()) {
      toast.error('Informe o nome do produto.');
      return;
    }
    const numQtd = parseInt(quantidade, 10) || 1;
    const numTot = parseFloat(valorTotal) || 0;
    const numPago = parseFloat(valorPago) || 0;

    if (!comprador.trim()) {
      toast.error('Informe o comprador.');
      return;
    }

    setSaving(true);
    try {
      await onUpdate(purchase._id, {
        produto: produto.trim(),
        descricao: descricao.trim(),
        categoria,
        quantidade: numQtd,
        valorUnitario: parseFloat(valorUnitario) || +(numTot / numQtd).toFixed(2),
        valorTotal: numTot,
        fornecedor: fornecedor.trim(),
        tipoLoja,
        linkProduto: linkProduto.trim(),
        dataCompra,
        formaPagamento,
        statusPagamento,
        valorPago: numPago,
        dataPrevisaoEntrega: dataPrevisaoEntrega || null,
        dataEntrega: dataEntrega || null,
        statusEntrega,
        codigoRastreamento: codigoRastreamento.trim(),
        observacoesEntrega: observacoesEntrega.trim(),
        recebidoPor: recebidoPor.trim(),
        comprador: comprador.trim(),
        autor: autor.trim() || comprador.trim() || 'Admin',
        ajustarCaixa,
      });
      toast.success('Compra atualizada com sucesso!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar compra.');
    } finally {
      setSaving(false);
    }
  };

  const responsaveisList = meta?.responsaveis || [];

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Editar Informações da Compra</h3>
          <button style={s.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={s.modalBody}>
          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Produto / Material *</label>
              <input
                style={s.input}
                value={produto}
                onChange={(e) => setProduto(e.target.value)}
                required
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Categoria da Compra *</label>
              <select
                style={s.input}
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                {(meta?.categoriasCompra || []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={s.grid3}>
            <div style={s.field}>
              <label style={s.label}>Quantidade *</label>
              <input
                type="number"
                min="1"
                style={s.input}
                value={quantidade}
                onChange={(e) => {
                  setQuantidade(e.target.value);
                  handleUnitOrQtyChange(e.target.value, valorUnitario);
                }}
                required
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Valor Unitário (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                style={s.input}
                value={valorUnitario}
                onChange={(e) => {
                  setValorUnitario(e.target.value);
                  handleUnitOrQtyChange(quantidade, e.target.value);
                }}
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Valor Total (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                style={{ ...s.input, fontWeight: 700 }}
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={s.grid3}>
            <div style={s.field}>
              <label style={s.label}>Tipo de Loja *</label>
              <select
                style={s.input}
                value={tipoLoja}
                onChange={(e) => {
                  const val = e.target.value;
                  setTipoLoja(val);
                  if (val === 'fisica') setLinkProduto('');
                }}
              >
                <option value="online">Loja Online (Internet / E-commerce)</option>
                <option value="fisica">Loja Física (Balcão / Presencial)</option>
              </select>
            </div>

            <div style={s.field}>
              <label style={s.label}>Fornecedor / Loja</label>
              <input
                style={s.input}
                value={fornecedor}
                placeholder="Ex.: Mercado Livre, Leroy Merlin, RoboCore"
                onChange={(e) => setFornecedor(e.target.value)}
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Data da Compra *</label>
              <input
                type="date"
                style={s.input}
                value={dataCompra}
                onChange={(e) => setDataCompra(e.target.value)}
                required
              />
            </div>
          </div>

          {tipoLoja === 'online' && (
            <div style={s.field}>
              <label style={s.label}>Link do Produto / Comprovante (Online)</label>
              <input
                type="url"
                style={s.input}
                placeholder="https://..."
                value={linkProduto}
                onChange={(e) => setLinkProduto(e.target.value)}
              />
            </div>
          )}

          {/* Pagamento */}
          <div style={s.subSection}>
            <div style={s.subSectionTitle}>Informações de Pagamento</div>
            <div style={s.grid2}>
              <div style={s.field}>
                <label style={s.label}>Status do Pagamento</label>
                <select
                  style={s.input}
                  value={statusPagamento}
                  onChange={(e) => handleStatusPagamentoChange(e.target.value)}
                >
                  <option value="pago">Pago integralmente</option>
                  <option value="parcial">Parcialmente pago</option>
                  <option value="pendente">Pendente (Não pago)</option>
                </select>
              </div>

              <div style={s.field}>
                <label style={s.label}>Valor Já Pago (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  style={s.input}
                  value={valorPago}
                  onChange={(e) => setValorPago(e.target.value)}
                />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Forma de Pagamento</label>
              <select
                style={s.input}
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
              >
                {(meta?.formasPagamento || ['Pix', 'Cartão de Crédito', 'Boleto']).map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {purchase.movimentacaoId && (
              <div style={s.checkRow}>
                <input
                  type="checkbox"
                  id="ajustarCaixa"
                  checked={ajustarCaixa}
                  onChange={(e) => setAjustarCaixa(e.target.checked)}
                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
                <label htmlFor="ajustarCaixa" style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
                  Sincronizar e atualizar a saída correspondente no Caixa
                </label>
              </div>
            )}
          </div>

          {/* Entrega */}
          <div style={s.subSection}>
            <div style={s.subSectionTitle}>Informações de Entrega</div>
            <div style={s.grid3}>
              <div style={s.field}>
                <label style={s.label}>Status da Entrega</label>
                <select
                  style={s.input}
                  value={statusEntrega}
                  onChange={(e) => handleStatusEntregaChange(e.target.value)}
                >
                  <option value="aguardando_envio">Aguardando envio</option>
                  <option value="enviado">Enviado</option>
                  <option value="em_transporte">Em transporte</option>
                  <option value="entregue">Já recebido / Entregue</option>
                </select>
              </div>

              <div style={s.field}>
                <label style={s.label}>Previsão de Chegada</label>
                <input
                  type="date"
                  style={s.input}
                  value={dataPrevisaoEntrega}
                  onChange={(e) => setDataPrevisaoEntrega(e.target.value)}
                />
              </div>

              <div style={s.field}>
                <label style={s.label}>Data de Recebimento</label>
                <input
                  type="date"
                  style={s.input}
                  value={dataEntrega}
                  onChange={(e) => setDataEntrega(e.target.value)}
                />
              </div>
            </div>

            <div style={s.grid2}>
              <div style={s.field}>
                <label style={s.label}>Código de Rastreamento</label>
                <input
                  style={s.input}
                  value={codigoRastreamento}
                  onChange={(e) => setCodigoRastreamento(e.target.value)}
                />
              </div>

              <div style={s.field}>
                <label style={s.label}>Quem recebeu o material?</label>
                <input
                  list="recebido-resp-list"
                  style={s.input}
                  placeholder="Nome de quem recebeu"
                  value={recebidoPor}
                  onChange={(e) => setRecebidoPor(e.target.value)}
                />
                <datalist id="recebido-resp-list">
                  {responsaveisList.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Observações da Entrega</label>
              <input
                style={s.input}
                value={observacoesEntrega}
                onChange={(e) => setObservacoesEntrega(e.target.value)}
              />
            </div>
          </div>

          {/* Responsável & Autor */}
          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Comprador *</label>
              <input
                list="compra-resp-list"
                style={s.input}
                value={comprador}
                onChange={(e) => setComprador(e.target.value)}
                required
              />
              <datalist id="compra-resp-list">
                {responsaveisList.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>

            <div style={s.field}>
              <label style={s.label}>Quem está editando? (Auditoria)</label>
              <input
                list="compra-resp-list"
                style={s.input}
                placeholder="Seu nome"
                value={autor}
                onChange={(e) => setAutor(e.target.value)}
              />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Descrição Detalhada / Finalidade</label>
            <textarea
              style={{ ...s.input, minHeight: 50 }}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div style={s.modalFooter}>
            <button type="button" style={s.btnCancel} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" style={s.btnSubmit} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
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
    background: 'rgba(0,0,0,0.85)',
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
    width: '100%',
    maxWidth: 680,
    maxHeight: '92vh',
    overflowY: 'auto',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 22px',
    borderBottom: '1px solid var(--border)',
  },
  modalTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text)' },
  closeBtn: {
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: 16,
    padding: '4px 8px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  modalBody: {
    padding: '20px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 14,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  input: {
    background: 'var(--bg-card2, #1f1f1f)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
  },
  subSection: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text)',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTop: '1px solid var(--border)',
  },
  btnCancel: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    padding: '8px 16px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    cursor: 'pointer',
  },
  btnSubmit: {
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    padding: '8px 20px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
};

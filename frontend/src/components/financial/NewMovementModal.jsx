import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function NewMovementModal({
  meta,
  onClose,
  onCreateMovement,
  onCreatePurchase,
}) {
  const [tab, setTab] = useState('entrada'); // 'entrada' | 'saida' | 'compra'
  const [saving, setSaving] = useState(false);

  // Campos para Entrada / Saída
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [responsavel, setResponsavel] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [comprovanteUrl, setComprovanteUrl] = useState('');

  // Campos para Compra
  const [produto, setProduto] = useState('');
  const [descCompra, setDescCompra] = useState('');
  const [catCompra, setCatCompra] = useState('Estrutura');
  const [quantidade, setQuantidade] = useState('1');
  const [valorUnitario, setValorUnitario] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [tipoLoja, setTipoLoja] = useState('online'); // 'online' | 'fisica'
  const [linkProduto, setLinkProduto] = useState('');
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().slice(0, 10));
  const [formaPagtoCompra, setFormaPagtoCompra] = useState('Pix');
  const [statusPagamento, setStatusPagamento] = useState('pago');
  const [valorPago, setValorPago] = useState('');
  const [dataPrevisaoEntrega, setDataPrevisaoEntrega] = useState('');
  const [statusEntrega, setStatusEntrega] = useState('aguardando_envio');
  const [codigoRastreamento, setCodigoRastreamento] = useState('');
  const [observacoesEntrega, setObservacoesEntrega] = useState('');
  const [comprador, setComprador] = useState('');
  const [gerarSaidaCaixa, setGerarSaidaCaixa] = useState(true);

  // Inicializa categoria ao mudar de aba
  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab === 'entrada') {
      setCategoria(meta?.categoriasEntrada?.[0] || 'Patrocínio');
    } else if (newTab === 'saida') {
      setCategoria(meta?.categoriasSaida?.[0] || 'Materiais de Fabricação / Estrutura');
    } else {
      setCatCompra(meta?.categoriasCompra?.[0] || 'Estrutura');
    }
  };

  // Atualização automática de valor total da compra
  const handleUnitOrQtyChange = (qtdVal, unitVal) => {
    const q = parseFloat(qtdVal) || 0;
    const u = parseFloat(unitVal) || 0;
    const tot = +(q * u).toFixed(2);
    setValorTotal(tot > 0 ? tot.toString() : '');
    if (statusPagamento === 'pago') {
      setValorPago(tot > 0 ? tot.toString() : '');
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (tab === 'entrada' || tab === 'saida') {
      if (!descricao.trim()) {
        toast.error('Informe a descrição da movimentação.');
        return;
      }
      if (!valor || parseFloat(valor) <= 0) {
        toast.error('Informe um valor válido maior que zero.');
        return;
      }
      if (!responsavel.trim()) {
        toast.error('Informe a pessoa responsável pelo registro.');
        return;
      }

      setSaving(true);
      try {
        await onCreateMovement({
          descricao: descricao.trim(),
          tipo: tab,
          categoria: categoria || (tab === 'entrada' ? 'Patrocínio' : 'Outros Custos Operacionais'),
          valor: parseFloat(valor),
          data,
          formaPagamento,
          responsavel: responsavel.trim(),
          observacoes: observacoes.trim(),
          comprovanteUrl: comprovanteUrl.trim(),
          autor: responsavel.trim(),
        });
        toast.success(`${tab === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
        onClose();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Erro ao registrar movimentação.');
      } finally {
        setSaving(false);
      }
    } else {
      // Compra
      if (!produto.trim()) {
        toast.error('Informe o nome do produto ou material.');
        return;
      }
      const numQtd = parseInt(quantidade, 10) || 1;
      const numTot = parseFloat(valorTotal) || 0;
      if (numTot <= 0) {
        toast.error('Informe o valor unitário ou valor total da compra.');
        return;
      }
      if (!comprador.trim()) {
        toast.error('Informe a pessoa que realizou a compra.');
        return;
      }

      let numPago = parseFloat(valorPago) || 0;
      if (statusPagamento === 'pago') numPago = numTot;
      if (statusPagamento === 'pendente') numPago = 0;

      setSaving(true);
      try {
        await onCreatePurchase({
          produto: produto.trim(),
          descricao: descCompra.trim(),
          categoria: catCompra || 'Estrutura',
          quantidade: numQtd,
          valorUnitario: parseFloat(valorUnitario) || +(numTot / numQtd).toFixed(2),
          valorTotal: numTot,
          fornecedor: fornecedor.trim(),
          tipoLoja,
          linkProduto: linkProduto.trim(),
          dataCompra,
          formaPagamento: formaPagtoCompra,
          statusPagamento,
          valorPago: numPago,
          dataPrevisaoEntrega: dataPrevisaoEntrega || null,
          statusEntrega,
          codigoRastreamento: codigoRastreamento.trim(),
          observacoesEntrega: observacoesEntrega.trim(),
          comprador: comprador.trim(),
          autor: comprador.trim(),
          gerarSaidaCaixa: Boolean(gerarSaidaCaixa),
        });
        toast.success('Compra cadastrada com sucesso!');
        onClose();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Erro ao registrar compra.');
      } finally {
        setSaving(false);
      }
    }
  };

  const responsaveisList = meta?.responsaveis || [];

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Novo Lançamento Financeiro</h3>
          <button style={s.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Abas seletoras: Entrada / Saída / Compra */}
        <div style={s.tabGroup}>
          <button
            type="button"
            onClick={() => handleTabChange('entrada')}
            style={{
              ...s.tabBtn,
              ...(tab === 'entrada' ? s.tabBtnActiveEntrada : {}),
            }}
          >
            Registrar Entrada
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('saida')}
            style={{
              ...s.tabBtn,
              ...(tab === 'saida' ? s.tabBtnActiveSaida : {}),
            }}
          >
            Registrar Saída
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('compra')}
            style={{
              ...s.tabBtn,
              ...(tab === 'compra' ? s.tabBtnActiveCompra : {}),
            }}
          >
            Registrar Compra
          </button>
        </div>

        <form onSubmit={handleSubmit} style={s.modalBody}>
          {/* Formulário de Entrada ou Saída */}
          {(tab === 'entrada' || tab === 'saida') && (
            <div style={s.formStack}>
              <div style={s.field}>
                <label style={s.label}>Descrição da movimentação *</label>
                <input
                  style={s.input}
                  placeholder={
                    tab === 'entrada'
                      ? 'Ex.: Patrocínio Empresa X, Venda de rifa'
                      : 'Ex.: Transporte de materiais, Lanches reunião'
                  }
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  required
                />
              </div>

              <div style={s.grid2}>
                <div style={s.field}>
                  <label style={s.label}>Categoria *</label>
                  <select
                    style={s.input}
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  >
                    {(tab === 'entrada'
                      ? meta?.categoriasEntrada || []
                      : meta?.categoriasSaida || []
                    ).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={s.field}>
                  <label style={s.label}>Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    style={s.input}
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={s.grid2}>
                <div style={s.field}>
                  <label style={s.label}>Data da movimentação *</label>
                  <input
                    type="date"
                    style={s.input}
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    required
                  />
                </div>

                <div style={s.field}>
                  <label style={s.label}>Forma de Pagamento / Recebimento</label>
                  <select
                    style={s.input}
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                  >
                    {(meta?.formasPagamento || ['Pix', 'Dinheiro', 'Boleto', 'Cartão de Crédito']).map(
                      (f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div style={s.grid2}>
                <div style={s.field}>
                  <label style={s.label}>Pessoa Responsável *</label>
                  <input
                    list="responsaveis-list"
                    style={s.input}
                    placeholder="Nome do responsável"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    required
                  />
                  <datalist id="responsaveis-list">
                    {responsaveisList.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>

                <div style={s.field}>
                  <label style={s.label}>Link do Comprovante (Opcional)</label>
                  <input
                    type="url"
                    style={s.input}
                    placeholder="https://drive.google.com/..."
                    value={comprovanteUrl}
                    onChange={(e) => setComprovanteUrl(e.target.value)}
                  />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Observações Adicionais</label>
                <textarea
                  style={{ ...s.input, minHeight: 60 }}
                  placeholder="Detalhes adicionais sobre a transação..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Formulário de Compra */}
          {tab === 'compra' && (
            <div style={s.formStack}>
              <div style={s.grid2}>
                <div style={s.field}>
                  <label style={s.label}>Produto / Material *</label>
                  <input
                    style={s.input}
                    placeholder="Ex.: Motor Brushless 2200kv, Chapa Alumínio"
                    value={produto}
                    onChange={(e) => setProduto(e.target.value)}
                    required
                  />
                </div>

                <div style={s.field}>
                  <label style={s.label}>Categoria da Compra *</label>
                  <select
                    style={s.input}
                    value={catCompra}
                    onChange={(e) => setCatCompra(e.target.value)}
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
                    placeholder="0,00"
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
                    min="0.01"
                    style={{ ...s.input, fontWeight: 700, color: 'var(--text)' }}
                    placeholder="0,00"
                    value={valorTotal}
                    onChange={(e) => {
                      setValorTotal(e.target.value);
                      if (statusPagamento === 'pago') setValorPago(e.target.value);
                    }}
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
                  <label style={s.label}>Nome da Loja / Fornecedor</label>
                  <input
                    style={s.input}
                    placeholder="Ex.: Mercado Livre, Leroy Merlin, RoboCore"
                    value={fornecedor}
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
                    placeholder="https://mercadolivre.com.br/... ou link da loja"
                    value={linkProduto}
                    onChange={(e) => setLinkProduto(e.target.value)}
                  />
                </div>
              )}

              {/* Informações de Pagamento */}
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
                      placeholder="0,00"
                      value={valorPago}
                      onChange={(e) => setValorPago(e.target.value)}
                      disabled={statusPagamento === 'pendente'}
                    />
                  </div>
                </div>

                <div style={s.field}>
                  <label style={s.label}>Forma de Pagamento</label>
                  <select
                    style={s.input}
                    value={formaPagtoCompra}
                    onChange={(e) => setFormaPagtoCompra(e.target.value)}
                  >
                    {(meta?.formasPagamento || ['Pix', 'Cartão de Crédito', 'Boleto']).map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Opção de vincular saída no caixa */}
                <div style={s.checkRow}>
                  <input
                    type="checkbox"
                    id="gerarSaidaCaixa"
                    checked={gerarSaidaCaixa}
                    onChange={(e) => setGerarSaidaCaixa(e.target.checked)}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                  />
                  <label htmlFor="gerarSaidaCaixa" style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
                    Lançar automaticamente a saída correspondente no Caixa (Evita lançar duas vezes)
                  </label>
                </div>
              </div>

              {/* Informações de Entrega */}
              <div style={s.subSection}>
                <div style={s.subSectionTitle}>Informações de Entrega e Rastreamento</div>
                <div style={s.grid3}>
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
                    <label style={s.label}>Status da Entrega</label>
                    <select
                      style={s.input}
                      value={statusEntrega}
                      onChange={(e) => setStatusEntrega(e.target.value)}
                    >
                      <option value="aguardando_envio">Aguardando envio</option>
                      <option value="enviado">Enviado</option>
                      <option value="em_transporte">Em transporte</option>
                      <option value="entregue">Já recebido / Entregue</option>
                    </select>
                  </div>

                  <div style={s.field}>
                    <label style={s.label}>Código de Rastreamento</label>
                    <input
                      style={s.input}
                      placeholder="Ex.: AA123456789BR"
                      value={codigoRastreamento}
                      onChange={(e) => setCodigoRastreamento(e.target.value)}
                    />
                  </div>
                </div>

                <div style={s.field}>
                  <label style={s.label}>Observações sobre a Entrega</label>
                  <input
                    style={s.input}
                    placeholder="Ex.: Deixar na portaria da Engenharia, retirar nos Correios..."
                    value={observacoesEntrega}
                    onChange={(e) => setObservacoesEntrega(e.target.value)}
                  />
                </div>
              </div>

              {/* Comprador / Responsável */}
              <div style={s.field}>
                <label style={s.label}>Pessoa que realizou a compra *</label>
                <input
                  list="responsaveis-list-compra"
                  style={s.input}
                  placeholder="Nome do membro comprador"
                  value={comprador}
                  onChange={(e) => setComprador(e.target.value)}
                  required
                />
                <datalist id="responsaveis-list-compra">
                  {responsaveisList.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>

              <div style={s.field}>
                <label style={s.label}>Descrição Detalhada do Item / Uso</label>
                <textarea
                  style={{ ...s.input, minHeight: 50 }}
                  placeholder="Aplicação no robô / projeto..."
                  value={descCompra}
                  onChange={(e) => setDescCompra(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Footer de ações */}
          <div style={s.modalFooter}>
            <button type="button" style={s.btnCancel} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                ...s.btnSubmit,
                background:
                  tab === 'entrada'
                    ? '#22c55e'
                    : tab === 'saida'
                    ? '#ef4444'
                    : 'var(--primary)',
              }}
              disabled={saving}
            >
              {saving
                ? 'Salvando...'
                : tab === 'entrada'
                ? 'Confirmar Entrada'
                : tab === 'saida'
                ? 'Confirmar Saída'
                : 'Salvar Compra'}
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
    background: 'rgba(0,0,0,0.8)',
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
  modalTitle: { fontSize: 17, fontWeight: 700, color: 'var(--text)' },
  closeBtn: {
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: 16,
    padding: '4px 8px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  tabGroup: {
    display: 'flex',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-card2, #181818)',
  },
  tabBtn: {
    flex: 1,
    padding: '12px 14px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-muted)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBtnActiveEntrada: {
    color: '#22c55e',
    borderBottom: '2px solid #22c55e',
    background: 'rgba(34,197,94,0.08)',
  },
  tabBtnActiveSaida: {
    color: '#ef4444',
    borderBottom: '2px solid #ef4444',
    background: 'rgba(239,68,68,0.08)',
  },
  tabBtnActiveCompra: {
    color: 'var(--text)',
    borderBottom: '2px solid var(--primary)',
    background: 'rgba(168,3,3,0.1)',
  },
  modalBody: { padding: '20px 22px' },
  formStack: {
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
    marginBottom: 2,
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
    marginTop: 22,
    paddingTop: 16,
    borderTop: '1px solid var(--border)',
  },
  btnCancel: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    padding: '9px 18px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    cursor: 'pointer',
  },
  btnSubmit: {
    color: '#fff',
    border: 'none',
    padding: '9px 20px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
  },
};

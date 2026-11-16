import React from 'react';

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
};

const fmtMoney = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_PAYMENT_META = {
  pago:     { label: 'Pago',      bg: 'rgba(34,197,94,0.18)', color: '#22c55e' },
  parcial:  { label: 'Parcial',   bg: 'rgba(234,179,8,0.18)', color: '#eab308' },
  pendente: { label: 'Pendente',  bg: 'rgba(239,68,68,0.18)', color: '#ef4444' },
};

const STATUS_DELIVERY_META = {
  aguardando_envio: { label: 'Aguardando envio', bg: 'rgba(156,163,175,0.18)', color: '#9ca3af' },
  enviado:          { label: 'Enviado',          bg: 'rgba(56,189,248,0.18)',  color: '#38bdf8' },
  em_transporte:    { label: 'Em transporte',    bg: 'rgba(168,85,247,0.18)', color: '#a855f7' },
  entregue:         { label: 'Entregue',         bg: 'rgba(34,197,94,0.18)',  color: '#22c55e' },
  atrasado:         { label: 'Atrasado',         bg: 'rgba(239,68,68,0.18)',  color: '#ef4444' },
};

export default function PurchasesList({
  purchases = [],
  loading,
  isAdmin,
  quickFilter,
  onQuickFilterChange,
  onViewDetails,
  onEdit,
  onPayPurchase,
  onConfirmDelivery,
  onCancel,
}) {
  const quickOptions = [
    { key: '', label: 'Todas as Compras' },
    { key: 'atrasadas', label: 'Atrasadas', highlight: true },
    { key: 'proximas', label: 'Próximas da Entrega' },
    { key: 'aguardando_pagamento', label: 'Aguardando Pagamento' },
    { key: 'aguardando_envio', label: 'Aguardando Envio' },
    { key: 'em_transporte', label: 'Em Transporte' },
    { key: 'entregues', label: 'Entregues' },
  ];

  if (loading) {
    return (
      <div style={s.center}>
        <div style={s.spinner} />
        <span style={{ marginTop: 12, color: 'var(--text-muted)' }}>Carregando compras...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Barra de Filtros Rápidos de Entrega / Status */}
      <div style={s.quickBar}>
        {quickOptions.map((opt) => {
          const active = quickFilter === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onQuickFilterChange(opt.key)}
              style={{
                ...s.quickBtn,
                ...(active ? s.quickBtnActive : {}),
                ...(opt.highlight && !active ? { borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' } : {}),
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {purchases.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Nenhuma compra encontrada</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Nenhum registro corresponde ao filtro selecionado.
          </div>
        </div>
      ) : (
        <>
          {/* Visualização Desktop */}
          <div className="payment-table-desktop">
            <table style={s.table}>
              <thead>
                <tr style={s.theadRow}>
                  <th style={s.th}>Data</th>
                  <th style={s.th}>Produto / Material</th>
                  <th style={s.th}>Categoria</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Qtd</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Total</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Pago / Restante</th>
                  <th style={s.th}>Pagamento</th>
                  <th style={s.th}>Entrega</th>
                  <th style={s.th}>Previsão / Chegada</th>
                  <th style={s.th}>Comprador</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => {
                  const isCancelado = p.status === 'cancelado';
                  const isAtrasado = p.isAtrasado;
                  const isProximo = p.isProximoEntrega;
                  const payMeta = STATUS_PAYMENT_META[p.statusPagamento] || STATUS_PAYMENT_META.pendente;
                  const delMeta = (isAtrasado && p.statusEntrega !== 'entregue')
                    ? STATUS_DELIVERY_META.atrasado
                    : (STATUS_DELIVERY_META[p.statusEntrega] || STATUS_DELIVERY_META.aguardando_envio);

                  const valorTotal = Number(p.valorTotal) || 0;
                  const valorPago = Number(p.valorPago) || 0;
                  const valorRestante = Math.max(0, valorTotal - valorPago);
                  const precisaPagar = p.statusPagamento !== 'pago' || valorRestante > 0;

                  return (
                    <tr
                      key={p._id}
                      style={{
                        ...s.tr,
                        opacity: isCancelado ? 0.6 : 1,
                        background: isAtrasado
                          ? 'rgba(239,68,68,0.04)'
                          : isProximo
                          ? 'rgba(234,179,8,0.03)'
                          : 'transparent',
                      }}
                    >
                      <td style={s.td}>{fmtDate(p.dataCompra)}</td>
                      <td style={{ ...s.td, maxWidth: 220 }}>
                        <div style={s.prodName}>
                          {p.produto}
                          {isAtrasado && (
                            <span style={s.tagAtrasado}>Atrasado</span>
                          )}
                          {isProximo && (
                            <span style={s.tagProximo}>Chegando</span>
                          )}
                        </div>
                        <div style={s.prodSub}>
                          <span style={p.tipoLoja === 'fisica' ? s.tagLojaFisica : s.tagLojaOnline}>
                            {p.tipoLoja === 'fisica' ? 'Loja Física' : 'Loja Online'}
                          </span>
                          {p.fornecedor ? ` • ${p.fornecedor}` : ''}
                        </div>
                        {p.tipoLoja !== 'fisica' && p.linkProduto && (
                          <a
                            href={p.linkProduto}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={s.link}
                          >
                            Link do produto / comprovante &rarr;
                          </a>
                        )}
                      </td>
                      <td style={s.td}>
                        <span style={s.categoryTag}>{p.categoria}</span>
                      </td>
                      <td style={{ ...s.td, textAlign: 'center', fontWeight: 600 }}>
                        {p.quantidade}
                      </td>
                      <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                        {fmtMoney(valorTotal)}
                      </td>
                      <td style={{ ...s.td, textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: valorPago > 0 ? '#22c55e' : 'var(--text-muted)' }}>
                          {fmtMoney(valorPago)}
                        </div>
                        {valorRestante > 0 && (
                          <div style={{ fontSize: 11, color: '#eab308' }}>
                            Resta {fmtMoney(valorRestante)}
                          </div>
                        )}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: payMeta.bg, color: payMeta.color }}>
                          {payMeta.label}
                        </span>
                        {p.formaPagamento && (
                          <div style={s.subText}>{p.formaPagamento}</div>
                        )}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: delMeta.bg, color: delMeta.color }}>
                          {delMeta.label}
                        </span>
                      </td>
                      <td style={s.td}>
                        {p.statusEntrega === 'entregue' ? (
                          <div>
                            <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
                              Entregue {fmtDate(p.dataEntrega)}
                            </div>
                            {p.recebidoPor && (
                              <div style={s.subText}>Por: {p.recebidoPor}</div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: isAtrasado ? 700 : 500,
                                color: isAtrasado ? '#ef4444' : isProximo ? '#eab308' : 'var(--text)',
                              }}
                            >
                              {p.dataPrevisaoEntrega ? fmtDate(p.dataPrevisaoEntrega) : 'Sem previsão'}
                            </div>
                            {p.codigoRastreamento && (
                              <div style={{ fontSize: 11, color: '#38bdf8' }}>
                                Rastreio: {p.codigoRastreamento}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>{p.comprador}</span>
                      </td>
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <div style={s.actions}>
                          <button
                            title="Ver detalhes e histórico de alterações"
                            style={s.btnDetails}
                            onClick={() => onViewDetails(p)}
                          >
                            Detalhes
                          </button>
                          {isAdmin && !isCancelado && precisaPagar && onPayPurchase && (
                            <button
                              title="Registrar pagamento e debitar do caixa"
                              style={s.btnPay}
                              onClick={() => onPayPurchase(p)}
                            >
                              Pagar
                            </button>
                          )}
                          {isAdmin && !isCancelado && p.statusEntrega !== 'entregue' && (
                            <button
                              title="Marcar como entregue"
                              style={s.btnReceive}
                              onClick={() => onConfirmDelivery(p)}
                            >
                              Recebido
                            </button>
                          )}
                          {isAdmin && !isCancelado && (
                            <>
                              <button
                                title="Editar compra"
                                style={s.btnEdit}
                                onClick={() => onEdit(p)}
                              >
                                Editar
                              </button>
                              <button
                                title="Cancelar compra"
                                style={s.btnCancel}
                                onClick={() => onCancel(p)}
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Visualização Mobile (Cards) */}
          <div className="payment-cards-mobile">
            {purchases.map((p) => {
              const isCancelado = p.status === 'cancelado';
              const isAtrasado = p.isAtrasado;
              const isProximo = p.isProximoEntrega;
              const payMeta = STATUS_PAYMENT_META[p.statusPagamento] || STATUS_PAYMENT_META.pendente;
              const delMeta = (isAtrasado && p.statusEntrega !== 'entregue')
                ? STATUS_DELIVERY_META.atrasado
                : (STATUS_DELIVERY_META[p.statusEntrega] || STATUS_DELIVERY_META.aguardando_envio);

              const valorTotal = Number(p.valorTotal) || 0;
              const valorPago = Number(p.valorPago) || 0;
              const valorRestante = Math.max(0, valorTotal - valorPago);
              const precisaPagar = p.statusPagamento !== 'pago' || valorRestante > 0;

              return (
                <div
                  key={p._id}
                  style={{
                    ...s.mobileCard,
                    opacity: isCancelado ? 0.6 : 1,
                    borderLeft: `4px solid ${
                      isAtrasado ? '#ef4444' : isProximo ? '#eab308' : p.statusEntrega === 'entregue' ? '#22c55e' : '#38bdf8'
                    }`,
                  }}
                >
                  <div style={s.mCardTop}>
                    <div>
                      <span style={{ ...s.badge, background: delMeta.bg, color: delMeta.color }}>
                        {delMeta.label}
                      </span>
                      <span style={{ ...s.badge, background: payMeta.bg, color: payMeta.color, marginLeft: 6 }}>
                        {payMeta.label}
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>
                      {fmtMoney(valorTotal)}
                    </div>
                  </div>

                  <div style={s.mCardTitle}>
                    {p.quantidade}x {p.produto}
                    {isAtrasado && <span style={s.tagAtrasado}>Atrasado</span>}
                    {isProximo && <span style={s.tagProximo}>Chegando</span>}
                  </div>

                  <div style={s.mCardMeta}>
                    <div>
                      <span style={s.mLabel}>Tipo: </span>
                      <span style={p.tipoLoja === 'fisica' ? s.tagLojaFisica : s.tagLojaOnline}>
                        {p.tipoLoja === 'fisica' ? 'Loja Física' : 'Loja Online'}
                      </span>
                    </div>
                    {p.fornecedor && (
                      <div>
                        <span style={s.mLabel}>Fornecedor / Loja: </span>
                        <span style={s.mVal}>{p.fornecedor}</span>
                      </div>
                    )}
                    {p.tipoLoja !== 'fisica' && p.linkProduto && (
                      <div>
                        <span style={s.mLabel}>Link: </span>
                        <a href={p.linkProduto} target="_blank" rel="noopener noreferrer" style={s.link}>
                          Ver link / comprovante &rarr;
                        </a>
                      </div>
                    )}
                    <div>
                      <span style={s.mLabel}>Categoria: </span>
                      <span style={s.mVal}>{p.categoria}</span>
                    </div>
                    <div>
                      <span style={s.mLabel}>Comprador: </span>
                      <span style={s.mVal}>{p.comprador}</span>
                    </div>
                    <div>
                      <span style={s.mLabel}>Previsão Chegada: </span>
                      <span
                        style={{
                          ...s.mVal,
                          color: isAtrasado ? '#ef4444' : isProximo ? '#eab308' : 'var(--text)',
                        }}
                      >
                        {p.dataPrevisaoEntrega ? fmtDate(p.dataPrevisaoEntrega) : 'Sem previsão'}
                      </span>
                    </div>
                    {p.statusEntrega === 'entregue' && (
                      <div>
                        <span style={s.mLabel}>Recebido em: </span>
                        <span style={{ ...s.mVal, color: '#22c55e' }}>
                          {fmtDate(p.dataEntrega)} {p.recebidoPor ? `(por ${p.recebidoPor})` : ''}
                        </span>
                      </div>
                    )}
                    <div>
                      <span style={s.mLabel}>Financeiro: </span>
                      <span style={s.mVal}>
                        Pago {fmtMoney(valorPago)} {valorRestante > 0 ? `| Resta ${fmtMoney(valorRestante)}` : ''}
                      </span>
                    </div>
                  </div>

                  <div style={s.mCardActions}>
                    <button style={s.btnDetails} onClick={() => onViewDetails(p)}>
                      Detalhes
                    </button>
                    {isAdmin && !isCancelado && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {precisaPagar && onPayPurchase && (
                          <button style={s.btnPay} onClick={() => onPayPurchase(p)}>
                            Pagar
                          </button>
                        )}
                        {p.statusEntrega !== 'entregue' && (
                          <button style={s.btnReceive} onClick={() => onConfirmDelivery(p)}>
                            Receber
                          </button>
                        )}
                        <button style={s.btnEdit} onClick={() => onEdit(p)}>
                          Editar
                        </button>
                        <button style={s.btnCancel} onClick={() => onCancel(p)}>
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  quickBar: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 12,
    marginBottom: 16,
    scrollbarWidth: 'none',
  },
  quickBtn: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    padding: '7px 14px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  quickBtnActive: {
    background: 'var(--primary)',
    borderColor: 'var(--primary)',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(168,3,3,0.3)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  theadRow: {
    background: 'var(--bg-card2, #1a1a1a)',
    borderBottom: '1px solid var(--border)',
  },
  th: {
    padding: '12px 14px',
    color: 'var(--text-muted)',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.15s',
  },
  td: {
    padding: '12px 14px',
    verticalAlign: 'middle',
  },
  prodName: {
    fontWeight: 600,
    color: 'var(--text)',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  prodSub: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  link: {
    fontSize: 11,
    color: '#38bdf8',
    textDecoration: 'none',
    display: 'inline-block',
    marginTop: 2,
  },
  categoryTag: {
    background: 'var(--bg-card-alt)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '2px 7px',
    fontSize: 11,
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  subText: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  tagLojaOnline: {
    background: 'rgba(56,189,248,0.14)',
    color: '#38bdf8',
    border: '1px solid rgba(56,189,248,0.3)',
    borderRadius: 3,
    padding: '1px 5px',
    fontSize: 10,
    fontWeight: 600,
    display: 'inline-block',
  },
  tagLojaFisica: {
    background: 'rgba(234,179,8,0.14)',
    color: '#eab308',
    border: '1px solid rgba(234,179,8,0.3)',
    borderRadius: 3,
    padding: '1px 5px',
    fontSize: 10,
    fontWeight: 600,
    display: 'inline-block',
  },
  tagAtrasado: {
    background: '#ef4444',
    color: '#fff',
    borderRadius: 3,
    padding: '1px 5px',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  tagProximo: {
    background: '#eab308',
    color: '#000',
    borderRadius: 3,
    padding: '1px 5px',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  actions: {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  btnDetails: {
    background: 'var(--bg-card-alt)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: 'var(--radius)',
    padding: '4px 8px',
    fontSize: 11,
    cursor: 'pointer',
    fontWeight: 500,
  },
  btnPay: {
    background: 'rgba(34,197,94,0.15)',
    border: '1px solid rgba(34,197,94,0.4)',
    color: '#22c55e',
    borderRadius: 'var(--radius)',
    padding: '4px 9px',
    fontSize: 11,
    cursor: 'pointer',
    fontWeight: 600,
  },
  btnReceive: {
    background: 'rgba(56,189,248,0.15)',
    border: '1px solid rgba(56,189,248,0.4)',
    color: '#38bdf8',
    borderRadius: 'var(--radius)',
    padding: '4px 8px',
    fontSize: 11,
    cursor: 'pointer',
    fontWeight: 600,
  },
  btnEdit: {
    background: 'var(--bg-card-alt)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: 'var(--radius)',
    padding: '4px 8px',
    fontSize: 11,
    cursor: 'pointer',
  },
  btnCancel: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#ef4444',
    borderRadius: 'var(--radius)',
    padding: '4px 8px',
    fontSize: 11,
    cursor: 'pointer',
  },
  mobileCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: 14,
    marginBottom: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  mCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mCardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  mCardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 12,
  },
  mLabel: {
    color: 'var(--text-muted)',
  },
  mVal: {
    color: 'var(--text)',
    fontWeight: 500,
  },
  mCardActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--border)',
    paddingTop: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid var(--border)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  empty: {
    textAlign: 'center',
    padding: 40,
    color: 'var(--text-muted)',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px dashed var(--border)',
  },
};
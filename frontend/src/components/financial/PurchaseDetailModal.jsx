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
  pago:     { label: 'Pago integralmente', bg: 'rgba(34,197,94,0.18)', color: '#22c55e' },
  parcial:  { label: 'Parcialmente pago',  bg: 'rgba(234,179,8,0.18)', color: '#eab308' },
  pendente: { label: 'Pendente',           bg: 'rgba(239,68,68,0.18)', color: '#ef4444' },
};

const STATUS_DELIVERY_META = {
  aguardando_envio: { label: 'Aguardando envio', bg: 'rgba(156,163,175,0.18)', color: '#9ca3af' },
  enviado:          { label: 'Enviado',          bg: 'rgba(56,189,248,0.18)',  color: '#38bdf8' },
  em_transporte:    { label: 'Em transporte',    bg: 'rgba(168,85,247,0.18)', color: '#a855f7' },
  entregue:         { label: 'Entregue / Recebido', bg: 'rgba(34,197,94,0.18)',  color: '#22c55e' },
  atrasado:         { label: 'Atrasado',         bg: 'rgba(239,68,68,0.18)',  color: '#ef4444' },
};

const DELIVERY_STEPS = [
  { key: 'aguardando_envio', label: 'Aguardando Envio' },
  { key: 'enviado', label: 'Enviado' },
  { key: 'em_transporte', label: 'Em Transporte' },
  { key: 'entregue', label: 'Entregue' },
];

export default function PurchaseDetailModal({
  purchase,
  onClose,
  onEdit,
  onConfirmDelivery,
  isAdmin,
}) {
  if (!purchase) return null;

  const isCancelado = purchase.status === 'cancelado';
  const isAtrasado = purchase.isAtrasado;
  const payMeta = STATUS_PAYMENT_META[purchase.statusPagamento] || STATUS_PAYMENT_META.pendente;
  const delMeta = (isAtrasado && purchase.statusEntrega !== 'entregue')
    ? STATUS_DELIVERY_META.atrasado
    : (STATUS_DELIVERY_META[purchase.statusEntrega] || STATUS_DELIVERY_META.aguardando_envio);

  const valorTotal = Number(purchase.valorTotal) || 0;
  const valorPago = Number(purchase.valorPago) || 0;
  const valorRestante = Math.max(0, valorTotal - valorPago);

  // Determina índice do passo de entrega
  const currentStepIndex = DELIVERY_STEPS.findIndex((s) => s.key === purchase.statusEntrega);

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.modalHeader}>
          <div>
            <div style={s.headerTag}>DETALHES DA COMPRA #{purchase._id.slice(-6)}</div>
            <h3 style={s.modalTitle}>{purchase.produto}</h3>
          </div>
          <button style={s.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={s.modalBody}>
          {/* Alerta de Atraso ou Cancelamento */}
          {isCancelado && (
            <div style={s.cancelBox}>
              <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
                Compra Cancelada
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>
                <strong>Motivo:</strong> {purchase.justificativaCancelamento}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Cancelado por {purchase.canceladoPor} em {fmtDate(purchase.canceladoEm)}
              </div>
            </div>
          )}

          {isAtrasado && !isCancelado && purchase.statusEntrega !== 'entregue' && (
            <div style={s.alertBox}>
              <div>
                <strong>Entrega Atrasada:</strong> A data prevista era {fmtDate(purchase.dataPrevisaoEntrega)}.
              </div>
            </div>
          )}

          {/* Stepper Visual de Entrega */}
          <div style={s.stepperCard}>
            <div style={s.stepperHeader}>
              <span style={s.secTitle}>Fluxo de Entrega</span>
              <span style={{ ...s.badge, background: delMeta.bg, color: delMeta.color }}>
                {delMeta.label}
              </span>
            </div>

            <div style={s.stepperRow}>
              {DELIVERY_STEPS.map((step, idx) => {
                const isPassed = currentStepIndex >= idx || purchase.statusEntrega === 'entregue';
                const isCurrent = purchase.statusEntrega === step.key;

                return (
                  <div key={step.key} style={s.stepItem}>
                    <div
                      style={{
                        ...s.stepCircle,
                        background: isPassed ? '#22c55e' : 'var(--bg-card2, #262626)',
                        border: isCurrent ? '2px solid #fff' : '1px solid var(--border)',
                        color: isPassed ? '#fff' : 'var(--text-muted)',
                      }}
                    >
                      {isPassed ? '✓' : idx + 1}
                    </div>
                    <span
                      style={{
                        ...s.stepLabel,
                        color: isPassed ? 'var(--text)' : 'var(--text-muted)',
                        fontWeight: isCurrent ? 700 : 500,
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid de Informações Principais */}
          <div style={s.infoGrid}>
            {/* Informações do Item */}
            <div style={s.infoBlock}>
              <h4 style={s.blockTitle}>Dados do Produto</h4>
              <div style={s.row}>
                <span style={s.label}>Categoria:</span>
                <span style={s.val}>{purchase.categoria}</span>
              </div>
              <div style={s.row}>
                <span style={s.label}>Quantidade:</span>
                <span style={s.val}>{purchase.quantidade} unidade(s)</span>
              </div>
              <div style={s.row}>
                <span style={s.label}>Valor Unitário:</span>
                <span style={s.val}>{fmtMoney(purchase.valorUnitario)}</span>
              </div>
              <div style={s.row}>
                <span style={s.label}>Tipo de Loja:</span>
                <span style={{ ...s.val, fontWeight: 600, color: purchase.tipoLoja === 'fisica' ? '#eab308' : '#38bdf8' }}>
                  {purchase.tipoLoja === 'fisica' ? 'Loja Física' : 'Loja Online'}
                </span>
              </div>
              <div style={s.row}>
                <span style={s.label}>Fornecedor / Loja:</span>
                <span style={s.val}>{purchase.fornecedor || '—'}</span>
              </div>
              <div style={s.row}>
                <span style={s.label}>Data da Compra:</span>
                <span style={s.val}>{fmtDate(purchase.dataCompra)}</span>
              </div>
              {purchase.tipoLoja === 'online' && (
                <div style={s.row}>
                  <span style={s.label}>Link do Produto:</span>
                  {purchase.linkProduto ? (
                    <a
                      href={purchase.linkProduto}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={s.link}
                    >
                      Abrir link da loja &rarr;
                    </a>
                  ) : (
                    <span style={{ ...s.val, color: 'var(--text-muted)' }}>Não informado</span>
                  )}
                </div>
              )}
              {purchase.descricao && (
                <div style={{ marginTop: 8 }}>
                  <span style={s.label}>Descrição / Aplicação:</span>
                  <div style={s.descText}>{purchase.descricao}</div>
                </div>
              )}
            </div>

            {/* Informações Financeiras */}
            <div style={s.infoBlock}>
              <h4 style={s.blockTitle}>Situação Financeira</h4>
              <div style={s.row}>
                <span style={s.label}>Valor Total:</span>
                <span style={{ ...s.val, fontWeight: 700, fontSize: 15 }}>
                  {fmtMoney(valorTotal)}
                </span>
              </div>
              <div style={s.row}>
                <span style={s.label}>Valor Pago:</span>
                <span style={{ ...s.val, color: '#22c55e', fontWeight: 700 }}>
                  {fmtMoney(valorPago)}
                </span>
              </div>
              <div style={s.row}>
                <span style={s.label}>Restante a Pagar:</span>
                <span style={{ ...s.val, color: valorRestante > 0 ? '#eab308' : 'var(--text-muted)' }}>
                  {fmtMoney(valorRestante)}
                </span>
              </div>
              <div style={s.row}>
                <span style={s.label}>Status do Pagamento:</span>
                <span style={{ ...s.badge, background: payMeta.bg, color: payMeta.color }}>
                  {payMeta.label}
                </span>
              </div>
              <div style={s.row}>
                <span style={s.label}>Forma de Pagamento:</span>
                <span style={s.val}>{purchase.formaPagamento}</span>
              </div>
              <div style={s.row}>
                <span style={s.label}>Data da Compra:</span>
                <span style={s.val}>{fmtDate(purchase.dataCompra)}</span>
              </div>
              {purchase.movimentacaoId && (
                <div style={s.linkedMovBox}>
                  <span style={{ fontSize: 12, color: '#38bdf8' }}>
                    Saída vinculada no Caixa (#{purchase.movimentacaoId._id ? purchase.movimentacaoId._id.slice(-6) : 'OK'})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dados de Entrega e Responsabilidade */}
          <div style={s.infoGrid}>
            <div style={s.infoBlock}>
              <h4 style={s.blockTitle}>Detalhes da Entrega</h4>
              <div style={s.row}>
                <span style={s.label}>Previsão de Chegada:</span>
                <span style={s.val}>{fmtDate(purchase.dataPrevisaoEntrega)}</span>
              </div>
              <div style={s.row}>
                <span style={s.label}>Data de Recebimento:</span>
                <span style={s.val}>{fmtDate(purchase.dataEntrega)}</span>
              </div>
              {purchase.recebidoPor && (
                <div style={s.row}>
                  <span style={s.label}>Recebido por:</span>
                  <span style={s.val}>{purchase.recebidoPor}</span>
                </div>
              )}
              <div style={s.row}>
                <span style={s.label}>Código de Rastreamento:</span>
                <span style={s.val}>{purchase.codigoRastreamento || '—'}</span>
              </div>
              {purchase.observacoesEntrega && (
                <div style={{ marginTop: 8 }}>
                  <span style={s.label}>Observações da Entrega:</span>
                  <div style={s.descText}>{purchase.observacoesEntrega}</div>
                </div>
              )}
            </div>

            <div style={s.infoBlock}>
              <h4 style={s.blockTitle}>Responsáveis & Auditoria</h4>
              <div style={s.row}>
                <span style={s.label}>Comprador / Solicitante:</span>
                <span style={s.val}>{purchase.comprador}</span>
              </div>
              <div style={s.row}>
                <span style={s.label}>Cadastrado Por:</span>
                <span style={s.val}>{purchase.criadoPor}</span>
              </div>
              <div style={s.row}>
                <span style={s.label}>Última Alteração Por:</span>
                <span style={s.val}>{purchase.atualizadoPor || purchase.criadoPor}</span>
              </div>
              <div style={s.row}>
                <span style={s.label}>Última Atualização:</span>
                <span style={s.val}>{new Date(purchase.updatedAt).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* Linha do Tempo / Histórico de Alterações */}
          <div style={s.historySection}>
            <h4 style={s.historySectionTitle}>Histórico Completo de Alterações</h4>
            {purchase.historico && purchase.historico.length > 0 ? (
              <div style={s.timeline}>
                {purchase.historico.map((h, idx) => (
                  <div key={idx} style={s.timelineItem}>
                    <div style={s.timelineDot} />
                    <div style={s.timelineContent}>
                      <div style={s.timelineHeader}>
                        <span style={s.timelineAction}>{h.acao}</span>
                        <span style={s.timelineDate}>
                          {new Date(h.data).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div style={s.timelineAuthor}>
                        Autor: <strong>{h.autor}</strong>
                      </div>
                      {h.detalhes && <div style={s.timelineDetails}>{h.detalhes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Nenhum histórico detalhado registrado.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={s.modalFooter}>
          {isAdmin && !isCancelado && (
            <div style={{ display: 'flex', gap: 8, marginRight: 'auto' }}>
              {purchase.statusEntrega !== 'entregue' && (
                <button
                  style={s.btnReceive}
                  onClick={() => {
                    onClose();
                    onConfirmDelivery(purchase);
                  }}
                >
                  ✓ Marcar como Recebido
                </button>
              )}
              <button
                style={s.btnEdit}
                onClick={() => {
                  onClose();
                  onEdit(purchase);
                }}
              >
                Editar Compra
              </button>
            </div>
          )}
          <button style={s.btnClose} onClick={onClose}>
            Fechar
          </button>
        </div>
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
    maxWidth: 750,
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
    padding: '18px 24px',
    borderBottom: '1px solid var(--border)',
  },
  headerTag: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
    marginBottom: 2,
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text)' },
  closeBtn: {
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: 18,
    padding: '4px 8px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  modalBody: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  cancelBox: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8,
    padding: '12px 16px',
  },
  alertBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.4)',
    color: '#ef4444',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
  },
  stepperCard: {
    background: 'var(--bg-card2, #181818)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '14px 18px',
  },
  stepperHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  secTitle: { fontSize: 13, fontWeight: 700, color: 'var(--text)' },
  stepperRow: {
    display: 'flex',
    justifyContent: 'space-between',
    position: 'relative',
    gap: 10,
    flexWrap: 'wrap',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 120,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
  },
  stepLabel: { fontSize: 12 },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 14,
  },
  infoBlock: {
    background: 'var(--bg-card2, #181818)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
    paddingBottom: 6,
    marginBottom: 4,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
  },
  label: { color: 'var(--text-muted)' },
  val: { color: 'var(--text)', fontWeight: 500 },
  descText: {
    fontSize: 12,
    color: 'var(--text)',
    background: 'rgba(0,0,0,0.2)',
    padding: '6px 10px',
    borderRadius: 6,
    marginTop: 4,
  },
  link: { color: '#38bdf8', textDecoration: 'none', fontSize: 12 },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 8px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
  },
  linkedMovBox: {
    background: 'rgba(56,189,248,0.1)',
    border: '1px solid rgba(56,189,248,0.3)',
    borderRadius: 6,
    padding: '6px 10px',
    marginTop: 6,
  },
  historySection: {
    background: 'var(--bg-card2, #181818)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '16px',
  },
  historySectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: 12,
    borderBottom: '1px solid var(--border)',
    paddingBottom: 6,
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    borderLeft: '2px solid var(--border)',
    paddingLeft: 14,
    marginLeft: 6,
  },
  timelineItem: { position: 'relative' },
  timelineDot: {
    position: 'absolute',
    left: -19,
    top: 4,
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--primary)',
  },
  timelineContent: {
    background: '#222',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  timelineAction: { fontWeight: 700, fontSize: 12, color: 'var(--text)' },
  timelineDate: { fontSize: 11, color: 'var(--text-muted)' },
  timelineAuthor: { fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 },
  timelineDetails: { fontSize: 12, color: 'var(--text)' },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '14px 24px',
    borderTop: '1px solid var(--border)',
  },
  btnReceive: {
    background: 'rgba(34,197,94,0.2)',
    color: '#22c55e',
    border: '1px solid #22c55e',
    padding: '8px 14px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnEdit: {
    background: 'transparent',
    color: '#38bdf8',
    border: '1px solid #38bdf8',
    padding: '8px 14px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    cursor: 'pointer',
  },
  btnClose: {
    background: 'transparent',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    padding: '8px 18px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    cursor: 'pointer',
  },
};

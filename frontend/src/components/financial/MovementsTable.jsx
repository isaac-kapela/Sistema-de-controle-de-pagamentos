import React, { useState } from 'react';

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

export default function MovementsTable({
  movements = [],
  loading,
  isAdmin,
  onEdit,
  onCancel,
  onViewDetails,
}) {
  const [selectedMovement, setSelectedMovement] = useState(null);

  if (loading) {
    return (
      <div style={s.center}>
        <div style={s.spinner} />
        <span style={{ marginTop: 12, color: 'var(--text-muted)' }}>Carregando movimentações...</span>
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div style={s.empty}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Nenhuma movimentação encontrada</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Altere os filtros de busca ou registre uma nova entrada/saída.
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Visualização Desktop */}
      <div className="payment-table-desktop">
        <table style={s.table}>
          <thead>
            <tr style={s.theadRow}>
              <th style={s.th}>Data</th>
              <th style={s.th}>Tipo</th>
              <th style={s.th}>Descrição</th>
              <th style={s.th}>Categoria</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Valor</th>
              <th style={s.th}>Pagamento</th>
              <th style={s.th}>Responsável</th>
              <th style={s.th}>Status</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => {
              const isEntrada = m.tipo === 'entrada';
              const isCancelado = m.status === 'cancelado';

              return (
                <tr
                  key={m._id}
                  style={{
                    ...s.tr,
                    opacity: isCancelado ? 0.6 : 1,
                    background: isCancelado ? 'rgba(239,68,68,0.03)' : 'transparent',
                  }}
                >
                  <td style={s.td}>{fmtDate(m.data)}</td>
                  <td style={s.td}>
                    <span
                      style={{
                        ...s.badge,
                        background: isEntrada ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)',
                        color: isEntrada ? '#22c55e' : '#ef4444',
                      }}
                    >
                      <span
                        style={{
                          ...s.badgeDot,
                          background: isEntrada ? '#22c55e' : '#ef4444',
                        }}
                      />
                      {isEntrada ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td style={{ ...s.td, maxWidth: 220 }}>
                    <div style={s.descMain}>{m.descricao}</div>
                    {m.compraId && (
                      <span style={s.tagLinked}>
                        Compra vinculada: {m.compraId.produto || 'Item'}
                      </span>
                    )}
                    {m.observacoes && <div style={s.descSub}>{m.observacoes}</div>}
                  </td>
                  <td style={s.td}>
                    <span style={s.catPill}>{m.categoria}</span>
                  </td>
                  <td
                    style={{
                      ...s.td,
                      textAlign: 'right',
                      fontWeight: 700,
                      color: isCancelado
                        ? 'var(--text-muted)'
                        : isEntrada
                        ? 'var(--success)'
                        : 'var(--danger)',
                    }}
                  >
                    {isEntrada ? '+' : '-'} {fmtMoney(m.valor)}
                  </td>
                  <td style={s.td}>
                    <span style={s.badgePay}>{m.formaPagamento || 'Pix'}</span>
                  </td>
                  <td style={s.td}>
                    <div style={s.respText}>{m.responsavel}</div>
                  </td>
                  <td style={s.td}>
                    {isCancelado ? (
                      <span style={{ ...s.badge, background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                        Cancelado
                      </span>
                    ) : (
                      <span style={{ ...s.badge, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                        Ativo
                      </span>
                    )}
                  </td>
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    <div style={s.actions}>
                      <button
                        title="Ver histórico e auditoria"
                        style={s.btnIcon}
                        onClick={() => setSelectedMovement(m)}
                      >
                        Detalhes
                      </button>
                      {isAdmin && !isCancelado && (
                        <>
                          <button
                            title="Editar movimentação"
                            style={s.editBtn}
                            onClick={() => onEdit(m)}
                          >
                            Editar
                          </button>
                          <button
                            title="Cancelar movimentação"
                            style={s.delBtn}
                            onClick={() => onCancel(m)}
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
        {movements.map((m) => {
          const isEntrada = m.tipo === 'entrada';
          const isCancelado = m.status === 'cancelado';

          return (
            <div
              key={m._id}
              style={{
                ...s.mobileCard,
                opacity: isCancelado ? 0.6 : 1,
                borderLeft: `4px solid ${
                  isCancelado ? '#737373' : isEntrada ? '#22c55e' : '#ef4444'
                }`,
              }}
            >
              <div style={s.mCardTop}>
                <div>
                  <span
                    style={{
                      ...s.badge,
                      background: isEntrada ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)',
                      color: isEntrada ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {isEntrada ? 'Entrada' : 'Saída'}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    {fmtDate(m.data)}
                  </span>
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 16,
                    color: isCancelado
                      ? 'var(--text-muted)'
                      : isEntrada
                      ? 'var(--success)'
                      : 'var(--danger)',
                  }}
                >
                  {isEntrada ? '+' : '-'} {fmtMoney(m.valor)}
                </div>
              </div>

              <div style={s.mCardTitle}>{m.descricao}</div>

              {m.compraId && (
                <div style={{ ...s.tagLinked, marginBottom: 6 }}>
                  Compra: {m.compraId.produto || 'Item'}
                </div>
              )}

              <div style={s.mCardMeta}>
                <div>
                  <span style={s.mLabel}>Categoria: </span>
                  <span style={s.mVal}>{m.categoria}</span>
                </div>
                <div>
                  <span style={s.mLabel}>Responsável: </span>
                  <span style={s.mVal}>{m.responsavel}</span>
                </div>
                <div>
                  <span style={s.mLabel}>Pagamento: </span>
                  <span style={s.mVal}>{m.formaPagamento}</span>
                </div>
                {isCancelado && (
                  <div>
                    <span style={s.mLabel}>Motivo Cancelamento: </span>
                    <span style={{ ...s.mVal, color: '#ef4444' }}>
                      {m.justificativaCancelamento || 'Não informado'}
                    </span>
                  </div>
                )}
              </div>

              <div style={s.mCardActions}>
                <button
                  style={s.btnIconOutline}
                  onClick={() => setSelectedMovement(m)}
                >
                  Histórico & Detalhes
                </button>
                {isAdmin && !isCancelado && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={s.editBtn} onClick={() => onEdit(m)}>
                      Editar
                    </button>
                    <button style={s.delBtn} onClick={() => onCancel(m)}>
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Detalhes e Auditoria de Movimentação */}
      {selectedMovement && (
        <div style={s.overlay} onClick={() => setSelectedMovement(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Detalhes e Rastreabilidade da Movimentação</h3>
              <button style={s.closeBtn} onClick={() => setSelectedMovement(null)}>
                &times;
              </button>
            </div>
            <div style={s.modalBody}>
              <div style={s.detailGrid}>
                <div>
                  <span style={s.dLabel}>Descrição:</span>
                  <span style={s.dVal}>{selectedMovement.descricao}</span>
                </div>
                <div>
                  <span style={s.dLabel}>Tipo:</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: selectedMovement.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)',
                    }}
                  >
                    {selectedMovement.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                  </span>
                </div>
                <div>
                  <span style={s.dLabel}>Valor:</span>
                  <span style={{ ...s.dVal, fontWeight: 700, fontSize: 16 }}>
                    {fmtMoney(selectedMovement.valor)}
                  </span>
                </div>
                <div>
                  <span style={s.dLabel}>Data do Registro:</span>
                  <span style={s.dVal}>{fmtDate(selectedMovement.data)}</span>
                </div>
                <div>
                  <span style={s.dLabel}>Categoria:</span>
                  <span style={s.dVal}>{selectedMovement.categoria}</span>
                </div>
                <div>
                  <span style={s.dLabel}>Forma de Pagamento:</span>
                  <span style={s.dVal}>{selectedMovement.formaPagamento}</span>
                </div>
                <div>
                  <span style={s.dLabel}>Responsável:</span>
                  <span style={s.dVal}>{selectedMovement.responsavel}</span>
                </div>
                <div>
                  <span style={s.dLabel}>Cadastrado Por:</span>
                  <span style={s.dVal}>{selectedMovement.criadoPor || '—'}</span>
                </div>
                <div>
                  <span style={s.dLabel}>Última Atualização Por:</span>
                  <span style={s.dVal}>{selectedMovement.atualizadoPor || '—'}</span>
                </div>
                <div>
                  <span style={s.dLabel}>Status:</span>
                  <span style={{ ...s.dVal, color: selectedMovement.status === 'cancelado' ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                    {selectedMovement.status?.toUpperCase()}
                  </span>
                </div>
              </div>

              {selectedMovement.comprovanteUrl && (
                <div style={{ marginTop: 12 }}>
                  <span style={s.dLabel}>Link / Comprovante:</span>
                  <div>
                    <a
                      href={selectedMovement.comprovanteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={s.link}
                    >
                      Abrir comprovante &rarr;
                    </a>
                  </div>
                </div>
              )}

              {selectedMovement.status === 'cancelado' && (
                <div style={s.cancelBox}>
                  <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
                    Movimentação Cancelada
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>
                    <strong>Motivo:</strong> {selectedMovement.justificativaCancelamento}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Cancelado por {selectedMovement.canceladoPor} em {fmtDate(selectedMovement.canceladoEm)}
                  </div>
                </div>
              )}

              {/* Linha do Tempo / Histórico de Auditoria */}
              <div style={{ marginTop: 20 }}>
                <h4 style={s.historyTitle}>Histórico de Auditoria e Alterações</h4>
                {selectedMovement.historico && selectedMovement.historico.length > 0 ? (
                  <div style={s.timeline}>
                    {selectedMovement.historico.map((h, idx) => (
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
                            Por: <strong>{h.autor}</strong>
                          </div>
                          {h.detalhes && <div style={s.timelineDetails}>{h.detalhes}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                    Nenhum histórico detalhado registrado.
                  </div>
                )}
              </div>
            </div>
            <div style={s.modalFooter}>
              <button style={s.btnOutline} onClick={() => setSelectedMovement(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const s = {
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
  descMain: {
    fontWeight: 600,
    color: 'var(--text)',
    fontSize: 13,
    marginBottom: 2,
  },
  descSub: {
    fontSize: 11,
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 240,
  },
  tagLinked: {
    display: 'inline-block',
    fontSize: 11,
    color: '#38bdf8',
    background: 'rgba(56,189,248,0.12)',
    padding: '2px 6px',
    borderRadius: 4,
    marginTop: 2,
  },
  catPill: {
    background: 'var(--bg-card2, #1f1f1f)',
    border: '1px solid var(--border)',
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: 12,
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  badgePay: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  respText: {
    fontSize: 13,
    color: 'var(--text)',
    fontWeight: 500,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 8px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  badgeDot: { width: 6, height: 6, borderRadius: '50%' },
  actions: { display: 'flex', gap: 6, justifyContent: 'center' },
  btnIcon: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 12,
    cursor: 'pointer',
    color: 'var(--text)',
  },
  btnIconOutline: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 12,
    cursor: 'pointer',
    color: 'var(--text-muted)',
  },
  editBtn: {
    background: 'transparent',
    color: '#38bdf8',
    border: '1px solid #38bdf8',
    padding: '4px 8px',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
  },
  delBtn: {
    background: 'transparent',
    color: 'var(--danger, #ef4444)',
    border: '1px solid var(--danger, #ef4444)',
    padding: '4px 8px',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
  },
  mobileCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '14px 16px',
    marginBottom: 10,
  },
  mCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mCardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: 6,
  },
  mCardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 12,
    marginBottom: 12,
  },
  mLabel: { color: 'var(--text-muted)' },
  mVal: { color: 'var(--text)', fontWeight: 500 },
  mCardActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTop: '1px solid var(--border)',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid var(--border)',
    borderTop: '3px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  empty: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '50px 20px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
  },
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
    maxWidth: 620,
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: 'var(--shadow)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
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
  modalBody: { padding: '20px' },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '14px 20px',
    borderTop: '1px solid var(--border)',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
  },
  dLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dVal: { fontSize: 13, color: 'var(--text)' },
  link: { color: '#38bdf8', textDecoration: 'none', fontSize: 13 },
  cancelBox: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8,
    padding: '12px 14px',
    marginTop: 14,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: 10,
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
    background: 'var(--bg-card2, #1f1f1f)',
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
  btnOutline: {
    background: 'transparent',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    padding: '8px 16px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    cursor: 'pointer',
  },
};

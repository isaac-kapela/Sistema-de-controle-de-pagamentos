import React, { useState } from 'react';
import toast from 'react-hot-toast';

const fmt = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PayPurchaseModal({
  purchase,
  formasPagamento = ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto'],
  responsaveis = [],
  currentUser = '',
  onClose,
  onSubmit,
}) {
  const valorTotal = Number(purchase?.valorTotal || 0);
  const valorPagoAtual = Number(purchase?.valorPago || 0);
  const valorRestante = Math.max(0, valorTotal - valorPagoAtual);

  const [novoValorPago, setNovoValorPago] = useState(valorTotal.toString());
  const [formaPagamento, setFormaPagamento] = useState(purchase?.formaPagamento || 'Pix');
  const [responsavel, setResponsavel] = useState(currentUser || purchase?.comprador || '');
  const [observacoes, setObservacoes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const numNovoValorPago = Number(novoValorPago);
  const isValidNum = novoValorPago !== '' && !isNaN(numNovoValorPago) && numNovoValorPago >= 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidNum) {
      toast.error('Informe um valor de pagamento válido.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(purchase._id, {
        valorPago: numNovoValorPago,
        formaPagamento,
        responsavel,
        observacoes,
        autor: currentUser || responsavel,
      });
      toast.success('Pagamento registrado e saldo de caixa atualizado.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao registrar pagamento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <div>
            <h3 style={s.title}>Registrar Pagamento de Compra</h3>
            <p style={s.subtitle}>
              O valor pago será debitado do saldo de caixa automaticamente.
            </p>
          </div>
          <button style={s.closeBtn} onClick={onClose} type="button">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.purchaseInfo}>
            <div style={s.infoRow}>
              <span style={s.infoLabel}>Produto:</span>
              <strong style={s.infoVal}>{purchase.produto}</strong>
            </div>
            <div style={s.infoRow}>
              <span style={s.infoLabel}>Fornecedor:</span>
              <span style={s.infoVal}>{purchase.fornecedor || 'Não informado'}</span>
            </div>
            <div style={s.infoRow}>
              <span style={s.infoLabel}>Valor Total:</span>
              <span style={s.infoVal}>{fmt(valorTotal)}</span>
            </div>
            <div style={s.infoRow}>
              <span style={s.infoLabel}>Valor já pago:</span>
              <span style={{ ...s.infoVal, color: valorPagoAtual > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                {fmt(valorPagoAtual)}
              </span>
            </div>
            <div style={s.infoRow}>
              <span style={s.infoLabel}>Restante a pagar:</span>
              <span style={{ ...s.infoVal, color: valorRestante > 0 ? '#eab308' : 'var(--success)' }}>
                {fmt(valorRestante)}
              </span>
            </div>
          </div>

          <div style={s.field}>
            <div style={s.labelRow}>
              <label style={s.label}>Valor Pago Acumulado (R$) *</label>
              <button
                type="button"
                style={s.btnQuickFill}
                onClick={() => setNovoValorPago(valorTotal.toString())}
              >
                Quitar Total ({fmt(valorTotal)})
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              max={valorTotal * 2}
              value={novoValorPago}
              onChange={(e) => setNovoValorPago(e.target.value)}
              style={s.inputHighlight}
              required
              autoFocus
            />
            <span style={s.helpText}>
              Status resultante:{' '}
              <strong>
                {numNovoValorPago >= valorTotal && valorTotal > 0
                  ? 'Pago Integralmente'
                  : numNovoValorPago > 0
                  ? 'Parcialmente Pago'
                  : 'Pendente'}
              </strong>
            </span>
          </div>

          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Forma de Pagamento *</label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                style={s.input}
                required
              >
                {formasPagamento.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div style={s.field}>
              <label style={s.label}>Responsável pelo Pagamento *</label>
              <input
                type="text"
                list="pay-resp-list"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                style={s.input}
                required
              />
              <datalist id="pay-resp-list">
                {responsaveis.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Observações do Pagamento</label>
            <input
              type="text"
              placeholder="Ex: Pago via Pix pelo diretor financeiro"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              style={s.input}
            />
          </div>

          <div style={s.footer}>
            <button type="button" style={s.btnCancel} onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" style={s.btnSubmit} disabled={submitting || !isValidNum}>
              {submitting ? 'Gravando...' : 'Confirmar e Debitar do Caixa'}
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1050,
    padding: 16,
  },
  modal: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    width: '100%',
    maxWidth: 500,
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text)',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 22,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 0,
  },
  form: {
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  purchaseInfo: {
    background: 'var(--bg-card-alt)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    color: 'var(--text-muted)',
    fontSize: 12,
  },
  infoVal: {
    color: 'var(--text)',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  btnQuickFill: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  helpText: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  input: {
    padding: '9px 12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontSize: 13,
  },
  inputHighlight: {
    padding: '9px 12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--primary)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontSize: 15,
    fontWeight: 700,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
    borderTop: '1px solid var(--border)',
    paddingTop: 14,
  },
  btnCancel: {
    padding: '9px 16px',
    background: 'var(--bg-card-alt)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontSize: 13,
    cursor: 'pointer',
  },
  btnSubmit: {
    padding: '9px 18px',
    background: 'var(--primary)',
    border: 'none',
    borderRadius: 'var(--radius)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
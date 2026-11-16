import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function ConfirmDeliveryModal({
  purchase,
  meta,
  onClose,
  onConfirm,
}) {
  const [recebidoPor, setRecebidoPor] = useState(purchase?.comprador || '');
  const [dataEntrega, setDataEntrega] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [observacoesEntrega, setObservacoesEntrega] = useState(
    purchase?.observacoesEntrega || ''
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recebidoPor.trim()) {
      toast.error('Informe a pessoa que recebeu o material.');
      return;
    }

    setSaving(true);
    try {
      await onConfirm(purchase._id, {
        statusEntrega: 'entregue',
        recebidoPor: recebidoPor.trim(),
        dataEntrega,
        observacoesEntrega: observacoesEntrega.trim(),
        autor: recebidoPor.trim(),
      });
      toast.success('Entrega confirmada com sucesso!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao confirmar entrega.');
    } finally {
      setSaving(false);
    }
  };

  const responsaveisList = meta?.responsaveis || [];

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Confirmar Recebimento de Material</h3>
          <button style={s.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={s.modalBody}>
          <div style={s.infoBox}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
              {purchase?.quantidade}x {purchase?.produto}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Comprado por: {purchase?.comprador} | Fornecedor: {purchase?.fornecedor || '—'}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Pessoa que confirmou o recebimento *</label>
            <input
              list="conf-resp-list"
              style={s.input}
              placeholder="Nome do membro que recebeu"
              value={recebidoPor}
              onChange={(e) => setRecebidoPor(e.target.value)}
              required
            />
            <datalist id="conf-resp-list">
              {responsaveisList.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>

          <div style={s.field}>
            <label style={s.label}>Data do Recebimento *</label>
            <input
              type="date"
              style={s.input}
              value={dataEntrega}
              onChange={(e) => setDataEntrega(e.target.value)}
              required
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Observações sobre a chegada / integridade do material</label>
            <input
              style={s.input}
              placeholder="Ex.: Chegou em perfeito estado, testado e guardado na bancada..."
              value={observacoesEntrega}
              onChange={(e) => setObservacoesEntrega(e.target.value)}
            />
          </div>

          <div style={s.modalFooter}>
            <button type="button" style={s.btnCancel} onClick={onClose} disabled={saving}>
              Voltar
            </button>
            <button type="submit" style={s.btnSubmit} disabled={saving}>
              {saving ? 'Confirmando...' : 'Confirmar Entrega'}
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
    maxWidth: 480,
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
  modalBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  infoBox: {
    background: 'var(--bg-card2, #1f1f1f)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '12px 14px',
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
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
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
    background: '#22c55e',
    color: '#fff',
    border: 'none',
    padding: '8px 18px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
};

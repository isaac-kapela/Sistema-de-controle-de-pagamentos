import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function CancelConfirmModal({
  item,
  type = 'movimentacao', // 'movimentacao' | 'compra'
  meta,
  onClose,
  onConfirm,
}) {
  const [justificativa, setJustificativa] = useState('');
  const [autor, setAutor] = useState('');
  const [cancelarSaidaVinculada, setCancelarSaidaVinculada] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!justificativa.trim()) {
      toast.error('Informe a justificativa do cancelamento.');
      return;
    }
    if (!autor.trim()) {
      toast.error('Informe o nome do responsável pelo cancelamento.');
      return;
    }

    setSaving(true);
    try {
      await onConfirm(item._id, {
        justificativa: justificativa.trim(),
        autor: autor.trim(),
        cancelarSaidaVinculada: Boolean(cancelarSaidaVinculada),
      });
      toast.success(
        `${type === 'compra' ? 'Compra' : 'Movimentação'} cancelada com sucesso!`
      );
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao cancelar registro.');
    } finally {
      setSaving(false);
    }
  };

  const responsaveisList = meta?.responsaveis || [];

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>
            Cancelar {type === 'compra' ? 'Compra' : 'Movimentação'}
          </h3>
          <button style={s.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={s.modalBody}>
          <div style={s.warningBox}>
            <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
              Exclusão Lógica e Rastreabilidade
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>
              O registro não será excluído fisicamente do banco de dados para manter a integridade dos relatórios e da auditoria financeira. Ele será marcado como <strong>Cancelado</strong> com o motivo e o responsável informados abaixo.
            </div>
          </div>

          <div style={s.itemInfo}>
            <span style={s.label}>Item a ser cancelado:</span>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
              {type === 'compra'
                ? `${item?.quantidade}x ${item?.produto} (R$ ${item?.valorTotal})`
                : `${item?.descricao} (R$ ${item?.valor})`}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Responsável pelo cancelamento *</label>
            <input
              list="cancel-resp-list"
              style={s.input}
              placeholder="Seu nome"
              value={autor}
              onChange={(e) => setAutor(e.target.value)}
              required
            />
            <datalist id="cancel-resp-list">
              {responsaveisList.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>

          <div style={s.field}>
            <label style={s.label}>Justificativa / Motivo do cancelamento *</label>
            <textarea
              style={{ ...s.input, minHeight: 80 }}
              placeholder="Explique o motivo do cancelamento (ex.: compra estornada, erro de digitação, item devolvido ao fornecedor)..."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              required
            />
          </div>

          {type === 'compra' && item?.movimentacaoId && (
            <div style={s.checkRow}>
              <input
                type="checkbox"
                id="cancelarSaidaVinculada"
                checked={cancelarSaidaVinculada}
                onChange={(e) => setCancelarSaidaVinculada(e.target.checked)}
                style={{ cursor: 'pointer', width: 16, height: 16 }}
              />
              <label
                htmlFor="cancelarSaidaVinculada"
                style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}
              >
                Também cancelar a movimentação de saída vinculada no Caixa
              </label>
            </div>
          )}

          <div style={s.modalFooter}>
            <button type="button" style={s.btnBack} onClick={onClose} disabled={saving}>
              Voltar
            </button>
            <button type="submit" style={s.btnDanger} disabled={saving}>
              {saving ? 'Cancelando...' : 'Confirmar Cancelamento'}
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
    maxWidth: 520,
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
  warningBox: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8,
    padding: '12px 14px',
  },
  itemInfo: {
    background: 'var(--bg-card2, #1f1f1f)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 14px',
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
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
    paddingTop: 14,
    borderTop: '1px solid var(--border)',
  },
  btnBack: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    padding: '8px 16px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    cursor: 'pointer',
  },
  btnDanger: {
    background: 'var(--danger, #ef4444)',
    color: '#fff',
    border: 'none',
    padding: '8px 18px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
};

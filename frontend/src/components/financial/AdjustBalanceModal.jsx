import React, { useState } from 'react';
import toast from 'react-hot-toast';

const fmt = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AdjustBalanceModal({
  currentBalance = 0,
  responsaveis = [],
  currentUser = '',
  onClose,
  onSubmit,
}) {
  const [novoSaldo, setNovoSaldo] = useState('');
  const [dataAjuste, setDataAjuste] = useState(new Date().toISOString().split('T')[0]);
  const [responsavel, setResponsavel] = useState(currentUser || (responsaveis[0] || ''));
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const numNovoSaldo = Number(novoSaldo);
  const isValidNum = novoSaldo !== '' && !isNaN(numNovoSaldo);
  const diferenca = isValidNum ? +(numNovoSaldo - currentBalance).toFixed(2) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidNum) {
      toast.error('Informe um valor válido para o novo saldo.');
      return;
    }

    if (!responsavel) {
      toast.error('Selecione ou informe o responsável pelo ajuste.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        novoSaldo: numNovoSaldo,
        data: dataAjuste,
        responsavel,
        motivo: motivo.trim() || 'Ajuste de conferência/saldo de caixa',
        autor: currentUser || responsavel,
      });
      toast.success('Saldo do caixa atualizado com sucesso.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar saldo do caixa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <div>
            <h3 style={s.title}>Atualizar Valor do Caixa</h3>
            <p style={s.subtitle}>
              Defina o saldo real disponível em caixa. O sistema registrará a diferença no histórico financeiro.
            </p>
          </div>
          <button style={s.closeBtn} onClick={onClose} type="button">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          {/* Card com comparação do saldo */}
          <div style={s.balanceComparison}>
            <div style={s.compCol}>
              <span style={s.compLabel}>Saldo Atual Registrado</span>
              <span style={{ ...s.compValue, color: currentBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {fmt(currentBalance)}
              </span>
            </div>

            <div style={s.arrowCol}>&rarr;</div>

            <div style={s.compCol}>
              <span style={s.compLabel}>Novo Saldo Desejado</span>
              <span style={{ ...s.compValue, color: isValidNum ? (numNovoSaldo >= 0 ? '#38bdf8' : 'var(--danger)') : 'var(--text-muted)' }}>
                {isValidNum ? fmt(numNovoSaldo) : 'R$ 0,00'}
              </span>
            </div>
          </div>

          {isValidNum && (
            <div style={{
              ...s.diffBadge,
              background: diferenca >= 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              borderColor: diferenca >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
              color: diferenca >= 0 ? 'var(--success)' : 'var(--danger)',
            }}>
              <span>
                {diferenca >= 0 ? 'Acréscimo no caixa:' : 'Redução no caixa:'}{' '}
                <strong>{fmt(Math.abs(diferenca))}</strong> ({diferenca >= 0 ? '+ Entrada' : '- Saída'} de ajuste)
              </span>
            </div>
          )}

          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Novo Saldo em Caixa (R$) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 5000.00"
                value={novoSaldo}
                onChange={(e) => setNovoSaldo(e.target.value)}
                style={s.inputHighlight}
                required
                autoFocus
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Data do Ajuste *</label>
              <input
                type="date"
                value={dataAjuste}
                onChange={(e) => setDataAjuste(e.target.value)}
                style={s.input}
                required
              />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Responsável pelo Ajuste *</label>
            <input
              type="text"
              list="adjust-resp-list"
              placeholder="Nome do responsável"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              style={s.input}
              required
            />
            <datalist id="adjust-resp-list">
              {responsaveis.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>

          <div style={s.field}>
            <label style={s.label}>Motivo / Justificativa do Ajuste</label>
            <input
              type="text"
              placeholder="Ex: Saldo inicial da equipe, conferência bancária, contagem física..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              style={s.input}
            />
          </div>

          <div style={s.footer}>
            <button type="button" style={s.btnCancel} onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" style={s.btnSubmit} disabled={submitting || !isValidNum}>
              {submitting ? 'Atualizando...' : 'Confirmar Atualização de Saldo'}
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
    maxWidth: 520,
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
  },
  header: {
    padding: '18px 20px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--text)',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 12,
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 22,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  form: {
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  balanceComparison: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    background: 'var(--bg-card-alt)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '14px 16px',
    gap: 12,
  },
  compCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  arrowCol: {
    fontSize: 18,
    color: 'var(--text-muted)',
    fontWeight: 700,
  },
  compLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  compValue: {
    fontSize: 16,
    fontWeight: 800,
  },
  diffBadge: {
    padding: '10px 14px',
    borderRadius: 'var(--radius)',
    border: '1px solid',
    fontSize: 13,
    textAlign: 'center',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
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
    padding: '10px 12px',
    background: 'var(--bg-input)',
    border: '1px solid #38bdf8',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontSize: 15,
    fontWeight: 700,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
    borderTop: '1px solid var(--border)',
    paddingTop: 16,
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
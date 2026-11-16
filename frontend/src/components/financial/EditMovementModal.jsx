import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function EditMovementModal({
  movement,
  meta,
  onClose,
  onUpdate,
}) {
  const [descricao, setDescricao] = useState(movement.descricao || '');
  const [tipo, setTipo] = useState(movement.tipo || 'saida');
  const [categoria, setCategoria] = useState(movement.categoria || '');
  const [valor, setValor] = useState(movement.valor ? movement.valor.toString() : '');
  const [data, setData] = useState(
    movement.data ? new Date(movement.data).toISOString().slice(0, 10) : ''
  );
  const [formaPagamento, setFormaPagamento] = useState(movement.formaPagamento || 'Pix');
  const [responsavel, setResponsavel] = useState(movement.responsavel || '');
  const [observacoes, setObservacoes] = useState(movement.observacoes || '');
  const [comprovanteUrl, setComprovanteUrl] = useState(movement.comprovanteUrl || '');
  const [autor, setAutor] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!descricao.trim()) {
      toast.error('Informe a descrição.');
      return;
    }
    if (!valor || parseFloat(valor) <= 0) {
      toast.error('Informe um valor válido maior que zero.');
      return;
    }
    if (!responsavel.trim()) {
      toast.error('Informe o responsável pela movimentação.');
      return;
    }

    setSaving(true);
    try {
      await onUpdate(movement._id, {
        descricao: descricao.trim(),
        tipo,
        categoria,
        valor: parseFloat(valor),
        data,
        formaPagamento,
        responsavel: responsavel.trim(),
        observacoes: observacoes.trim(),
        comprovanteUrl: comprovanteUrl.trim(),
        autor: autor.trim() || responsavel.trim() || 'Admin',
      });
      toast.success('Movimentação atualizada com sucesso!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar movimentação.');
    } finally {
      setSaving(false);
    }
  };

  const responsaveisList = meta?.responsaveis || [];
  const categoriasList = tipo === 'entrada' ? meta?.categoriasEntrada || [] : meta?.categoriasSaida || [];

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Editar Movimentação Financeira</h3>
          <button style={s.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={s.modalBody}>
          <div style={s.field}>
            <label style={s.label}>Descrição *</label>
            <input
              style={s.input}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
            />
          </div>

          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Tipo de Movimentação</label>
              <select
                style={s.input}
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="entrada">Entrada (+)</option>
                <option value="saida">Saída (-)</option>
              </select>
            </div>

            <div style={s.field}>
              <label style={s.label}>Categoria *</label>
              <select
                style={s.input}
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                {categoriasList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                style={s.input}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Data *</label>
              <input
                type="date"
                style={s.input}
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Forma de Pagamento</label>
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

            <div style={s.field}>
              <label style={s.label}>Responsável *</label>
              <input
                list="edit-resp-list"
                style={s.input}
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                required
              />
              <datalist id="edit-resp-list">
                {responsaveisList.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Link do Comprovante</label>
            <input
              type="url"
              style={s.input}
              placeholder="https://..."
              value={comprovanteUrl}
              onChange={(e) => setComprovanteUrl(e.target.value)}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Observações</label>
            <textarea
              style={{ ...s.input, minHeight: 60 }}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <div style={{ ...s.field, background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
            <label style={s.label}>Quem está realizando esta alteração? (Rastreabilidade)</label>
            <input
              list="edit-resp-list"
              style={s.input}
              placeholder="Seu nome"
              value={autor}
              onChange={(e) => setAutor(e.target.value)}
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
    maxWidth: 600,
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
  modalBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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

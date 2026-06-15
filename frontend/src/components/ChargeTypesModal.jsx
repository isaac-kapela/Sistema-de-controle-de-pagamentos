import { useState } from 'react';
import toast from 'react-hot-toast';
import { createChargeType, updateChargeType, deleteChargeType } from '../services/api';

const APPLICABLE_LABELS = { all: 'Todos', drivers: 'Só Motoristas', 'non-drivers': 'Só Não-Motoristas' };

const emptyForm = { name: '', value: '', applicableTo: 'all', active: true };

export default function ChargeTypesModal({ chargeTypes, onClose, onSaved }) {
  const [editing, setEditing] = useState(null); // _id | 'new' | null
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const startNew = () => { setEditing('new'); setForm(emptyForm); };
  const startEdit = (ct) => { setEditing(ct._id); setForm({ name: ct.name, value: String(ct.value), applicableTo: ct.applicableTo, active: ct.active }); };
  const cancel = () => { setEditing(null); setForm(emptyForm); };

  const handleSave = async () => {
    if (!form.name || !form.value) { toast.error('Preencha nome e valor'); return; }
    setLoading(true);
    try {
      const payload = { name: form.name, value: parseFloat(form.value), applicableTo: form.applicableTo, active: form.active };
      if (editing === 'new') {
        await createChargeType(payload);
        toast.success('Cobrança criada');
      } else {
        await updateChargeType(editing, payload);
        toast.success('Cobrança atualizada');
      }
      cancel();
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ct) => {
    if (!window.confirm(`Remover cobrança "${ct.name}"? Pagamentos já gerados não serão afetados.`)) return;
    try {
      await deleteChargeType(ct._id);
      toast.success('Cobrança removida');
      onSaved();
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const handleToggleActive = async (ct) => {
    try {
      await updateChargeType(ct._id, { active: !ct.active });
      toast.success(ct.active ? 'Cobrança desativada' : 'Cobrança ativada');
      onSaved();
    } catch {
      toast.error('Erro ao atualizar');
    }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>Tipos de Cobrança</h3>
          <button onClick={onClose} style={s.closeBtn}>×</button>
        </div>

        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {chargeTypes.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Nenhuma cobrança cadastrada.</p>
          )}
          {chargeTypes.map((ct) => (
            <div key={ct._id} style={{ ...s.item, opacity: ct.active ? 1 : 0.5 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{ct.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>
                  R$ {ct.value.toFixed(2).replace('.', ',')} · {APPLICABLE_LABELS[ct.applicableTo]}
                </span>
                {!ct.active && <span style={s.inactiveBadge}>Inativa</span>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => handleToggleActive(ct)} style={s.btnSm(ct.active ? 'warning' : 'success')}>
                  {ct.active ? 'Desativar' : 'Ativar'}
                </button>
                <button onClick={() => startEdit(ct)} style={s.btnSm('secondary')}>Editar</button>
                <button onClick={() => handleDelete(ct)} style={s.btnSm('danger')}>✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* Formulário inline */}
        {editing ? (
          <div style={s.form}>
            <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: 14 }}>
              {editing === 'new' ? 'Nova cobrança' : 'Editar cobrança'}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                placeholder="Nome (ex: Gasolina)"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ ...s.input, flex: 2, minWidth: 120 }}
              />
              <input
                placeholder="Valor (ex: 5.00)"
                type="number"
                step="0.01"
                min="0"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                style={{ ...s.input, flex: 1, minWidth: 80 }}
              />
              <select
                value={form.applicableTo}
                onChange={e => setForm(f => ({ ...f, applicableTo: e.target.value }))}
                style={{ ...s.input, flex: 2, minWidth: 140 }}
              >
                <option value="all">Todos</option>
                <option value="drivers">Só Motoristas</option>
                <option value="non-drivers">Só Não-Motoristas</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
              <button onClick={cancel} style={s.btnSm('secondary')}>Cancelar</button>
              <button onClick={handleSave} disabled={loading} style={s.btnSm('primary')}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={startNew} style={s.addBtn}>+ Nova cobrança</button>
        )}

        <p style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Cobranças ativas são aplicadas nos novos pagamentos gerados. Pagamentos já existentes não são alterados retroativamente.
        </p>
      </div>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 },
  modal: { background: '#1a1a1a', borderRadius: 14, padding: '24px 20px', width: '100%', maxWidth: 560, border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 22, lineHeight: 1 },
  item: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-card2)', borderRadius: 8, border: '1px solid var(--border)' },
  inactiveBadge: { display: 'inline-block', marginLeft: 8, fontSize: 10, padding: '1px 6px', borderRadius: 99, background: '#3f3f3f', color: '#9ca3af', border: '1px solid #4a4a4a' },
  form: { background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 12px' },
  input: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: '#111', color: 'var(--text)', fontSize: 13 },
  addBtn: { width: '100%', padding: '9px', borderRadius: 8, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' },
  btnSm: (v) => ({
    padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    background: v === 'primary' ? 'var(--primary)' : v === 'danger' ? '#dc2626' : v === 'warning' ? '#d97706' : v === 'success' ? '#16a34a' : '#3a3a3a',
    color: '#fff',
  }),
};

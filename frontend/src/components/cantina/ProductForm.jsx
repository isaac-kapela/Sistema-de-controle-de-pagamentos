import { useState } from 'react';
import { createCantinaProduct, updateCantinaProduct } from '../../services/api';
import toast from 'react-hot-toast';

export default function ProductForm({ product, onSaved, onClose }) {
  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(product?.price?.toString().replace('.', ',') || '');
  const [category, setCategory] = useState(product?.category || 'Geral');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedPrice = parseFloat(price.replace(',', '.'));
    if (!name.trim() || isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error('Preencha nome e preço válido');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), price: parsedPrice, category: category.trim() || 'Geral' };
      if (product) {
        await updateCantinaProduct(product._id, payload);
        toast.success('Produto atualizado');
      } else {
        await createCantinaProduct(payload);
        toast.success('Produto criado');
      }
      onSaved();
    } catch {
      toast.error('Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {product ? 'Editar Produto' : 'Novo Produto'}
          </h3>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Nome</label>
            <input
              style={inputStyle}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Café, Salgado..."
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Preço (R$)</label>
            <input
              style={inputStyle}
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="Ex: 3,50"
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Categoria</label>
            <input
              style={inputStyle}
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Ex: Bebidas, Lanches..."
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" onClick={onClose} style={btnCancel}>Cancelar</button>
            <button type="submit" disabled={saving} style={btnSave}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modal = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 12, padding: 28, width: '100%', maxWidth: 400,
};
const fieldStyle = { marginBottom: 16 };
const labelStyle = { display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-muted)' };
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: '#1a1a1a',
  color: 'var(--text)', fontSize: 14, boxSizing: 'border-box',
};
const closeBtn = {
  background: 'transparent', border: 'none', fontSize: 20,
  cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1,
};
const btnCancel = {
  background: 'transparent', border: '1px solid var(--border)',
  borderRadius: 8, padding: '10px 20px', cursor: 'pointer',
  color: 'var(--text)', fontSize: 14,
};
const btnSave = {
  background: 'var(--primary)', border: 'none',
  borderRadius: 8, padding: '10px 24px', cursor: 'pointer',
  color: '#fff', fontSize: 14, fontWeight: 700,
};

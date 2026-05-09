import { useState } from 'react';
import { createCantinaOrder } from '../../services/api';
import toast from 'react-hot-toast';

export default function NewSale({ products, onSaved }) {
  const [quantities, setQuantities] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedItems = products
    .filter(p => (quantities[p._id] || 0) > 0)
    .map(p => ({ productId: p._id, name: p.name, price: p.price, quantity: quantities[p._id] }));

  const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const setQty = (id, value) => {
    const qty = Math.max(0, parseInt(value) || 0);
    setQuantities(prev => ({ ...prev, [id]: qty }));
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) { toast.error('Selecione ao menos um produto'); return; }
    if (!paymentMethod) { toast.error('Selecione a forma de pagamento'); return; }
    setSaving(true);
    try {
      await createCantinaOrder({ items: selectedItems, paymentMethod, buyerName: buyerName.trim() });
      toast.success('Compra registrada!');
      setQuantities({});
      setBuyerName('');
      setPaymentMethod('');
      onSaved?.();
    } catch {
      toast.error('Erro ao registrar compra');
    } finally {
      setSaving(false);
    }
  };

  if (products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
        Nenhum produto disponível. Peça ao admin para cadastrar produtos.
      </div>
    );
  }

  const categories = [...new Set(products.map(p => p.category || 'Geral'))];

  return (
    <div style={{ maxWidth: 620 }}>
      <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Registrar minha compra</h3>

      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', fontWeight: 600 }}>
            {cat}
          </p>
          {products.filter(p => (p.category || 'Geral') === cat).map(product => (
            <div key={product._id} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</span>
                <span style={{ marginLeft: 10, color: 'var(--primary)', fontWeight: 700, fontSize: 15 }}>
                  R$ {product.price.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div style={qtyControl}>
                <button
                  onClick={() => setQty(product._id, (quantities[product._id] || 0) - 1)}
                  style={qtyBtn}
                >−</button>
                <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>
                  {quantities[product._id] || 0}
                </span>
                <button
                  onClick={() => setQty(product._id, (quantities[product._id] || 0) + 1)}
                  style={qtyBtn}
                >+</button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Resumo + confirmação */}
      <div style={summaryBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
          <span style={{ fontWeight: 800, fontSize: 24, color: 'var(--primary)' }}>
            R$ {total.toFixed(2).replace('.', ',')}
          </span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Seu nome (opcional)</label>
          <input
            style={inputStyle}
            value={buyerName}
            onChange={e => setBuyerName(e.target.value)}
            placeholder="Seu nome"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Forma de pagamento</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setPaymentMethod('pix')}
              style={{
                ...payBtn,
                borderColor: paymentMethod === 'pix' ? '#22c55e' : 'var(--border)',
                color: paymentMethod === 'pix' ? '#22c55e' : 'var(--text)',
                background: paymentMethod === 'pix' ? '#22c55e18' : 'transparent',
              }}
            >
              PIX
            </button>
            <button
              onClick={() => setPaymentMethod('dinheiro')}
              style={{
                ...payBtn,
                borderColor: paymentMethod === 'dinheiro' ? '#f59e0b' : 'var(--border)',
                color: paymentMethod === 'dinheiro' ? '#f59e0b' : 'var(--text)',
                background: paymentMethod === 'dinheiro' ? '#f59e0b18' : 'transparent',
              }}
            >
              Dinheiro
            </button>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || selectedItems.length === 0 || !paymentMethod}
          style={{
            ...btnConfirm,
            opacity: (saving || selectedItems.length === 0 || !paymentMethod) ? 0.5 : 1,
            cursor: (saving || selectedItems.length === 0 || !paymentMethod) ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Registrando...' : 'Registrar Minha Compra'}
        </button>
      </div>
    </div>
  );
}

const rowStyle = {
  display: 'flex', alignItems: 'center', padding: '10px 14px',
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 8, marginBottom: 8,
};
const qtyControl = { display: 'flex', alignItems: 'center', gap: 12 };
const qtyBtn = {
  width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)',
  background: 'transparent', cursor: 'pointer', fontSize: 18,
  color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  lineHeight: 1,
};
const summaryBox = {
  marginTop: 24, padding: 20,
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
};
const labelStyle = { display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' };
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: '#1a1a1a',
  color: 'var(--text)', fontSize: 14, boxSizing: 'border-box',
};
const payBtn = {
  flex: 1, padding: '12px 0', borderRadius: 8,
  border: '2px solid', background: 'transparent',
  cursor: 'pointer', fontWeight: 700, fontSize: 15,
  transition: 'all 0.15s',
};
const btnConfirm = {
  width: '100%', padding: '14px 0', background: 'var(--primary)',
  color: '#fff', border: 'none', borderRadius: 8,
  fontWeight: 700, fontSize: 16,
};

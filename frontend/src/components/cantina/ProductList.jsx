import { useState } from 'react';
import { deleteCantinaProduct } from '../../services/api';
import ProductForm from './ProductForm';
import toast from 'react-hot-toast';

export default function ProductList({ products, isAdmin, onRefresh }) {
  const [editProduct, setEditProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const handleDelete = async (product) => {
    if (!confirm(`Excluir "${product.name}"?`)) return;
    try {
      await deleteCantinaProduct(product._id);
      toast.success('Produto excluído');
      onRefresh();
    } catch {
      toast.error('Erro ao excluir produto');
    }
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditProduct(null);
    onRefresh();
  };

  const categories = [...new Set(products.map(p => p.category || 'Geral'))];

  return (
    <div>
      {isAdmin && (
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => { setEditProduct(null); setShowForm(true); }}
            style={btnPrimary}
          >
            + Novo Produto
          </button>
        </div>
      )}

      {products.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
          {isAdmin
            ? 'Nenhum produto cadastrado. Clique em "+ Novo Produto" para começar.'
            : 'Nenhum produto disponível no momento.'}
        </div>
      )}

      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 28 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', fontWeight: 600 }}>
            {cat}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {products.filter(p => (p.category || 'Geral') === cat).map(product => (
              <div key={product._id} style={cardStyle}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{product.name}</div>
                  <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 20 }}>
                    R$ {product.price.toFixed(2).replace('.', ',')}
                  </div>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <button
                      onClick={() => { setEditProduct(product); setShowForm(true); }}
                      style={btnSmall}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      style={{ ...btnSmall, color: '#ef4444', borderColor: '#ef444460' }}
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {showForm && (
        <ProductForm
          product={editProduct}
          onSaved={handleSaved}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
        />
      )}
    </div>
  );
}

const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
};
const btnPrimary = {
  background: 'var(--primary)', color: '#fff', border: 'none',
  borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
};
const btnSmall = {
  background: 'transparent', border: '1px solid var(--border)',
  borderRadius: 6, padding: '5px 10px', fontSize: 12,
  cursor: 'pointer', color: 'var(--text)', flex: 1,
};

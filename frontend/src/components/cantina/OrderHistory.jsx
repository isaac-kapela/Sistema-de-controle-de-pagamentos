import { useState } from 'react';
import { deleteCantinaOrder } from '../../services/api';
import toast from 'react-hot-toast';

const PAYMENT_BADGE = {
  pix:      { label: 'PIX',      color: '#22c55e' },
  dinheiro: { label: 'Dinheiro', color: '#f59e0b' },
};

export default function OrderHistory({ orders, isAdmin, onRefresh }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (order) => {
    if (!confirm('Excluir esta venda?')) return;
    setDeleting(order._id);
    try {
      await deleteCantinaOrder(order._id);
      toast.success('Venda excluída');
      onRefresh();
    } catch {
      toast.error('Erro ao excluir venda');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Totais por forma de pagamento
  const totalPix = orders.filter(o => o.paymentMethod === 'pix').reduce((s, o) => s + o.total, 0);
  const totalDinheiro = orders.filter(o => o.paymentMethod === 'dinheiro').reduce((s, o) => s + o.total, 0);

  return (
    <div>
      {/* Cards de resumo */}
      {orders.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={summaryCard}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL GERAL</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>
              R$ {(totalPix + totalDinheiro).toFixed(2).replace('.', ',')}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{orders.length} venda(s)</span>
          </div>
          <div style={summaryCard}>
            <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>PIX</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#22c55e' }}>
              R$ {totalPix.toFixed(2).replace('.', ',')}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {orders.filter(o => o.paymentMethod === 'pix').length} venda(s)
            </span>
          </div>
          <div style={summaryCard}>
            <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>DINHEIRO</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>
              R$ {totalDinheiro.toFixed(2).replace('.', ',')}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {orders.filter(o => o.paymentMethod === 'dinheiro').length} venda(s)
            </span>
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
          Nenhuma venda registrada ainda.
        </div>
      )}

      {orders.map(order => {
        const badge = PAYMENT_BADGE[order.paymentMethod] || { label: order.paymentMethod, color: 'var(--text-muted)' };
        return (
          <div key={order._id} style={orderCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--primary)' }}>
                    R$ {order.total.toFixed(2).replace('.', ',')}
                  </span>
                  <span style={{
                    background: `${badge.color}22`, color: badge.color,
                    padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  }}>
                    {badge.label}
                  </span>
                  {order.buyerName && (
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      — {order.buyerName}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {order.items.map((item, i) => (
                    <span key={i} style={itemChip}>
                      {item.quantity}× {item.name}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {formatDate(order.createdAt)}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(order)}
                    disabled={deleting === order._id}
                    style={deleteBtn}
                  >
                    {deleting === order._id ? '...' : 'Excluir'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const summaryCard = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '14px 18px',
  display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140,
};
const orderCard = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '14px 16px', marginBottom: 10,
};
const itemChip = {
  background: '#ffffff0f', borderRadius: 6, padding: '3px 10px',
  fontSize: 12, color: 'var(--text)',
};
const deleteBtn = {
  background: 'transparent', border: '1px solid #ef444440',
  color: '#ef4444', borderRadius: 6, padding: '4px 10px',
  fontSize: 12, cursor: 'pointer',
};

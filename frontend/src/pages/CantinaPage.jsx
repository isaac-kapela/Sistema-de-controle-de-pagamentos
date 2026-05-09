import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCantinaProducts, getCantinaOrders } from '../services/api';
import ProductList from '../components/cantina/ProductList';
import NewSale from '../components/cantina/NewSale';
import OrderHistory from '../components/cantina/OrderHistory';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'produtos',  label: 'Produtos' },
  { id: 'venda',     label: 'Registrar Minha Compra' },
  { id: 'historico', label: 'Histórico' },
];

export default function CantinaPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('produtos');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    try {
      const data = await getCantinaProducts();
      setProducts(data);
    } catch {
      toast.error('Erro ao carregar produtos');
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const data = await getCantinaOrders();
      setOrders(data);
    } catch {
      toast.error('Erro ao carregar vendas');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadProducts(), loadOrders()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleSaleCreated = () => {
    loadOrders();
    setActiveTab('historico');
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Cantina</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Gerenciamento de produtos e compras
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px', background: 'none', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 400,
              cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap',
              marginBottom: -1, transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
          Carregando...
        </div>
      ) : (
        <>
          {activeTab === 'produtos' && (
            <ProductList
              products={products}
              isAdmin={isAdmin}
              onRefresh={loadProducts}
            />
          )}
          {activeTab === 'venda' && (
            <NewSale
              products={products}
              onSaved={handleSaleCreated}
            />
          )}
          {activeTab === 'historico' && (
            <OrderHistory
              orders={orders}
              isAdmin={isAdmin}
              onRefresh={loadOrders}
            />
          )}
        </>
      )}
    </div>
  );
}

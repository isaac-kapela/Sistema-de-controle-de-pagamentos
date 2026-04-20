import { useState, useEffect, useCallback } from 'react';
import { getPayments, togglePayment as apiToggle } from '../services/api';
import toast from 'react-hot-toast';

export function usePayments(month, year) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPayments(month, year);
      setData(result);
    } catch (err) {
      setError('Erro ao carregar pagamentos.');
      toast.error('Erro ao carregar pagamentos.');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  const togglePayment = async (id, field) => {
    try {
      const updated = await apiToggle(id, field);
      setData((prev) => ({
        ...prev,
        payments: prev.payments.map((p) => (p._id === id ? updated : p)),
      }));
      // Recalcula summary localmente
      setData((prev) => {
        const payments = prev.payments;
        const totalAmount = payments.reduce((s, p) => s + p.amount, 0);
        const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);
        const totalPending = totalAmount - totalPaid;
        const countPaid = payments.filter((p) => p.fullyPaid).length;
        const countPending = payments.filter((p) => !p.fullyPaid).length;
        return { ...prev, summary: { totalAmount, totalPaid, totalPending, countPaid, countPending } };
      });
    } catch {
      toast.error('Erro ao atualizar pagamento.');
    }
  };

  return { data, loading, error, reload: load, togglePayment };
}

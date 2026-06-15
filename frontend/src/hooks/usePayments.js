import { useState, useEffect, useCallback } from 'react';
import { getPayments, togglePayment as apiToggle, getChargeTypes } from '../services/api';
import toast from 'react-hot-toast';

export function usePayments(month, year) {
  const [data, setData] = useState(null);
  const [chargeTypes, setChargeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, types] = await Promise.all([
        getPayments(month, year),
        getChargeTypes().catch(() => []),
      ]);
      setData(result);
      setChargeTypes(types);
    } catch (err) {
      setError('Erro ao carregar pagamentos.');
      toast.error('Erro ao carregar pagamentos.');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const togglePayment = async (id, field) => {
    try {
      const updated = await apiToggle(id, field);
      setData((prev) => {
        const newPayments = prev.payments.map((p) => p._id === id ? updated : p);
        const totalAmount = newPayments.reduce((s, p) => s + p.amount, 0);
        const totalPaid = newPayments.reduce((s, p) => s + p.amountPaid, 0);
        const totalPending = totalAmount - totalPaid;
        const countPaid = newPayments.filter((p) => p.fullyPaid).length;
        const countPending = newPayments.filter((p) => !p.fullyPaid).length;
        return { ...prev, payments: newPayments, summary: { totalAmount, totalPaid, totalPending, countPaid, countPending } };
      });
    } catch {
      toast.error('Erro ao atualizar pagamento.');
    }
  };

  return { data, chargeTypes, loading, error, reload: load, togglePayment };
}

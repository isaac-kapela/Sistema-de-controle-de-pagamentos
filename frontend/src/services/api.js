import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10000,
});

// ─── Usuários ────────────────────────────────────────────────
export const getUsers = () => api.get('/users').then((r) => r.data);

export const createUser = (data) => api.post('/users', data).then((r) => r.data);

export const updateUser = (id, data) => api.put(`/users/${id}`, data).then((r) => r.data);

export const deleteUser = (id) => api.delete(`/users/${id}`).then((r) => r.data);

// ─── Pagamentos ──────────────────────────────────────────────
export const getPayments = (month, year) =>
  api.get('/payments', { params: { month, year } }).then((r) => r.data);

export const togglePayment = (id, field) =>
  api.patch(`/payments/${id}/toggle`, { field }).then((r) => r.data);

export const generatePayments = (month, year) =>
  api.post('/payments/generate', { month, year }).then((r) => r.data);

// ─── Email ───────────────────────────────────────────────────
export const sendCharge = (paymentId) =>
  api.post(`/email/charge/${paymentId}`).then((r) => r.data);

export const sendChargeAll = (month, year) =>
  api.post('/email/charge-all', { month, year }).then((r) => r.data);

export default api;

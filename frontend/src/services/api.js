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

// ─── Membros ─────────────────────────────────────────────────
export const getMembers = (search = '') =>
  api.get('/members', { params: search ? { search } : {} }).then((r) => r.data);

export const getMember = (id) => api.get(`/members/${id}`).then((r) => r.data);

export const createMember = (data) => api.post('/members', data).then((r) => r.data);

export const updateMember = (id, data) => api.put(`/members/${id}`, data).then((r) => r.data);

export const deleteMember = (id) => api.delete(`/members/${id}`).then((r) => r.data);

// ─── Horários ────────────────────────────────────────────────
export const parsePDF = (file) => {
  const fd = new FormData();
  fd.append('pdf', file);
  return api.post('/schedules/parse-pdf', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  }).then((r) => r.data);
};

export const getSchedules = (semestre = '') =>
  api.get('/schedules', { params: semestre ? { semestre } : {} }).then((r) => r.data);

export const getAggregate = (semestre = '') =>
  api.get('/schedules/aggregate', { params: semestre ? { semestre } : {} }).then((r) => r.data);

export const createSchedule = (data) => api.post('/schedules', data).then((r) => r.data);

export const deleteSchedule = (id) => api.delete(`/schedules/${id}`).then((r) => r.data);

export const clearAllSchedules = () => api.delete('/schedules').then((r) => r.data);

// ─── Email ───────────────────────────────────────────────────
export const sendCharge = (paymentId) =>
  api.post(`/email/charge/${paymentId}`).then((r) => r.data);

export const sendChargeAll = (month, year) =>
  api.post('/email/charge-all', { month, year }).then((r) => r.data);

export const sendBirthdayToday = () =>
  api.post('/email/birthday-today').then((r) => r.data);

export default api;

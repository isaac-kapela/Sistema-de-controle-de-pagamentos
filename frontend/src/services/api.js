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

// ─── Semestres ───────────────────────────────────────────────
export const getSemesters = () => api.get('/semesters').then((r) => r.data);

export const createSemester = (data) => api.post('/semesters', data).then((r) => r.data);

export const updateSemester = (id, data) => api.put(`/semesters/${id}`, data).then((r) => r.data);

export const deleteSemester = (id) => api.delete(`/semesters/${id}`).then((r) => r.data);

export const generateMeetingsForSemester = (id) =>
  api.post(`/semesters/${id}/generate-meetings`).then((r) => r.data);

export const startNewSemester = (data) => api.post('/semesters/new-semester', data).then((r) => r.data);

// ─── Reuniões ─────────────────────────────────────────────────
export const getMeetings = (params = {}) => api.get('/meetings', { params }).then((r) => r.data);

export const createMeeting = (data) => api.post('/meetings', data).then((r) => r.data);

export const updateMeeting = (id, data) => api.put(`/meetings/${id}`, data).then((r) => r.data);

export const deleteMeeting = (id) => api.delete(`/meetings/${id}`).then((r) => r.data);

// ─── Presenças ────────────────────────────────────────────────
export const getAttendances = (params = {}) => api.get('/attendances', { params }).then((r) => r.data);

export const getAttendanceStats = (semesterId) =>
  api.get('/attendances/stats', { params: { semesterId } }).then((r) => r.data);

export const upsertAttendance = (data) => api.post('/attendances', data).then((r) => r.data);

export const bulkUpsertAttendances = (meetingId, records) =>
  api.post('/attendances/bulk', { meetingId, records }).then((r) => r.data);

export const clearSemesterAttendances = (semesterId) =>
  api.delete(`/attendances/semester/${semesterId}`).then((r) => r.data);

// ─── Cantina ─────────────────────────────────────────────────
export const getCantinaProducts = (includeInactive = false) =>
  api.get('/cantina/products', { params: includeInactive ? { includeInactive: 'true' } : {} }).then((r) => r.data);

export const createCantinaProduct = (data) =>
  api.post('/cantina/products', data).then((r) => r.data);

export const updateCantinaProduct = (id, data) =>
  api.put(`/cantina/products/${id}`, data).then((r) => r.data);

export const deleteCantinaProduct = (id) =>
  api.delete(`/cantina/products/${id}`).then((r) => r.data);

export const getCantinaOrders = () =>
  api.get('/cantina/orders').then((r) => r.data);

export const createCantinaOrder = (data) =>
  api.post('/cantina/orders', data).then((r) => r.data);

export const deleteCantinaOrder = (id) =>
  api.delete(`/cantina/orders/${id}`).then((r) => r.data);

// ─── Email ───────────────────────────────────────────────────
export const sendCharge = (paymentId) =>
  api.post(`/email/charge/${paymentId}`).then((r) => r.data);

export const sendChargeAll = (month, year) =>
  api.post('/email/charge-all', { month, year }).then((r) => r.data);

export const sendBirthdayToday = () =>
  api.post('/email/birthday-today').then((r) => r.data);

// ─── Estoque ──────────────────────────────────────────────────
export const getStockItems = (params = {}) =>
  api.get('/stock', { params }).then((r) => r.data);

export const createStockItem = (data) =>
  api.post('/stock', data).then((r) => r.data);

export const updateStockItem = (id, data) =>
  api.put(`/stock/${id}`, data).then((r) => r.data);

export const deleteStockItem = (id) =>
  api.delete(`/stock/${id}`).then((r) => r.data);

export const adjustStockQty = (id, delta) =>
  api.patch(`/stock/${id}/adjust`, { delta }).then((r) => r.data);

export const sendStockAlert = (ids = []) =>
  api.post('/stock/alert', { ids }).then((r) => r.data);

export const getStockCategories = () =>
  api.get('/stock/categories').then((r) => r.data);

export const createStockCategory = (nome) =>
  api.post('/stock/categories', { nome }).then((r) => r.data);

export const deleteStockCategory = (id) =>
  api.delete(`/stock/categories/${id}`).then((r) => r.data);

export default api;

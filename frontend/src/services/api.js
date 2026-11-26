import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.response.use((response) => {
  if (typeof response.data === 'string' && response.data.trim().toLowerCase().startsWith('<!doctype html')) {
    return Promise.reject(new Error('Resposta inválida do servidor (HTML em vez de JSON)'));
  }
  return response;
});

// ─── Usuários ────────────────────────────────────────────────
export const getUsers = () => api.get('/users').then((r) => r.data);

export const createUser = (data) => api.post('/users', data).then((r) => r.data);


export const deleteUser = (id) => api.delete(`/users/${id}`).then((r) => r.data);

// ─── Pagamentos ──────────────────────────────────────────────
export const getPayments = (month, year) =>
  api.get('/payments', { params: { month, year } }).then((r) => r.data);

export const togglePayment = (id, field) =>
  api.patch(`/payments/${id}/toggle`, { field }).then((r) => r.data);


// ─── Membros ─────────────────────────────────────────────────
export const getMembers = (search = '') =>
  api.get('/members', { params: search ? { search } : {} }).then((r) => r.data);

export const getMember = (id) => api.get(`/members/${id}`).then((r) => r.data);

export const createMember = (data) => api.post('/members', data).then((r) => r.data);

export const updateMember = (id, data) => api.put(`/members/${id}`, data).then((r) => r.data);

export const deleteMember = (id) => api.delete(`/members/${id}`).then((r) => r.data);

export const generateMemberCode = (id) =>
  api.post(`/members/${id}/generate-code`).then((r) => r.data);

export const validateMemberCode = (codigo) =>
  api.post('/members/validate-code', { codigo }).then((r) => r.data);

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


export const createSchedule = (data) => api.post('/schedules', data).then((r) => r.data);

export const updateSchedule = (id, data) => api.put(`/schedules/${id}`, data).then((r) => r.data);

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

export const getMotivationalInfo = () =>
  api.get('/email/motivational/info').then((r) => r.data);

export const sendMotivationalAll = (data = {}) =>
  api.post('/email/motivational/send-all', data).then((r) => r.data);

export const sendMotivationalTest = (data = {}) =>
  api.post('/email/motivational/test-send', data).then((r) => r.data);

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

// ─── Feedbacks ────────────────────────────────────────────────
export const getFeedbackCampaigns = (params = {}) =>
  api.get('/feedbacks', { params }).then((r) => r.data);

export const getFeedbackStats = () =>
  api.get('/feedbacks/stats').then((r) => r.data);

export const getFeedbackCampaign = (id) =>
  api.get(`/feedbacks/${id}`).then((r) => r.data);

export const createFeedbackCampaign = (data) =>
  api.post('/feedbacks', data).then((r) => r.data);

export const updateFeedbackCampaign = (id, data) =>
  api.put(`/feedbacks/${id}`, data).then((r) => r.data);

export const deleteFeedbackCampaign = (id) =>
  api.delete(`/feedbacks/${id}`).then((r) => r.data);

export const duplicateFeedbackCampaign = (id) =>
  api.post(`/feedbacks/${id}/duplicate`).then((r) => r.data);

export const archiveFeedbackCampaign = (id) =>
  api.patch(`/feedbacks/${id}/archive`).then((r) => r.data);

export const toggleFeedbackStatus = (id) =>
  api.patch(`/feedbacks/${id}/toggle-status`).then((r) => r.data);

export const getFeedbackCampaignStats = (id) =>
  api.get(`/feedbacks/${id}/stats`).then((r) => r.data);

export const getFeedbackResponses = (id, params = {}) =>
  api.get(`/feedbacks/${id}/responses`, { params }).then((r) => r.data);

export const saveFeedbackResponse = (id, data) =>
  api.put(`/feedbacks/${id}/responses`, data).then((r) => r.data);

export const getFeedbackMemberReport = (id, membroId) =>
  api.get(`/feedbacks/${id}/member-report`, { params: { membroId } }).then((r) => r.data);

// ─── Tipos de cobrança ────────────────────────────────────────
export const getChargeTypes = () => api.get('/charge-types').then((r) => r.data);

export const createChargeType = (data) => api.post('/charge-types', data).then((r) => r.data);

export const updateChargeType = (id, data) => api.put(`/charge-types/${id}`, data).then((r) => r.data);

export const deleteChargeType = (id) => api.delete(`/charge-types/${id}`).then((r) => r.data);

export const cleanupOrphanCharges = () => api.post('/charge-types/cleanup-orphans').then((r) => r.data);

// ─── Log In (credenciais de plataformas) ─────────────────────
export const getLogins = (params = {}) =>
  api.get('/logins', { params }).then((r) => r.data);

export const createLogin = (data) =>
  api.post('/logins', data).then((r) => r.data);

export const updateLogin = (id, data) =>
  api.put(`/logins/${id}`, data).then((r) => r.data);

export const deleteLogin = (id) =>
  api.delete(`/logins/${id}`).then((r) => r.data);

// ─── Fluxo de Caixa e Controle Financeiro ─────────────────────
export const getFinancialSummary = (params = {}) =>
  api.get('/financial/summary', { params }).then((r) => r.data);

export const getFinancialMeta = () =>
  api.get('/financial/meta').then((r) => r.data);

export const adjustFinancialBalance = (data) =>
  api.post('/financial/adjust-balance', data).then((r) => r.data);

export const getFinancialMovements = (params = {}) =>
  api.get('/financial/movements', { params }).then((r) => r.data);

export const createFinancialMovement = (data) =>
  api.post('/financial/movements', data).then((r) => r.data);

export const updateFinancialMovement = (id, data) =>
  api.put(`/financial/movements/${id}`, data).then((r) => r.data);

export const cancelFinancialMovement = (id, data) =>
  api.post(`/financial/movements/${id}/cancel`, data).then((r) => r.data);

export const getPurchases = (params = {}) =>
  api.get('/financial/purchases', { params }).then((r) => r.data);

export const getPurchaseById = (id) =>
  api.get(`/financial/purchases/${id}`).then((r) => r.data);

export const createPurchase = (data) =>
  api.post('/financial/purchases', data).then((r) => r.data);

export const updatePurchase = (id, data) =>
  api.put(`/financial/purchases/${id}`, data).then((r) => r.data);

export const payFinancialPurchase = (id, data) =>
  api.post(`/financial/purchases/${id}/pay`, data).then((r) => r.data);

export const updatePurchaseDelivery = (id, data) =>
  api.patch(`/financial/purchases/${id}/delivery`, data).then((r) => r.data);

export const cancelPurchase = (id, data) =>
  api.post(`/financial/purchases/${id}/cancel`, data).then((r) => r.data);

// ─── Contatos Importantes ─────────────────────────────────────
export const getImportantContacts = (params = {}) =>
  api.get('/contacts', { params }).then((r) => r.data);

export const createImportantContact = (data) =>
  api.post('/contacts', data).then((r) => r.data);

export const updateImportantContact = (id, data) =>
  api.put(`/contacts/${id}`, data).then((r) => r.data);

export const deleteImportantContact = (id) =>
  api.delete(`/contacts/${id}`).then((r) => r.data);

// ─── Atividades / Agenda e Lembretes ──────────────────────────
export const getActivities = (params = {}) =>
  api.get('/activities', { params }).then((r) => r.data);

export const createActivity = (data) =>
  api.post('/activities', data).then((r) => r.data);

export const updateActivity = (id, data) =>
  api.put(`/activities/${id}`, data).then((r) => r.data);

export const toggleActivityComplete = (id) =>
  api.patch(`/activities/${id}/toggle-complete`).then((r) => r.data);

export const sendActivityReminder = (id, data = {}) =>
  api.post(`/activities/${id}/send-reminder`, data).then((r) => r.data);

export const checkTomorrowActivities = () =>
  api.post('/activities/check-tomorrow').then((r) => r.data);

export const syncBirthdayActivities = (data = {}) =>
  api.post('/activities/sync-birthdays', data).then((r) => r.data);

export const deleteActivity = (id) =>
  api.delete(`/activities/${id}`).then((r) => r.data);

// ─── Microsabedoria (Base de Conhecimento e RAG) ─────────────
export const getMicrosabedoriaSettings = () =>
  api.get('/microsabedoria/settings').then((r) => r.data);

export const updateMicrosabedoriaSettings = (data) =>
  api.post('/microsabedoria/settings', data).then((r) => r.data);

export const testMicrosabedoriaConnection = (data) =>
  api.post('/microsabedoria/test-connection', data, { timeout: 60000 }).then((r) => r.data);

export const syncMicrosabedoria = (data = {}) =>
  api.post('/microsabedoria/sync', data, { timeout: 60000 }).then((r) => r.data);

export const getMicrosabedoriaSyncStatus = () =>
  api.get('/microsabedoria/sync-status').then((r) => r.data);

export const getMicrosabedoriaDocuments = (params = {}) =>
  api.get('/microsabedoria/documents', { params }).then((r) => r.data);

export const deleteMicrosabedoriaDocument = (id) =>
  api.delete(`/microsabedoria/documents/${id}`).then((r) => r.data);

export const reindexMicrosabedoriaDocument = (id) =>
  api.post(`/microsabedoria/documents/${id}/reindex`, {}, { timeout: 60000 }).then((r) => r.data);

export const sendMicrosabedoriaChat = (data) =>
  api.post('/microsabedoria/chat', data, { timeout: 120000 }).then((r) => r.data);

export const getMicrosabedoriaSessions = () =>
  api.get('/microsabedoria/sessions').then((r) => r.data);

export const getMicrosabedoriaSession = (id) =>
  api.get(`/microsabedoria/sessions/${id}`).then((r) => r.data);

export const deleteMicrosabedoriaSession = (id) =>
  api.delete(`/microsabedoria/sessions/${id}`).then((r) => r.data);

export default api;

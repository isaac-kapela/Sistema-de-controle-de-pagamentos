const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const {
  listCampaigns,
  getStats,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  duplicateCampaign,
  archiveCampaign,
  toggleStatus,
  getCampaignStats,
  getResponses,
  saveResponse,
  getMemberReport,
} = require('../controllers/feedbackController');

// Rotas fixas primeiro (antes de /:id para não serem capturadas como ID)
router.get('/stats', requireAuth, getStats);
router.post('/', requireAuth, createCampaign);

// Rotas públicas por ID
router.get('/', listCampaigns);
router.get('/:id', getCampaign);
router.get('/:id/responses', getResponses);
router.put('/:id/responses', saveResponse);

// Rotas admin por ID
router.put('/:id', requireAuth, updateCampaign);
router.delete('/:id', requireAuth, deleteCampaign);
router.post('/:id/duplicate', requireAuth, duplicateCampaign);
router.patch('/:id/archive', requireAuth, archiveCampaign);
router.patch('/:id/toggle-status', requireAuth, toggleStatus);
router.get('/:id/stats', requireAuth, getCampaignStats);
router.get('/:id/member-report', requireAuth, getMemberReport);

module.exports = router;

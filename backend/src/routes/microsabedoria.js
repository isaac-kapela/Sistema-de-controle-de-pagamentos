const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const knowledgeController = require('../controllers/knowledgeController');

// Rotas públicas ou para membros (Chat e histórico de conversas)
router.post('/chat', knowledgeController.chat);
router.get('/sessions', knowledgeController.listSessions);
router.get('/sessions/:id', knowledgeController.getSession);
router.delete('/sessions/:id', knowledgeController.deleteSession);
router.get('/sync-status', knowledgeController.getSyncStatus);
router.get('/documents', knowledgeController.listDocuments);

// Rotas restritas para Administradores (Configurações, Sincronização e Manutenção)
router.get('/settings', requireAuth, knowledgeController.getSettings);
router.post('/settings', requireAuth, knowledgeController.updateSettings);
router.post('/test-connection', requireAuth, knowledgeController.testConnection);
router.post('/sync', requireAuth, knowledgeController.triggerSync);
router.post('/documents/:id/reindex', requireAuth, knowledgeController.reindexDocument);
router.delete('/documents/:id', requireAuth, knowledgeController.deleteDocument);

module.exports = router;

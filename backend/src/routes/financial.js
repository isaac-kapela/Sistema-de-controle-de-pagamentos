const router = require('express').Router();
const ctrl = require('../controllers/financialController');

// ── Visão geral e Metadados ──
router.get('/summary', ctrl.getSummary);
router.get('/meta', ctrl.getMeta);
router.post('/adjust-balance', ctrl.adjustBalance);

// ── Movimentações de Caixa ──
router.get('/movements', ctrl.getMovements);
router.post('/movements', ctrl.createMovement);
router.put('/movements/:id', ctrl.updateMovement);
router.post('/movements/:id/cancel', ctrl.cancelMovement);

// ── Compras ──
router.get('/purchases', ctrl.getPurchases);
router.get('/purchases/:id', ctrl.getPurchaseById);
router.post('/purchases', ctrl.createPurchase);
router.put('/purchases/:id', ctrl.updatePurchase);
router.post('/purchases/:id/pay', ctrl.payPurchase);
router.patch('/purchases/:id/delivery', ctrl.updatePurchaseDelivery);
router.post('/purchases/:id/cancel', ctrl.cancelPurchase);

module.exports = router;

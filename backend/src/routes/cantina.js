const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/cantinaController');

// Produtos
router.get('/products', ctrl.listProducts);
router.post('/products', requireAuth, ctrl.createProduct);
router.put('/products/:id', requireAuth, ctrl.updateProduct);
router.delete('/products/:id', requireAuth, ctrl.deleteProduct);

// Vendas
router.get('/orders', ctrl.listOrders);
router.post('/orders', ctrl.createOrder);
router.delete('/orders/:id', requireAuth, ctrl.deleteOrder);

module.exports = router;

const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getItems, createItem, updateItem, deleteItem, adjustQty, sendAlert,
  getCategories, createCategory, deleteCategory,
} = require('../controllers/stockController');

// ── itens ──────────────────────────────────────────────────────────────────
router.get('/',              getItems);
router.post('/',             requireAuth, createItem);
router.put('/:id',           requireAuth, updateItem);
router.delete('/:id',        requireAuth, deleteItem);
router.patch('/:id/adjust',  adjustQty);
router.post('/alert',        requireAuth, sendAlert);

// ── categorias ─────────────────────────────────────────────────────────────
router.get('/categories',           getCategories);
router.post('/categories',          requireAuth, createCategory);
router.delete('/categories/:id',    requireAuth, deleteCategory);

module.exports = router;

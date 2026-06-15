const router = require('express').Router();
const { listChargeTypes, createChargeType, updateChargeType, deleteChargeType, cleanupOrphans } = require('../controllers/chargeTypeController');
const { requireAuth } = require('../middleware/auth');

router.get('/', listChargeTypes);
router.post('/', requireAuth, createChargeType);
router.put('/:id', requireAuth, updateChargeType);
router.delete('/:id', requireAuth, deleteChargeType);
router.post('/cleanup-orphans', requireAuth, cleanupOrphans);

module.exports = router;

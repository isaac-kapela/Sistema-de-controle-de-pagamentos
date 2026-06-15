const router = require('express').Router();
const { listChargeTypes, createChargeType, updateChargeType, deleteChargeType } = require('../controllers/chargeTypeController');
const { requireAuth } = require('../middleware/auth');

router.get('/', listChargeTypes);
router.post('/', requireAuth, createChargeType);
router.put('/:id', requireAuth, updateChargeType);
router.delete('/:id', requireAuth, deleteChargeType);

module.exports = router;

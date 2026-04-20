const express = require('express');
const router = express.Router();
const { listPayments, togglePayment, generatePayments } = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');

router.get('/', listPayments);
router.post('/generate', generatePayments);
router.patch('/:id/toggle', requireAuth, togglePayment);

module.exports = router;

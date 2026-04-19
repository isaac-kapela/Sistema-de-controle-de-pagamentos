const express = require('express');
const router = express.Router();
const { listPayments, togglePayment, generatePayments } = require('../controllers/paymentController');

router.get('/', listPayments);
router.post('/generate', generatePayments);
router.patch('/:id/toggle', togglePayment);

module.exports = router;

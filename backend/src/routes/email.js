const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const { requireAuth } = require('../middleware/auth');
const { sendChargeEmail } = require('../services/mailer');

// Envia cobrança para um único usuário
router.post('/charge/:paymentId', requireAuth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate('userId');
    if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado.' });
    if (payment.fullyPaid) return res.status(400).json({ error: 'Este pagamento já está quitado.' });

    const { userId, month, year, isDriver, gasolinaPaid, drivePaid, amount, amountPaid } = payment;

    await sendChargeEmail({
      to: userId.email,
      name: userId.name,
      month, year, isDriver, gasolinaPaid, drivePaid, amount, amountPaid,
    });

    res.json({ message: `Email enviado para ${userId.email}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar email.' });
  }
});

// Envia cobrança para todos os pendentes do mês
router.post('/charge-all', requireAuth, async (req, res) => {
  try {
    const { month, year } = req.body;
    const payments = await Payment.find({ month, year }).populate('userId');

    const pending = payments.filter((p) => p.userId?.active && !p.fullyPaid);
    if (pending.length === 0) return res.json({ message: 'Nenhum pendente neste mês.', sent: 0 });

    const results = await Promise.allSettled(
      pending.map((p) =>
        sendChargeEmail({
          to: p.userId.email,
          name: p.userId.name,
          month: p.month, year: p.year,
          isDriver: p.isDriver,
          gasolinaPaid: p.gasolinaPaid,
          drivePaid: p.drivePaid,
          amount: p.amount,
          amountPaid: p.amountPaid,
        })
      )
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    res.json({ message: `${sent} email(s) enviado(s). ${failed > 0 ? `${failed} falhou.` : ''}`, sent, failed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar emails.' });
  }
});

module.exports = router;

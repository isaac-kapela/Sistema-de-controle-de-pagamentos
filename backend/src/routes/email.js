const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Member = require('../models/Member');
const { requireAuth } = require('../middleware/auth');
const { sendChargeEmail } = require('../services/mailer');
const { sendTodayBirthdays } = require('../services/birthday');
const {
  MOTIVATIONAL_MESSAGES,
  getMessageOfTheWeek,
  sendWeeklyMotivationalEmails,
} = require('../services/motivational');

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

// Dispara emails de aniversario do dia manualmente
router.post('/birthday-today', async (req, res) => {
  try {
    const { sent, failed, names } = await sendTodayBirthdays();
    if (names.length === 0) return res.json({ message: 'Nenhum aniversariante hoje.' });
    res.json({
      message: `${sent} email(s) enviado(s)${failed > 0 ? `, ${failed} falhou` : ''}.`,
      names,
      sent,
      failed,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar emails de aniversario.' });
  }
});

// ─── Mensagens Motivacionais Semanais (a cada 7 dias) ───

// Obter catálogo de mensagens e mensagem atual da semana
router.get('/motivational/info', async (req, res) => {
  try {
    const currentWeekMessage = getMessageOfTheWeek();
    const activeMembersCount = await Member.countDocuments({
      ativo: true,
      tipoMembro: 'membro',
      email: { $exists: true, $ne: '' },
    });

    res.json({
      currentWeekMessage,
      allMessages: MOTIVATIONAL_MESSAGES,
      activeMembersCount,
      schedule: 'A cada 7 dias (toda segunda-feira às 09:00 BRT)',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar dados motivacionais.' });
  }
});

// Disparar envio de mensagem motivacional para todos os membros ativos
router.post('/motivational/send-all', async (req, res) => {
  try {
    const { customQuote, customAuthor, customTitle, customBody, customSubject } = req.body || {};
    const result = await sendWeeklyMotivationalEmails({
      customQuote,
      customAuthor,
      customTitle,
      customBody,
      customSubject,
    });

    if (result.total === 0) {
      return res.status(400).json({ error: 'Nenhum membro ativo com email válido encontrado.' });
    }

    res.json({
      message: `${result.sent} email(s) motivacional(is) enviado(s) com sucesso.${result.failed > 0 ? ` ${result.failed} falhou.` : ''}`,
      sent: result.sent,
      failed: result.failed,
      total: result.total,
      quote: result.quote,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro ao enviar emails motivacionais.' });
  }
});

// Testar envio para um email específico
router.post('/motivational/test-send', async (req, res) => {
  try {
    const { email, name, customQuote, customAuthor, customTitle, customBody } = req.body || {};
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email de teste inválido.' });
    }

    const result = await sendWeeklyMotivationalEmails({
      customQuote,
      customAuthor,
      customTitle,
      customBody,
      targetEmails: [{ email: email.trim(), nome: name || 'Membro Teste' }],
    });

    res.json({
      message: `Email motivacional de teste enviado para ${email}.`,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro ao enviar email de teste.' });
  }
});

module.exports = router;

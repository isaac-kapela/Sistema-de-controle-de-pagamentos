const Payment = require('../models/Payment');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const GASOLINA = 5.0;
const DRIVE = 2.27;

// Listar pagamentos de um mês/ano com dados do usuário
const listPayments = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();

    // Garante que todos os usuários ativos têm registro no mês
    await ensurePaymentsExist(month, year);

    const payments = await Payment.find({ month, year })
      .populate('userId', 'name email isDriver active')
      .sort({ 'userId.name': 1 });

    // Filtra apenas usuários ativos
    const active = payments.filter((p) => p.userId && p.userId.active);

    const totalAmount = active.reduce((s, p) => s + p.amount, 0);
    const totalPaid = active.reduce((s, p) => s + p.amountPaid, 0);
    const totalPending = totalAmount - totalPaid;
    const countPaid = active.filter((p) => p.fullyPaid).length;
    const countPending = active.filter((p) => !p.fullyPaid).length;

    const paymentsData = active.map((p) => p.toJSON());

    res.json({
      month,
      year,
      payments: paymentsData,
      summary: { totalAmount, totalPaid, totalPending, countPaid, countPending },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pagamentos.' });
  }
};

// Garante que todos os usuários ativos têm um registro de pagamento no mês
const ensurePaymentsExist = async (month, year) => {
  const users = await User.find({ active: true });

  await Promise.all(
    users.map((user) => {
      const amount = user.isDriver ? DRIVE : GASOLINA + DRIVE;
      return Payment.findOneAndUpdate(
        { userId: user._id, month, year },
        { $setOnInsert: { userId: user._id, month, year, isDriver: user.isDriver, amount } },
        { upsert: true, new: true }
      );
    })
  );
};

// Alternar status de pagamento (gasolina ou drive)
const togglePayment = async (req, res) => {
  try {
    const { field } = req.body; // 'gasolina' | 'drive' | 'all'

    if (!['gasolina', 'drive', 'all'].includes(field)) {
      return res.status(400).json({ error: 'Campo inválido. Use "gasolina", "drive" ou "all".' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado.' });

    // Verifica se é uma ação de "desfazer" (remover marcação de pago)
    const isUndo =
      (field === 'all' && payment.fullyPaid) ||
      (field === 'gasolina' && payment.gasolinaPaid) ||
      (field === 'drive' && payment.drivePaid);

    if (isUndo) {
      const header = req.headers.authorization;
      const token = header && header.startsWith('Bearer ') ? header.split(' ')[1] : null;
      try {
        if (!token) throw new Error('sem token');
        jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return res.status(403).json({ error: 'Apenas admins podem desfazer pagamentos.' });
      }
    }

    if (field === 'all') {
      // Toggle geral: se tudo está pago, desfaz; caso contrário, marca tudo
      const fullyPaid = payment.fullyPaid;
      if (!payment.isDriver) {
        payment.gasolinaPaid = !fullyPaid;
        payment.gasolinaPaidAt = !fullyPaid ? new Date() : null;
      }
      payment.drivePaid = !fullyPaid;
      payment.drivePaidAt = !fullyPaid ? new Date() : null;
    } else if (field === 'gasolina' && !payment.isDriver) {
      payment.gasolinaPaid = !payment.gasolinaPaid;
      payment.gasolinaPaidAt = payment.gasolinaPaid ? new Date() : null;
    } else if (field === 'drive') {
      payment.drivePaid = !payment.drivePaid;
      payment.drivePaidAt = payment.drivePaid ? new Date() : null;
    }

    await payment.save();
    await payment.populate('userId', 'name email isDriver active');
    res.json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar pagamento.' });
  }
};

// Gerar registros de pagamento para todos os usuários ativos num mês
const generatePayments = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.body.month) || now.getMonth() + 1;
    const year = parseInt(req.body.year) || now.getFullYear();

    await ensurePaymentsExist(month, year);
    res.json({ message: `Pagamentos de ${month}/${year} gerados com sucesso.` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar pagamentos.' });
  }
};

module.exports = { listPayments, togglePayment, generatePayments };

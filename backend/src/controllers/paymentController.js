const Payment = require('../models/Payment');
const User = require('../models/User');
const ChargeType = require('../models/ChargeType');
const jwt = require('jsonwebtoken');

const listPayments = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();

    await ensurePaymentsExist(month, year);

    const payments = await Payment.find({ month, year })
      .populate('userId', 'name email isDriver active')
      .sort({ 'userId.name': 1 });

    const active = payments.filter((p) => p.userId && p.userId.active);

    const totalAmount = active.reduce((s, p) => s + p.amount, 0);
    const totalPaid = active.reduce((s, p) => s + p.amountPaid, 0);
    const totalPending = totalAmount - totalPaid;
    const countPaid = active.filter((p) => p.fullyPaid).length;
    const countPending = active.filter((p) => !p.fullyPaid).length;

    res.json({
      month,
      year,
      payments: active.map((p) => p.toJSON()),
      summary: { totalAmount, totalPaid, totalPending, countPaid, countPending },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pagamentos.' });
  }
};

const ensurePaymentsExist = async (month, year) => {
  const [users, chargeTypes] = await Promise.all([
    User.find({ active: true }),
    ChargeType.find({ active: true }),
  ]);

  // Só aplica cobranças criadas até o último dia do mês em questão
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const validForMonth = chargeTypes.filter(ct => new Date(ct.createdAt) <= monthEnd);

  // Pré-calcula quantos usuários cada cobrança rateada tem
  const countAll = users.length;
  const countDrivers = users.filter(u => u.isDriver).length;
  const countNonDrivers = users.filter(u => !u.isDriver).length;

  const perUserValue = (ct) => {
    if (!ct.splitAmongUsers) return ct.value;
    const n = ct.applicableTo === 'drivers' ? countDrivers
            : ct.applicableTo === 'non-drivers' ? countNonDrivers
            : countAll;
    return n > 0 ? Math.round((ct.value / n) * 100) / 100 : ct.value;
  };

  await Promise.all(users.map(async (user) => {
    const applicableCharges = validForMonth
      .filter((ct) => {
        if (ct.applicableTo === 'all') return true;
        if (ct.applicableTo === 'drivers') return user.isDriver;
        if (ct.applicableTo === 'non-drivers') return !user.isDriver;
        return true;
      })
      .map((ct) => ({
        chargeTypeId: ct._id,
        name: ct.name,
        value: perUserValue(ct),
        paid: false,
        paidAt: null,
      }));

    const existing = await Payment.findOneAndUpdate(
      { userId: user._id, month, year },
      { $setOnInsert: { userId: user._id, month, year, isDriver: user.isDriver, charges: applicableCharges } },
      { upsert: true, new: true }
    );

    // Migra documentos antigos (gasolinaPaid/drivePaid → charges)
    if (existing && existing.charges.length === 0) {
      const raw = await Payment.collection.findOne({ _id: existing._id });
      if (raw && (raw.drivePaid !== undefined || raw.gasolinaPaid !== undefined)) {
        const migratedCharges = applicableCharges.map((c) => {
          const ct = validForMonth.find(t => t._id.toString() === c.chargeTypeId.toString());
          if (ct?.name === 'Drive') return { ...c, paid: raw.drivePaid ?? false, paidAt: raw.drivePaidAt ?? null };
          if (ct?.name === 'Gasolina') return { ...c, paid: raw.gasolinaPaid ?? false, paidAt: raw.gasolinaPaidAt ?? null };
          return c;
        });
        await Payment.collection.updateOne({ _id: existing._id }, { $set: { charges: migratedCharges } });
      } else if (applicableCharges.length > 0) {
        // Documento sem dados legados (ex: criado pelo createUser antigo) — inicializa charges
        await Payment.updateOne({ _id: existing._id }, { $set: { charges: applicableCharges } });
      }
    }

    // Adiciona cobranças novas + atualiza valor de cobranças rateadas não pagas
    if (existing && existing.charges.length > 0) {
      const existingIds = existing.charges.map(c => c.chargeTypeId.toString());
      const missing = applicableCharges.filter(c => !existingIds.includes(c.chargeTypeId.toString()));
      if (missing.length > 0) {
        await Payment.updateOne({ _id: existing._id }, { $push: { charges: { $each: missing } } });
      }

      // Recalcula valor das cobranças rateadas não pagas (nº de usuários pode ter mudado)
      for (const charge of existing.charges) {
        const ct = validForMonth.find(t => t._id.toString() === charge.chargeTypeId.toString());
        if (ct?.splitAmongUsers && !charge.paid) {
          const newValue = perUserValue(ct);
          if (charge.value !== newValue) {
            await Payment.updateOne(
              { _id: existing._id, 'charges._id': charge._id },
              { $set: { 'charges.$.value': newValue } }
            );
          }
        }
      }
    }
  }));
};

const togglePayment = async (req, res) => {
  try {
    const { field } = req.body; // chargeTypeId string | 'all'

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado.' });

    const isUndo = field === 'all'
      ? payment.fullyPaid
      : payment.charges.find(c => c.chargeTypeId.toString() === field)?.paid ?? false;

    if (isUndo) {
      const header = req.headers.authorization;
      const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : null;
      try {
        if (!token) throw new Error();
        jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return res.status(403).json({ error: 'Apenas admins podem desfazer pagamentos.' });
      }
    }

    if (field === 'all') {
      const target = !payment.fullyPaid;
      payment.charges.forEach((c) => {
        c.paid = target;
        c.paidAt = target ? new Date() : null;
      });
    } else {
      const charge = payment.charges.find(c => c.chargeTypeId.toString() === field);
      if (!charge) return res.status(404).json({ error: 'Cobrança não encontrada no pagamento.' });
      charge.paid = !charge.paid;
      charge.paidAt = charge.paid ? new Date() : null;
    }

    await payment.save();
    await payment.populate('userId', 'name email isDriver active');
    res.json(payment.toJSON());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar pagamento.' });
  }
};

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

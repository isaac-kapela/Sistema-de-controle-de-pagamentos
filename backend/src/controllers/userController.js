const User = require('../models/User');
const Payment = require('../models/Payment');

const GASOLINA = 5.0;
const DRIVE = 2.27;

// Listar todos os usuários ativos
const listUsers = async (req, res) => {
  try {
    const users = await User.find({ active: true }).sort({ name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
};

// Criar novo usuário e gerar pagamento do mês atual
const createUser = async (req, res) => {
  try {
    const { name, email, isDriver } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    }

    const user = await User.create({ name, email, isDriver: !!isDriver });

    // Gera pagamento para o mês corrente automaticamente
    const now = new Date();
    const amount = isDriver ? DRIVE : GASOLINA + DRIVE;
    await Payment.create({
      userId: user._id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      isDriver: !!isDriver,
      amount,
    });

    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email já cadastrado.' });
    }
    res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
};

// Atualizar usuário
const updateUser = async (req, res) => {
  try {
    const { name, email, isDriver, active } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, isDriver, active },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(user);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email já cadastrado.' });
    }
    res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
};

// Remover (desativar) usuário
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({ message: 'Usuário removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover usuário.' });
  }
};

module.exports = { listUsers, createUser, updateUser, deleteUser };

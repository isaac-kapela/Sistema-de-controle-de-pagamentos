const User = require('../models/User');
const { ensurePaymentsExist } = require('./paymentController');

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

    // Se existe usuário inativo com mesmo email, reativa com os novos dados
    const inactive = await User.findOne({ email: email.toLowerCase().trim(), active: false });
    if (inactive) {
      const user = await User.findByIdAndUpdate(
        inactive._id,
        { name, email, isDriver: !!isDriver, active: true },
        { new: true }
      );
      // Redistribui rateio com o usuário reativado
      const now = new Date();
      await ensurePaymentsExist(now.getMonth() + 1, now.getFullYear());
      return res.status(200).json(user);
    }

    const user = await User.create({ name, email, isDriver: !!isDriver });

    // Cria pagamento do mês atual e redistribui rateio entre todos
    const now = new Date();
    await ensurePaymentsExist(now.getMonth() + 1, now.getFullYear());

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

    // Redistribui rateio entre os usuários que ficaram
    const now = new Date();
    await ensurePaymentsExist(now.getMonth() + 1, now.getFullYear());

    res.json({ message: 'Usuário removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover usuário.' });
  }
};

module.exports = { listUsers, createUser, updateUser, deleteUser };

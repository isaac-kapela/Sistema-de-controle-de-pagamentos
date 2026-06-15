const ChargeType = require('../models/ChargeType');

const listChargeTypes = async (req, res) => {
  try {
    const types = await ChargeType.find().sort({ name: 1 });
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createChargeType = async (req, res) => {
  try {
    const { name, value, applicableTo, active } = req.body;
    const ct = new ChargeType({ name, value, applicableTo, active });
    await ct.save();
    res.status(201).json(ct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const updateChargeType = async (req, res) => {
  try {
    const ct = await ChargeType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!ct) return res.status(404).json({ error: 'Não encontrado' });
    res.json(ct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteChargeType = async (req, res) => {
  try {
    await ChargeType.findByIdAndDelete(req.params.id);
    res.json({ message: 'Removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Cria Gasolina e Drive se o banco estiver vazio
const seedDefaults = async () => {
  const count = await ChargeType.countDocuments();
  if (count === 0) {
    await ChargeType.insertMany([
      { name: 'Gasolina', value: 5.0, applicableTo: 'non-drivers', active: true },
      { name: 'Drive', value: 2.27, applicableTo: 'all', active: true },
    ]);
    console.log('ChargeTypes padrão criados: Gasolina, Drive');
  }
};

module.exports = { listChargeTypes, createChargeType, updateChargeType, deleteChargeType, seedDefaults };

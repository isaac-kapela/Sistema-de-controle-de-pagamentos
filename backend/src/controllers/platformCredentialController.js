const PlatformCredential = require('../models/PlatformCredential');

exports.list = async (req, res) => {
  try {
    const { search, categoria } = req.query;
    const filter = {};
    if (search) filter.plataforma = { $regex: search, $options: 'i' };
    if (categoria) filter.categoria = categoria;
    const items = await PlatformCredential.find(filter).sort({ categoria: 1, plataforma: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const item = await PlatformCredential.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const item = await PlatformCredential.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: 'Credencial não encontrada' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const item = await PlatformCredential.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Credencial não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

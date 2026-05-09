const CantinaProduct = require('../models/CantinaProduct');
const CantinaOrder = require('../models/CantinaOrder');

// ─── Produtos ────────────────────────────────────────────────

exports.listProducts = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { active: true };
    const products = await CantinaProduct.find(filter).sort({ category: 1, name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, price, category } = req.body;
    const product = await CantinaProduct.create({ name, price, category });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { name, price, category, active } = req.body;
    const product = await CantinaProduct.findByIdAndUpdate(
      req.params.id,
      { name, price, category, active },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await CantinaProduct.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Pedidos (Vendas) ────────────────────────────────────────

exports.listOrders = async (req, res) => {
  try {
    const orders = await CantinaOrder.find().sort({ createdAt: -1 }).limit(200);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { items, paymentMethod, buyerName, notes } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'A venda deve ter ao menos um item' });
    }
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await CantinaOrder.create({ items, total, paymentMethod, buyerName, notes });
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await CantinaOrder.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'Venda não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

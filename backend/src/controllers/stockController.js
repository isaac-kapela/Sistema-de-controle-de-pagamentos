const StockItem    = require('../models/StockItem');
const StockCategory = require('../models/StockCategory');
const { sendStockAlertEmail } = require('../services/mailer');

// ── helpers ───────────────────────────────────────────────────────────────────

function itemStatus(item) {
  if (item.quantidade === 0) return 'esgotado';
  if (item.quantidade <= item.estoqueMinimo) return 'baixo';
  return 'normal';
}

async function alertarBaixoEstoque(item) {
  const status = itemStatus(item);
  if (status === 'normal') return;

  try {
    await sendStockAlertEmail([{ ...item.toObject(), status }]);
  } catch (err) {
    console.error('[Stock] Falha ao enviar alerta por email:', err.message);
  }
}

// ── controllers ───────────────────────────────────────────────────────────────

// GET /api/stock
const getItems = async (req, res) => {
  try {
    const { categoria, search } = req.query;
    const filter = {};
    if (categoria && categoria !== 'Todos') filter.categoria = categoria;
    if (search) filter.nome = { $regex: search, $options: 'i' };

    const items = await StockItem.find(filter).sort({ categoria: 1, nome: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar itens de estoque.' });
  }
};

// POST /api/stock
const createItem = async (req, res) => {
  try {
    const { nome, categoria, quantidade, unidade, estoqueMinimo, descricao } = req.body;
    const item = await StockItem.create({ nome, categoria, quantidade, unidade, estoqueMinimo, descricao });

    // Alerta imediato se já entrar com estoque baixo
    await alertarBaixoEstoque(item);

    res.status(201).json(item);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Erro ao criar item.' });
  }
};

// PUT /api/stock/:id
const updateItem = async (req, res) => {
  try {
    const { nome, categoria, quantidade, unidade, estoqueMinimo, descricao } = req.body;
    const item = await StockItem.findByIdAndUpdate(
      req.params.id,
      { nome, categoria, quantidade, unidade, estoqueMinimo, descricao },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ error: 'Item não encontrado.' });

    await alertarBaixoEstoque(item);

    res.json(item);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Erro ao atualizar item.' });
  }
};

// DELETE /api/stock/:id
const deleteItem = async (req, res) => {
  try {
    const item = await StockItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item não encontrado.' });
    res.json({ message: 'Item removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover item.' });
  }
};

// PATCH /api/stock/:id/adjust  — adiciona ou subtrai quantidade
const adjustQty = async (req, res) => {
  try {
    const delta = Number(req.body.delta);
    if (isNaN(delta)) return res.status(400).json({ error: 'Delta inválido.' });

    const item = await StockItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item não encontrado.' });

    item.quantidade = Math.max(0, item.quantidade + delta);
    await item.save();

    // Alerta se a quantidade caiu para nível crítico
    if (delta < 0) await alertarBaixoEstoque(item);

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ajustar quantidade.' });
  }
};

// POST /api/stock/alert  — envia alerta manual para itens com estoque baixo/esgotado
const sendAlert = async (req, res) => {
  try {
    // ids opcionais — se não enviados, alerta todos os itens em estado crítico
    const { ids } = req.body;
    const filter = ids && ids.length > 0
      ? { _id: { $in: ids } }
      : {};

    const items = await StockItem.find(filter);
    const criticos = items.filter(i => itemStatus(i) !== 'normal');

    if (criticos.length === 0) {
      return res.json({ message: 'Nenhum item em estado crítico.', sent: 0 });
    }

    const payload = criticos.map(i => ({ ...i.toObject(), status: itemStatus(i) }));
    await sendStockAlertEmail(payload);

    res.json({ message: 'Alerta enviado.', sent: criticos.length });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar alerta.' });
  }
};

// ── categorias ────────────────────────────────────────────────────────────────

// GET /api/stock/categories
const getCategories = async (req, res) => {
  try {
    const cats = await StockCategory.find().sort({ nome: 1 });
    // Inclui contagem de itens por categoria
    const counts = await StockItem.aggregate([
      { $group: { _id: '$categoria', total: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map(c => [c._id, c.total]));
    res.json(cats.map(c => ({ ...c.toJSON(), itemCount: countMap[c.nome] || 0 })));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar categorias.' });
  }
};

// POST /api/stock/categories
const createCategory = async (req, res) => {
  try {
    const nome = req.body.nome?.trim();
    if (!nome) return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });

    const cat = await StockCategory.create({ nome });
    res.status(201).json({ ...cat.toJSON(), itemCount: 0 });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Categoria já existe.' });
    res.status(500).json({ error: 'Erro ao criar categoria.' });
  }
};

// DELETE /api/stock/categories/:id
const deleteCategory = async (req, res) => {
  try {
    const cat = await StockCategory.findById(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Categoria não encontrada.' });

    const inUse = await StockItem.countDocuments({ categoria: cat.nome });
    if (inUse > 0) {
      return res.status(409).json({
        error: `Essa categoria está sendo usada por ${inUse} item(s). Reatribua os itens antes de excluir.`,
      });
    }

    await cat.deleteOne();
    res.json({ message: 'Categoria removida.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover categoria.' });
  }
};

module.exports = { getItems, createItem, updateItem, deleteItem, adjustQty, sendAlert, getCategories, createCategory, deleteCategory };

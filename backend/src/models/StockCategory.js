const mongoose = require('mongoose');

const stockCategorySchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockCategory', stockCategorySchema);

// Categorias iniciais — inseridas automaticamente se a coleção estiver vazia
const DEFAULTS = ['Cola', 'Fitas', 'Fixadores', 'Madeira', 'Eletrônicos', 'Ferramentas', 'Papel', 'Outros'];

async function seedCategories() {
  const Model = mongoose.model('StockCategory');
  const count = await Model.countDocuments();
  if (count === 0) {
    await Model.insertMany(DEFAULTS.map((nome) => ({ nome })));
    console.log('[StockCategory] Categorias padrão criadas.');
  }
}

module.exports.seedCategories = seedCategories;

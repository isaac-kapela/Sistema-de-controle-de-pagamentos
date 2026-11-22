const ImportantContact = require('../models/ImportantContact');

// Lista contatos com busca e filtros
exports.list = async (req, res) => {
  try {
    const { search, categoria, organizacao } = req.query;
    const filter = {};

    if (categoria) {
      filter.categoria = categoria;
    }

    if (organizacao) {
      filter.organizacao = organizacao;
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { nome: { $regex: term, $options: 'i' } },
        { organizacao: { $regex: term, $options: 'i' } },
        { funcao: { $regex: term, $options: 'i' } },
        { contato: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { obs: { $regex: term, $options: 'i' } },
        { categoria: { $regex: term, $options: 'i' } },
      ];
    }

    const contacts = await ImportantContact.find(filter).sort({ organizacao: 1, nome: 1 });
    
    // Obter todas as categorias e organizações existentes para filtros rápidos
    const allContacts = await ImportantContact.find({}, 'categoria organizacao');
    const categorias = [...new Set(allContacts.map((c) => c.categoria).filter(Boolean))].sort();
    const organizacoes = [...new Set(allContacts.map((c) => c.organizacao).filter(Boolean))].sort();

    res.json({
      contacts,
      total: contacts.length,
      categorias,
      organizacoes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Criação de contato
exports.create = async (req, res) => {
  try {
    const { nome, contato, email, organizacao, funcao, categoria, obs, responsavel } = req.body;

    if (!nome || !contato || !organizacao || !funcao) {
      return res.status(400).json({
        error: 'Nome, contato, organização e função são obrigatórios.',
      });
    }

    const item = await ImportantContact.create({
      nome,
      contato,
      email: email || '',
      organizacao,
      funcao,
      categoria: categoria || 'Geral',
      obs: obs || '',
      responsavel: responsavel || '',
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Atualização de contato
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, contato, email, organizacao, funcao, categoria, obs, responsavel } = req.body;

    const item = await ImportantContact.findByIdAndUpdate(
      id,
      {
        nome,
        contato,
        email: email || '',
        organizacao,
        funcao,
        categoria: categoria || 'Geral',
        obs: obs || '',
        responsavel: responsavel || '',
      },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Remoção de contato
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await ImportantContact.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

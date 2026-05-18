const Member = require('../models/Member');

// GET /api/members
async function listMembers(req, res) {
  try {
    const { search = '' } = req.query;
    const filter = { ativo: true };
    if (search) {
      filter.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { cpf: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { numeroMatricula: { $regex: search, $options: 'i' } },
        { curso: { $regex: search, $options: 'i' } },
      ];
    }
    const members = await Member.find(filter).sort({ nome: 1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar membros' });
  }
}

// GET /api/members/:id
async function getMember(req, res) {
  try {
    const member = await Member.findOne({ _id: req.params.id, ativo: true });
    if (!member) return res.status(404).json({ error: 'Membro não encontrado' });
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar membro' });
  }
}

// POST /api/members
async function createMember(req, res) {
  try {
    const member = await Member.create(req.body);
    res.status(201).json(member);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'CPF já cadastrado' });
    }
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Erro ao cadastrar membro' });
  }
}

// PUT /api/members/:id
async function updateMember(req, res) {
  try {
    const member = await Member.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!member) return res.status(404).json({ error: 'Membro não encontrado' });
    res.json(member);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'CPF já cadastrado' });
    }
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Erro ao atualizar membro' });
  }
}

// DELETE /api/members/:id
async function deleteMember(req, res) {
  try {
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { ativo: false },
      { new: true }
    );
    if (!member) return res.status(404).json({ error: 'Membro não encontrado' });
    res.json({ message: 'Membro removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover membro' });
  }
}

function gerarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// POST /api/members/:id/generate-code
async function generateAccessCode(req, res) {
  try {
    let codigo;
    let tentativas = 0;
    do {
      codigo = gerarCodigo();
      tentativas++;
    } while (
      tentativas < 10 &&
      await Member.exists({ codigoAcesso: codigo })
    );

    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { codigoAcesso: codigo },
      { new: true }
    );
    if (!member) return res.status(404).json({ error: 'Membro não encontrado' });
    res.json({ codigoAcesso: member.codigoAcesso, nome: member.nome });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar código' });
  }
}

// POST /api/members/validate-code  (público)
async function validateAccessCode(req, res) {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ error: 'Código obrigatório' });

    const member = await Member.findOne({
      codigoAcesso: codigo.trim().toUpperCase(),
      ativo: true,
      tipoMembro: 'membro',
    });
    if (!member) return res.status(404).json({ error: 'Código inválido' });

    res.json({ _id: member._id, nome: member.nome, area: member.area });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao validar código' });
  }
}

module.exports = {
  listMembers, getMember, createMember, updateMember, deleteMember,
  generateAccessCode, validateAccessCode,
};

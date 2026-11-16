const CashMovement = require('../models/CashMovement');
const Purchase = require('../models/Purchase');
const Member = require('../models/Member');
const User = require('../models/User');

const CATEGORIAS_ENTRADA = [
  'Ajuste de Saldo / Caixa',
  'Patrocínio',
  'Arrecadação / Rifa',
  'Auxílio Financeiro / UFJF',
  'Mensalidade',
  'Cantina',
  'Doação',
  'Premiação / Competição',
  'Venda de Produtos / Merch',
  'Outras Entradas',
];

const CATEGORIAS_SAIDA = [
  'Ajuste de Saldo / Caixa',
  'Compra de Componentes Eletrônicos',
  'Materiais de Fabricação / Estrutura',
  'Ferramentas e Equipamentos',
  'Transporte e Logística',
  'Hospedagem',
  'Alimentação',
  'Inscrição em Competição',
  'Marketing e Divulgação',
  'Material de Escritório',
  'Manutenção e Reparos',
  'Outros Custos Operacionais',
];

const CATEGORIAS_COMPRA = [
  'Eletrônica',
  'Estrutura',
  'Fabricação',
  'Ferramentas',
  'Escritório',
  'Transporte',
  'Alimentação',
  'Marketing',
  'EPI / Segurança',
  'Outro',
];

const FORMAS_PAGAMENTO = [
  'Pix',
  'Dinheiro',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Transferência Bancária',
  'Boleto',
  'Outro',
];

const STATUS_ENTREGA = [
  { value: 'aguardando_envio', label: 'Aguardando envio' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'em_transporte', label: 'Em transporte' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'atrasado', label: 'Atrasado' },
];

// Helper: formata valor monetário
const fmtMoney = (val) => Number(val || 0).toFixed(2);

// ── GET /api/financial/summary ────────────────────────────────────────────────
exports.getSummary = async (req, res) => {
  try {
    const { year, month } = req.query;

    // Movimentações ativas
    const activeMovements = await CashMovement.find({ status: 'ativo' });
    const activePurchases = await Purchase.find({ status: 'ativo' });

    // 1. Saldo atual, Total entradas, Total despesas (geral)
    let totalEntradas = 0;
    let totalDespesas = 0;

    activeMovements.forEach((m) => {
      if (m.tipo === 'entrada') {
        totalEntradas += m.valor;
      } else if (m.tipo === 'saida') {
        totalDespesas += m.valor;
      }
    });

    const saldoAtual = +(totalEntradas - totalDespesas).toFixed(2);
    totalEntradas = +totalEntradas.toFixed(2);
    totalDespesas = +totalDespesas.toFixed(2);

    // 2. Compras pendentes financeiramente (valor total - valor pago)
    let comprasPendentesValor = 0;
    let comprasAguardandoEntrega = 0;
    let comprasAtrasadasCount = 0;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    activePurchases.forEach((p) => {
      // Comprometido não pago
      const restante = Math.max(0, (Number(p.valorTotal) || 0) - (Number(p.valorPago) || 0));
      if (p.statusPagamento !== 'pago' && restante > 0) {
        comprasPendentesValor += restante;
      }

      // Entrega pendente
      if (p.statusEntrega !== 'entregue') {
        comprasAguardandoEntrega += 1;
        if (p.dataPrevisaoEntrega) {
          const prev = new Date(p.dataPrevisaoEntrega);
          prev.setHours(0, 0, 0, 0);
          if (prev < hoje) {
            comprasAtrasadasCount += 1;
          }
        }
      }
    });

    comprasPendentesValor = +comprasPendentesValor.toFixed(2);

    // 3. Evolução mensal (últimos 12 meses ou ano especificado)
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const monthlyData = [];

    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];

    for (let m = 0; m < 12; m++) {
      const start = new Date(targetYear, m, 1);
      const end = new Date(targetYear, m + 1, 0, 23, 59, 59, 999);

      const mMovements = activeMovements.filter((mov) => {
        const d = new Date(mov.data);
        return d >= start && d <= end;
      });

      const entradas = mMovements
        .filter((mov) => mov.tipo === 'entrada')
        .reduce((sum, mov) => sum + mov.valor, 0);
      const saidas = mMovements
        .filter((mov) => mov.tipo === 'saida')
        .reduce((sum, mov) => sum + mov.valor, 0);

      monthlyData.push({
        monthIndex: m + 1,
        monthName: monthNames[m],
        ano: targetYear,
        entradas: +entradas.toFixed(2),
        saidas: +saidas.toFixed(2),
        balanco: +(entradas - saidas).toFixed(2),
      });
    }

    // 4. Distribuição por categorias de saídas e entradas
    const despesasPorCategoria = {};
    const entradasPorCategoria = {};

    activeMovements.forEach((mov) => {
      if (mov.tipo === 'saida') {
        despesasPorCategoria[mov.categoria] = (despesasPorCategoria[mov.categoria] || 0) + mov.valor;
      } else {
        entradasPorCategoria[mov.categoria] = (entradasPorCategoria[mov.categoria] || 0) + mov.valor;
      }
    });

    const categoryExpenses = Object.entries(despesasPorCategoria).map(([categoria, total]) => ({
      categoria,
      total: +total.toFixed(2),
    })).sort((a, b) => b.total - a.total);

    const categoryRevenues = Object.entries(entradasPorCategoria).map(([categoria, total]) => ({
      categoria,
      total: +total.toFixed(2),
    })).sort((a, b) => b.total - a.total);

    res.json({
      saldoAtual,
      totalEntradas,
      totalDespesas,
      comprasPendentesValor,
      comprasAguardandoEntrega,
      comprasAtrasadasCount,
      monthlyData,
      categoryExpenses,
      categoryRevenues,
      totalMovimentacoes: activeMovements.length,
      totalCompras: activePurchases.length,
    });
  } catch (err) {
    console.error('Erro ao calcular resumo financeiro:', err);
    res.status(500).json({ error: 'Erro ao calcular indicadores financeiros.' });
  }
};

// ── GET /api/financial/meta ──────────────────────────────────────────────────
exports.getMeta = async (req, res) => {
  try {
    // Buscar membros e usuários para compor lista de pessoas
    const [members, users] = await Promise.all([
      Member.find({ ativo: true }).select('nome area').sort({ nome: 1 }),
      User.find({ active: true }).select('name').sort({ name: 1 }),
    ]);

    const namesSet = new Set();
    members.forEach((m) => { if (m.nome) namesSet.add(m.nome.trim()); });
    users.forEach((u) => { if (u.name) namesSet.add(u.name.trim()); });

    const responsaveis = Array.from(namesSet).sort();

    res.json({
      categoriasEntrada: CATEGORIAS_ENTRADA,
      categoriasSaida: CATEGORIAS_SAIDA,
      categoriasCompra: CATEGORIAS_COMPRA,
      formasPagamento: FORMAS_PAGAMENTO,
      statusEntrega: STATUS_ENTREGA,
      responsaveis,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar metadados.' });
  }
};

// ── MOVIMENTAÇÕES DE CAIXA ────────────────────────────────────────────────────

// GET /api/financial/movements
exports.getMovements = async (req, res) => {
  try {
    const {
      tipo,
      categoria,
      responsavel,
      status = 'ativo',
      startDate,
      endDate,
      month,
      year,
      search,
    } = req.query;

    const filter = {};

    if (status && status !== 'todos') {
      filter.status = status;
    }

    if (tipo && tipo !== 'todos') {
      filter.tipo = tipo;
    }

    if (categoria && categoria !== 'todas') {
      filter.categoria = categoria;
    }

    if (responsavel && responsavel !== 'todos') {
      filter.responsavel = responsavel;
    }

    if (search) {
      filter.$or = [
        { descricao: { $regex: search, $options: 'i' } },
        { observacoes: { $regex: search, $options: 'i' } },
        { responsavel: { $regex: search, $options: 'i' } },
        { categoria: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      filter.data = {};
      if (startDate) filter.data.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.data.$lte = end;
      }
    } else if (month && year) {
      const m = parseInt(month, 10) - 1;
      const y = parseInt(year, 10);
      filter.data = {
        $gte: new Date(y, m, 1),
        $lte: new Date(y, m + 1, 0, 23, 59, 59, 999),
      };
    } else if (year) {
      const y = parseInt(year, 10);
      filter.data = {
        $gte: new Date(y, 0, 1),
        $lte: new Date(y, 11, 31, 23, 59, 59, 999),
      };
    }

    const movements = await CashMovement.find(filter)
      .populate('compraId', 'produto fornecedor statusPagamento statusEntrega')
      .sort({ data: -1, createdAt: -1 });

    res.json(movements);
  } catch (err) {
    console.error('Erro ao buscar movimentações:', err);
    res.status(500).json({ error: 'Erro ao buscar movimentações.' });
  }
};

// POST /api/financial/movements
exports.createMovement = async (req, res) => {
  try {
    const {
      descricao,
      tipo,
      categoria,
      valor,
      data,
      formaPagamento,
      responsavel,
      observacoes,
      comprovanteUrl,
      autor, // quem está criando
    } = req.body;

    if (!descricao || !tipo || !categoria || !valor || !responsavel) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    const autorNome = autor || responsavel || 'Admin';
    const numValor = Math.abs(Number(valor));

    const movement = new CashMovement({
      descricao,
      tipo,
      categoria,
      valor: numValor,
      data: data ? new Date(data) : new Date(),
      formaPagamento: formaPagamento || 'Pix',
      responsavel,
      observacoes: observacoes || '',
      comprovanteUrl: comprovanteUrl || '',
      criadoPor: autorNome,
      atualizadoPor: autorNome,
      historico: [
        {
          data: new Date(),
          autor: autorNome,
          acao: 'Registro criado',
          detalhes: `Criou movimentação de ${tipo} no valor de R$ ${fmtMoney(numValor)} (Categoria: ${categoria})`,
          valoresNovos: { descricao, tipo, categoria, valor: numValor, responsavel, formaPagamento },
        },
      ],
    });

    await movement.save();
    res.status(201).json(movement);
  } catch (err) {
    console.error('Erro ao criar movimentação:', err);
    res.status(500).json({ error: err.message || 'Erro ao registrar movimentação.' });
  }
};

// PUT /api/financial/movements/:id
exports.updateMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      descricao,
      tipo,
      categoria,
      valor,
      data,
      formaPagamento,
      responsavel,
      observacoes,
      comprovanteUrl,
      autor,
    } = req.body;

    const movement = await CashMovement.findById(id);
    if (!movement) {
      return res.status(404).json({ error: 'Movimentação não encontrada.' });
    }

    if (movement.status === 'cancelado') {
      return res.status(400).json({ error: 'Não é possível alterar uma movimentação cancelada.' });
    }

    const autorNome = autor || responsavel || 'Admin';
    const numValor = valor !== undefined ? Math.abs(Number(valor)) : movement.valor;

    const valoresAnteriores = {
      descricao: movement.descricao,
      tipo: movement.tipo,
      categoria: movement.categoria,
      valor: movement.valor,
      data: movement.data,
      formaPagamento: movement.formaPagamento,
      responsavel: movement.responsavel,
      observacoes: movement.observacoes,
      comprovanteUrl: movement.comprovanteUrl,
    };

    const changes = [];
    if (descricao && descricao !== movement.descricao) changes.push(`Descrição: "${movement.descricao}" → "${descricao}"`);
    if (tipo && tipo !== movement.tipo) changes.push(`Tipo: "${movement.tipo}" → "${tipo}"`);
    if (categoria && categoria !== movement.categoria) changes.push(`Categoria: "${movement.categoria}" → "${categoria}"`);
    if (numValor !== movement.valor) changes.push(`Valor: R$ ${fmtMoney(movement.valor)} → R$ ${fmtMoney(numValor)}`);
    if (formaPagamento && formaPagamento !== movement.formaPagamento) changes.push(`Forma de Pagamento: "${movement.formaPagamento}" → "${formaPagamento}"`);
    if (responsavel && responsavel !== movement.responsavel) changes.push(`Responsável: "${movement.responsavel}" → "${responsavel}"`);

    if (descricao !== undefined) movement.descricao = descricao;
    if (tipo !== undefined) movement.tipo = tipo;
    if (categoria !== undefined) movement.categoria = categoria;
    if (valor !== undefined) movement.valor = numValor;
    if (data !== undefined) movement.data = new Date(data);
    if (formaPagamento !== undefined) movement.formaPagamento = formaPagamento;
    if (responsavel !== undefined) movement.responsavel = responsavel;
    if (observacoes !== undefined) movement.observacoes = observacoes;
    if (comprovanteUrl !== undefined) movement.comprovanteUrl = comprovanteUrl;

    movement.atualizadoPor = autorNome;
    movement.historico.push({
      data: new Date(),
      autor: autorNome,
      acao: 'Atualização de movimentação',
      detalhes: changes.length > 0 ? changes.join(' | ') : 'Edição dos dados da movimentação',
      valoresAnteriores,
      valoresNovos: {
        descricao: movement.descricao,
        tipo: movement.tipo,
        categoria: movement.categoria,
        valor: movement.valor,
        data: movement.data,
        formaPagamento: movement.formaPagamento,
        responsavel: movement.responsavel,
      },
    });

    await movement.save();
    res.json(movement);
  } catch (err) {
    console.error('Erro ao atualizar movimentação:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar movimentação.' });
  }
};

// POST /api/financial/movements/:id/cancel
exports.cancelMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const { justificativa, autor } = req.body;

    if (!justificativa || !justificativa.trim()) {
      return res.status(400).json({ error: 'A justificativa de cancelamento é obrigatória.' });
    }

    const movement = await CashMovement.findById(id);
    if (!movement) {
      return res.status(404).json({ error: 'Movimentação não encontrada.' });
    }

    if (movement.status === 'cancelado') {
      return res.status(400).json({ error: 'Esta movimentação já está cancelada.' });
    }

    const autorNome = autor || 'Admin';

    movement.status = 'cancelado';
    movement.justificativaCancelamento = justificativa.trim();
    movement.canceladoPor = autorNome;
    movement.canceladoEm = new Date();
    movement.atualizadoPor = autorNome;

    movement.historico.push({
      data: new Date(),
      autor: autorNome,
      acao: 'Cancelamento lógico',
      detalhes: `Movimentação cancelada. Motivo: ${justificativa.trim()}`,
      valoresAnteriores: { status: 'ativo', valor: movement.valor },
      valoresNovos: { status: 'cancelado', valor: movement.valor },
    });

    await movement.save();
    res.json(movement);
  } catch (err) {
    console.error('Erro ao cancelar movimentação:', err);
    res.status(500).json({ error: 'Erro ao cancelar movimentação.' });
  }
};

// ── CONTROLE DE COMPRAS ───────────────────────────────────────────────────────

// GET /api/financial/purchases
exports.getPurchases = async (req, res) => {
  try {
    const {
      statusPagamento,
      statusEntrega,
      categoria,
      comprador,
      quickFilter,
      search,
      status = 'ativo',
    } = req.query;

    const filter = {};

    if (status && status !== 'todos') {
      filter.status = status;
    }

    if (statusPagamento && statusPagamento !== 'todos') {
      filter.statusPagamento = statusPagamento;
    }

    if (statusEntrega && statusEntrega !== 'todos') {
      filter.statusEntrega = statusEntrega;
    }

    if (categoria && categoria !== 'todas') {
      filter.categoria = categoria;
    }

    if (comprador && comprador !== 'todos') {
      filter.comprador = comprador;
    }

    if (search) {
      filter.$or = [
        { produto: { $regex: search, $options: 'i' } },
        { descricao: { $regex: search, $options: 'i' } },
        { fornecedor: { $regex: search, $options: 'i' } },
        { comprador: { $regex: search, $options: 'i' } },
        { codigoRastreamento: { $regex: search, $options: 'i' } },
      ];
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Quick filters específicos
    if (quickFilter === 'atrasadas') {
      filter.statusEntrega = { $ne: 'entregue' };
      filter.dataPrevisaoEntrega = { $lt: hoje, $ne: null };
    } else if (quickFilter === 'proximas') {
      const in5Days = new Date(hoje);
      in5Days.setDate(in5Days.getDate() + 5);
      in5Days.setHours(23, 59, 59, 999);
      filter.statusEntrega = { $ne: 'entregue' };
      filter.dataPrevisaoEntrega = { $gte: hoje, $lte: in5Days };
    } else if (quickFilter === 'aguardando_pagamento') {
      filter.statusPagamento = { $in: ['pendente', 'parcial'] };
    } else if (quickFilter === 'aguardando_envio') {
      filter.statusEntrega = 'aguardando_envio';
    } else if (quickFilter === 'em_transporte') {
      filter.statusEntrega = { $in: ['enviado', 'em_transporte'] };
    } else if (quickFilter === 'entregues') {
      filter.statusEntrega = 'entregue';
    }

    const purchases = await Purchase.find(filter)
      .populate('movimentacaoId')
      .sort({ dataCompra: -1, createdAt: -1 });

    res.json(purchases);
  } catch (err) {
    console.error('Erro ao listar compras:', err);
    res.status(500).json({ error: 'Erro ao buscar compras.' });
  }
};

// GET /api/financial/purchases/:id
exports.getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id).populate('movimentacaoId');
    if (!purchase) {
      return res.status(404).json({ error: 'Compra não encontrada.' });
    }
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar detalhes da compra.' });
  }
};

// POST /api/financial/purchases
exports.createPurchase = async (req, res) => {
  try {
    const {
      produto,
      descricao,
      categoria,
      quantidade,
      valorUnitario,
      valorTotal,
      fornecedor,
      tipoLoja,
      linkProduto,
      dataCompra,
      formaPagamento,
      statusPagamento,
      valorPago,
      dataPrevisaoEntrega,
      statusEntrega,
      codigoRastreamento,
      observacoesEntrega,
      comprador,
      autor,
      gerarSaidaCaixa, // boolean: se true gera saída automática no caixa para o valorPago
    } = req.body;

    if (!produto || !comprador) {
      return res.status(400).json({ error: 'Nome do produto e responsável pela compra são obrigatórios.' });
    }

    const autorNome = autor || comprador || 'Admin';
    const numQtd = Number(quantidade) > 0 ? Number(quantidade) : 1;
    const numUnit = Number(valorUnitario) >= 0 ? Number(valorUnitario) : 0;
    const calcTotal = Number(valorTotal) > 0 ? Number(valorTotal) : +(numQtd * numUnit).toFixed(2);
    let numPago = Number(valorPago) >= 0 ? Number(valorPago) : 0;

    // Ajusta status de pagamento conforme valores se não informado explicitamente
    let stPagamento = statusPagamento || 'pendente';
    if (!statusPagamento) {
      if (numPago >= calcTotal && calcTotal > 0) stPagamento = 'pago';
      else if (numPago > 0) stPagamento = 'parcial';
      else stPagamento = 'pendente';
    } else if (stPagamento === 'pago' && numPago === 0) {
      numPago = calcTotal;
    }

    const purchase = new Purchase({
      produto,
      descricao: descricao || '',
      categoria: categoria || 'Geral',
      quantidade: numQtd,
      valorUnitario: numUnit,
      valorTotal: calcTotal,
      fornecedor: fornecedor || '',
      tipoLoja: tipoLoja === 'fisica' ? 'fisica' : 'online',
      linkProduto: linkProduto || '',
      dataCompra: dataCompra ? new Date(dataCompra) : new Date(),
      formaPagamento: formaPagamento || 'Pix',
      statusPagamento: stPagamento,
      valorPago: numPago,
      dataPrevisaoEntrega: dataPrevisaoEntrega ? new Date(dataPrevisaoEntrega) : null,
      statusEntrega: statusEntrega || 'aguardando_envio',
      codigoRastreamento: codigoRastreamento || '',
      observacoesEntrega: observacoesEntrega || '',
      comprador,
      criadoPor: autorNome,
      atualizadoPor: autorNome,
      historico: [
        {
          data: new Date(),
          autor: autorNome,
          acao: 'Compra cadastrada',
          detalhes: `Registrou compra de ${numQtd}x ${produto} no total de R$ ${fmtMoney(calcTotal)} (${stPagamento})`,
          valoresNovos: {
            produto,
            quantidade: numQtd,
            valorUnitario: numUnit,
            valorTotal: calcTotal,
            statusPagamento: stPagamento,
            valorPago: numPago,
            statusEntrega: statusEntrega || 'aguardando_envio',
          },
        },
      ],
    });

    await purchase.save();

    // Se solicitado gerar saída financeira no caixa para o valor já pago
    if (gerarSaidaCaixa && numPago > 0) {
      const movement = new CashMovement({
        descricao: `Compra: ${produto} (${fornecedor ? fornecedor + ' - ' : ''}${numQtd} un)`,
        tipo: 'saida',
        categoria: categoria || 'Materiais de Fabricação / Estrutura',
        valor: numPago,
        data: dataCompra ? new Date(dataCompra) : new Date(),
        formaPagamento: formaPagamento || 'Pix',
        responsavel: comprador,
        observacoes: `Saída gerada automaticamente pela compra #${purchase._id}. ${descricao || ''}`.trim(),
        comprovanteUrl: linkProduto || '',
        compraId: purchase._id,
        criadoPor: autorNome,
        atualizadoPor: autorNome,
        historico: [
          {
            data: new Date(),
            autor: autorNome,
            acao: 'Saída vinculada gerada automaticamente',
            detalhes: `Gerado a partir do cadastro da compra "${produto}"`,
            valoresNovos: { valor: numPago, responsavel: comprador },
          },
        ],
      });
      await movement.save();

      purchase.movimentacaoId = movement._id;
      await purchase.save();
    }

    res.status(201).json(purchase);
  } catch (err) {
    console.error('Erro ao cadastrar compra:', err);
    res.status(500).json({ error: err.message || 'Erro ao cadastrar compra.' });
  }
};

// PUT /api/financial/purchases/:id
exports.updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      produto,
      descricao,
      categoria,
      quantidade,
      valorUnitario,
      valorTotal,
      fornecedor,
      tipoLoja,
      linkProduto,
      dataCompra,
      formaPagamento,
      statusPagamento,
      valorPago,
      dataPrevisaoEntrega,
      dataEntrega,
      statusEntrega,
      codigoRastreamento,
      observacoesEntrega,
      recebidoPor,
      comprador,
      autor,
      ajustarCaixa, // boolean: se true atualiza a movimentação de saída vinculada se existir
    } = req.body;

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json({ error: 'Compra não encontrada.' });
    }

    if (purchase.status === 'cancelado') {
      return res.status(400).json({ error: 'Não é possível alterar uma compra cancelada.' });
    }

    const autorNome = autor || comprador || 'Admin';

    const valoresAnteriores = {
      produto: purchase.produto,
      categoria: purchase.categoria,
      quantidade: purchase.quantidade,
      valorUnitario: purchase.valorUnitario,
      valorTotal: purchase.valorTotal,
      valorPago: purchase.valorPago,
      tipoLoja: purchase.tipoLoja,
      statusPagamento: purchase.statusPagamento,
      statusEntrega: purchase.statusEntrega,
      dataPrevisaoEntrega: purchase.dataPrevisaoEntrega,
      dataEntrega: purchase.dataEntrega,
      recebidoPor: purchase.recebidoPor,
      comprador: purchase.comprador,
    };

    const changes = [];
    if (produto && produto !== purchase.produto) changes.push(`Produto: "${purchase.produto}" → "${produto}"`);
    if (quantidade !== undefined && Number(quantidade) !== purchase.quantidade) changes.push(`Qtd: ${purchase.quantidade} → ${quantidade}`);
    if (valorTotal !== undefined && Number(valorTotal) !== purchase.valorTotal) changes.push(`Total: R$ ${fmtMoney(purchase.valorTotal)} → R$ ${fmtMoney(valorTotal)}`);
    if (valorPago !== undefined && Number(valorPago) !== purchase.valorPago) changes.push(`Pago: R$ ${fmtMoney(purchase.valorPago)} → R$ ${fmtMoney(valorPago)}`);
    if (tipoLoja && tipoLoja !== purchase.tipoLoja) changes.push(`Tipo Loja: ${purchase.tipoLoja} → ${tipoLoja}`);
    if (statusPagamento && statusPagamento !== purchase.statusPagamento) changes.push(`Status Pagamento: ${purchase.statusPagamento} → ${statusPagamento}`);
    if (statusEntrega && statusEntrega !== purchase.statusEntrega) changes.push(`Status Entrega: ${purchase.statusEntrega} → ${statusEntrega}`);
    if (comprador && comprador !== purchase.comprador) changes.push(`Comprador: ${purchase.comprador} → ${comprador}`);

    if (produto !== undefined) purchase.produto = produto;
    if (descricao !== undefined) purchase.descricao = descricao;
    if (categoria !== undefined) purchase.categoria = categoria;
    if (quantidade !== undefined) purchase.quantidade = Number(quantidade);
    if (valorUnitario !== undefined) purchase.valorUnitario = Number(valorUnitario);
    if (valorTotal !== undefined) purchase.valorTotal = Number(valorTotal);
    if (fornecedor !== undefined) purchase.fornecedor = fornecedor;
    if (tipoLoja !== undefined) purchase.tipoLoja = tipoLoja === 'fisica' ? 'fisica' : 'online';
    if (linkProduto !== undefined) purchase.linkProduto = linkProduto;
    if (dataCompra !== undefined) purchase.dataCompra = new Date(dataCompra);
    if (formaPagamento !== undefined) purchase.formaPagamento = formaPagamento;
    if (statusPagamento !== undefined) purchase.statusPagamento = statusPagamento;
    if (valorPago !== undefined) purchase.valorPago = Number(valorPago);
    if (dataPrevisaoEntrega !== undefined) purchase.dataPrevisaoEntrega = dataPrevisaoEntrega ? new Date(dataPrevisaoEntrega) : null;
    if (dataEntrega !== undefined) purchase.dataEntrega = dataEntrega ? new Date(dataEntrega) : null;
    if (statusEntrega !== undefined) purchase.statusEntrega = statusEntrega;
    if (codigoRastreamento !== undefined) purchase.codigoRastreamento = codigoRastreamento;
    if (observacoesEntrega !== undefined) purchase.observacoesEntrega = observacoesEntrega;
    if (recebidoPor !== undefined) purchase.recebidoPor = recebidoPor;
    if (comprador !== undefined) purchase.comprador = comprador;

    // Se marcou como entregue e não tem data de entrega, coloca agora
    if (purchase.statusEntrega === 'entregue' && !purchase.dataEntrega) {
      purchase.dataEntrega = new Date();
      if (!purchase.recebidoPor) purchase.recebidoPor = autorNome;
    }

    purchase.atualizadoPor = autorNome;
    purchase.historico.push({
      data: new Date(),
      autor: autorNome,
      acao: 'Atualização da compra',
      detalhes: changes.length > 0 ? changes.join(' | ') : 'Edição dos dados da compra',
      valoresAnteriores,
      valoresNovos: {
        produto: purchase.produto,
        valorTotal: purchase.valorTotal,
        valorPago: purchase.valorPago,
        statusPagamento: purchase.statusPagamento,
        statusEntrega: purchase.statusEntrega,
        recebidoPor: purchase.recebidoPor,
      },
    });

    await purchase.save();

    // Sincroniza saída no caixa se houver movimentação vinculada ou se precisar criar
    if (purchase.movimentacaoId) {
      const mov = await CashMovement.findById(purchase.movimentacaoId);
      if (mov && mov.status === 'ativo') {
        const movOldVal = mov.valor;
        mov.valor = purchase.valorPago;
        mov.descricao = `Compra: ${purchase.produto} (${purchase.fornecedor ? purchase.fornecedor + ' - ' : ''}${purchase.quantidade} un)`;
        mov.responsavel = purchase.comprador;
        mov.formaPagamento = purchase.formaPagamento;
        mov.categoria = purchase.categoria || mov.categoria;
        mov.atualizadoPor = autorNome;
        mov.historico.push({
          data: new Date(),
          autor: autorNome,
          acao: 'Sincronização automática com Compra',
          detalhes: `Valor ajustado de R$ ${fmtMoney(movOldVal)} para R$ ${fmtMoney(purchase.valorPago)}`,
          valoresAnteriores: { valor: movOldVal },
          valoresNovos: { valor: purchase.valorPago },
        });
        await mov.save();
      }
    } else if (purchase.valorPago > 0 && ajustarCaixa !== false) {
      // Se não havia saída vinculada mas agora foi pago algum valor, cria a saída no caixa
      const movement = new CashMovement({
        descricao: `Compra: ${purchase.produto} (${purchase.fornecedor ? purchase.fornecedor + ' - ' : ''}${purchase.quantidade} un)`,
        tipo: 'saida',
        categoria: purchase.categoria || 'Materiais de Fabricação / Estrutura',
        valor: purchase.valorPago,
        data: purchase.dataCompra ? new Date(purchase.dataCompra) : new Date(),
        formaPagamento: purchase.formaPagamento || 'Pix',
        responsavel: purchase.comprador,
        observacoes: `Saída gerada por pagamento da compra #${purchase._id}. ${purchase.descricao || ''}`.trim(),
        comprovanteUrl: purchase.linkProduto || '',
        compraId: purchase._id,
        criadoPor: autorNome,
        atualizadoPor: autorNome,
        historico: [
          {
            data: new Date(),
            autor: autorNome,
            acao: 'Saída vinculada gerada por pagamento',
            detalhes: `Gerada a partir da atualização de pagamento da compra "${purchase.produto}"`,
            valoresNovos: { valor: purchase.valorPago, responsavel: purchase.comprador },
          },
        ],
      });
      await movement.save();
      purchase.movimentacaoId = movement._id;
      await purchase.save();
    }

    res.json(purchase);
  } catch (err) {
    console.error('Erro ao atualizar compra:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar compra.' });
  }
};

// PATCH /api/financial/purchases/:id/delivery
exports.updatePurchaseDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { statusEntrega, recebidoPor, dataEntrega, observacoesEntrega, autor } = req.body;

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json({ error: 'Compra não encontrada.' });
    }

    const autorNome = autor || 'Admin';
    const oldStatus = purchase.statusEntrega;

    purchase.statusEntrega = statusEntrega || 'entregue';
    if (purchase.statusEntrega === 'entregue') {
      purchase.dataEntrega = dataEntrega ? new Date(dataEntrega) : new Date();
      purchase.recebidoPor = recebidoPor || autorNome;
    }
    if (observacoesEntrega !== undefined) {
      purchase.observacoesEntrega = observacoesEntrega;
    }

    purchase.atualizadoPor = autorNome;
    purchase.historico.push({
      data: new Date(),
      autor: autorNome,
      acao: statusEntrega === 'entregue' ? 'Material recebido / entregue' : 'Status de entrega atualizado',
      detalhes: `Status de entrega alterado de "${oldStatus}" para "${purchase.statusEntrega}"${purchase.recebidoPor ? ` (Recebido por: ${purchase.recebidoPor})` : ''}`,
      valoresAnteriores: { statusEntrega: oldStatus },
      valoresNovos: { statusEntrega: purchase.statusEntrega, recebidoPor: purchase.recebidoPor, dataEntrega: purchase.dataEntrega },
    });

    await purchase.save();
    res.json(purchase);
  } catch (err) {
    console.error('Erro ao atualizar entrega da compra:', err);
    res.status(500).json({ error: 'Erro ao atualizar entrega.' });
  }
};

// POST /api/financial/adjust-balance
exports.adjustBalance = async (req, res) => {
  try {
    const { novoSaldo, data, responsavel, motivo, autor } = req.body;

    if (novoSaldo === undefined || novoSaldo === null || isNaN(Number(novoSaldo))) {
      return res.status(400).json({ error: 'Informe um valor numérico válido para o novo saldo.' });
    }

    if (!responsavel || !responsavel.trim()) {
      return res.status(400).json({ error: 'Informe o responsável pelo ajuste de caixa.' });
    }

    const autorNome = autor || responsavel || 'Admin';
    const numNovoSaldo = Number(Number(novoSaldo).toFixed(2));

    // Calcula o saldo atual ativo
    const activeMovements = await CashMovement.find({ status: 'ativo' });
    let totalEntradas = 0;
    let totalDespesas = 0;

    activeMovements.forEach((m) => {
      if (m.tipo === 'entrada') totalEntradas += m.valor;
      else if (m.tipo === 'saida') totalDespesas += m.valor;
    });

    const saldoAtual = +(totalEntradas - totalDespesas).toFixed(2);
    const diferenca = +(numNovoSaldo - saldoAtual).toFixed(2);

    if (diferenca === 0) {
      return res.json({
        message: 'O saldo atual já corresponde exatamente ao valor informado.',
        saldoAtual,
        novoSaldo: numNovoSaldo,
      });
    }

    const isEntrada = diferenca > 0;
    const valorMovimento = Math.abs(diferenca);
    const tipo = isEntrada ? 'entrada' : 'saida';
    const categoria = 'Ajuste de Saldo / Caixa';
    const justificativaTexto = motivo && motivo.trim() ? motivo.trim() : 'Definição ou conferência periódica de saldo';
    const descricao = `Ajuste de Saldo de Caixa (${isEntrada ? 'Acréscimo' : 'Redução'} de R$ ${fmtMoney(valorMovimento)})`;

    const movement = new CashMovement({
      descricao,
      tipo,
      categoria,
      valor: valorMovimento,
      data: data ? new Date(data) : new Date(),
      formaPagamento: 'Dinheiro',
      responsavel: responsavel.trim(),
      observacoes: `Ajuste manual de saldo. Saldo anterior: R$ ${fmtMoney(saldoAtual)} | Novo saldo: R$ ${fmtMoney(numNovoSaldo)}. Motivo: ${justificativaTexto}`,
      criadoPor: autorNome,
      atualizadoPor: autorNome,
      historico: [
        {
          data: new Date(),
          autor: autorNome,
          acao: 'Ajuste de Saldo de Caixa',
          detalhes: `Saldo ajustado de R$ ${fmtMoney(saldoAtual)} para R$ ${fmtMoney(numNovoSaldo)} (${isEntrada ? '+' : '-'}R$ ${fmtMoney(valorMovimento)}). Motivo: ${justificativaTexto}`,
          valoresAnteriores: { saldoAtual },
          valoresNovos: { novoSaldo: numNovoSaldo, diferenca, tipo },
        },
      ],
    });

    await movement.save();

    res.status(201).json({
      message: 'Saldo do caixa atualizado com sucesso.',
      movement,
      saldoAnterior: saldoAtual,
      novoSaldo: numNovoSaldo,
      diferenca,
    });
  } catch (err) {
    console.error('Erro ao ajustar saldo de caixa:', err);
    res.status(500).json({ error: err.message || 'Erro ao ajustar saldo de caixa.' });
  }
};

// POST /api/financial/purchases/:id/pay
exports.payPurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { valorPago, formaPagamento, responsavel, observacoes, autor } = req.body;

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json({ error: 'Compra não encontrada.' });
    }

    if (purchase.status === 'cancelado') {
      return res.status(400).json({ error: 'Não é possível registrar pagamento em uma compra cancelada.' });
    }

    const autorNome = autor || responsavel || purchase.comprador || 'Admin';
    const valorTotal = purchase.valorTotal;
    const numPago = valorPago !== undefined ? Math.max(0, Number(valorPago)) : valorTotal;

    const valorPagoAnterior = purchase.valorPago;
    const statusAnterior = purchase.statusPagamento;

    let novoStatus = 'pendente';
    if (numPago >= valorTotal && valorTotal > 0) novoStatus = 'pago';
    else if (numPago > 0) novoStatus = 'parcial';

    purchase.valorPago = numPago;
    purchase.statusPagamento = novoStatus;
    if (formaPagamento) purchase.formaPagamento = formaPagamento;
    purchase.atualizadoPor = autorNome;

    purchase.historico.push({
      data: new Date(),
      autor: autorNome,
      acao: 'Pagamento de compra registrado',
      detalhes: `Valor pago atualizado de R$ ${fmtMoney(valorPagoAnterior)} para R$ ${fmtMoney(numPago)} (Status: ${novoStatus})`,
      valoresAnteriores: { valorPago: valorPagoAnterior, statusPagamento: statusAnterior },
      valoresNovos: { valorPago: numPago, statusPagamento: novoStatus },
    });

    await purchase.save();

    // Sincroniza ou cria a saída no caixa
    if (purchase.movimentacaoId) {
      const mov = await CashMovement.findById(purchase.movimentacaoId);
      if (mov && mov.status === 'ativo') {
        const movOldVal = mov.valor;
        mov.valor = numPago;
        if (formaPagamento) mov.formaPagamento = formaPagamento;
        mov.atualizadoPor = autorNome;
        mov.historico.push({
          data: new Date(),
          autor: autorNome,
          acao: 'Sincronização de pagamento de compra',
          detalhes: `Valor de saída ajustado de R$ ${fmtMoney(movOldVal)} para R$ ${fmtMoney(numPago)}`,
          valoresAnteriores: { valor: movOldVal },
          valoresNovos: { valor: numPago },
        });
        await mov.save();
      }
    } else if (numPago > 0) {
      const movement = new CashMovement({
        descricao: `Compra: ${purchase.produto} (${purchase.fornecedor ? purchase.fornecedor + ' - ' : ''}${purchase.quantidade} un)`,
        tipo: 'saida',
        categoria: purchase.categoria || 'Materiais de Fabricação / Estrutura',
        valor: numPago,
        data: new Date(),
        formaPagamento: formaPagamento || purchase.formaPagamento || 'Pix',
        responsavel: responsavel || purchase.comprador,
        observacoes: `Saída registrada pelo pagamento da compra #${purchase._id}. ${observacoes || ''}`.trim(),
        comprovanteUrl: purchase.linkProduto || '',
        compraId: purchase._id,
        criadoPor: autorNome,
        atualizadoPor: autorNome,
        historico: [
          {
            data: new Date(),
            autor: autorNome,
            acao: 'Saída gerada por quitação de compra',
            detalhes: `Pagamento registrado para a compra "${purchase.produto}"`,
            valoresNovos: { valor: numPago, responsavel: responsavel || purchase.comprador },
          },
        ],
      });
      await movement.save();
      purchase.movimentacaoId = movement._id;
      await purchase.save();
    }

    res.json(purchase);
  } catch (err) {
    console.error('Erro ao registrar pagamento da compra:', err);
    res.status(500).json({ error: err.message || 'Erro ao registrar pagamento da compra.' });
  }
};

// POST /api/financial/purchases/:id/cancel
exports.cancelPurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { justificativa, autor, cancelarSaidaVinculada } = req.body;

    if (!justificativa || !justificativa.trim()) {
      return res.status(400).json({ error: 'A justificativa de cancelamento é obrigatória.' });
    }

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json({ error: 'Compra não encontrada.' });
    }

    if (purchase.status === 'cancelado') {
      return res.status(400).json({ error: 'Esta compra já está cancelada.' });
    }

    const autorNome = autor || 'Admin';

    purchase.status = 'cancelado';
    purchase.justificativaCancelamento = justificativa.trim();
    purchase.canceladoPor = autorNome;
    purchase.canceladoEm = new Date();
    purchase.atualizadoPor = autorNome;

    purchase.historico.push({
      data: new Date(),
      autor: autorNome,
      acao: 'Cancelamento lógico da compra',
      detalhes: `Compra cancelada. Motivo: ${justificativa.trim()}`,
      valoresAnteriores: { status: 'ativo' },
      valoresNovos: { status: 'cancelado' },
    });

    await purchase.save();

    // Se tiver saída no caixa e o usuário quis cancelar junto
    if (cancelarSaidaVinculada && purchase.movimentacaoId) {
      const mov = await CashMovement.findById(purchase.movimentacaoId);
      if (mov && mov.status === 'ativo') {
        mov.status = 'cancelado';
        mov.justificativaCancelamento = `Cancelamento automático pela compra #${purchase._id}: ${justificativa.trim()}`;
        mov.canceladoPor = autorNome;
        mov.canceladoEm = new Date();
        mov.atualizadoPor = autorNome;
        mov.historico.push({
          data: new Date(),
          autor: autorNome,
          acao: 'Cancelamento lógico vinculado',
          detalhes: `Cancelado devido ao cancelamento da compra associada (#${purchase._id})`,
        });
        await mov.save();
      }
    }

    res.json(purchase);
  } catch (err) {
    console.error('Erro ao cancelar compra:', err);
    res.status(500).json({ error: 'Erro ao cancelar compra.' });
  }
};

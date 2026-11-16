import * as XLSX from 'xlsx';

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
};

const fmtMoney = (v) => {
  const num = Number(v) || 0;
  return num.toFixed(2).replace('.', ',');
};

export function exportFinancialToExcel({ summary, movements, purchases, year, month }) {
  const wb = XLSX.utils.book_new();

  // ─── ABA 1: RESUMO FINANCEIRO ───
  if (summary) {
    const summaryRows = [
      { 'Indicador': 'Saldo Atual Disponível em Caixa', 'Valor (R$)': fmtMoney(summary.saldoAtual) },
      { 'Indicador': 'Total de Entradas Realizadas', 'Valor (R$)': fmtMoney(summary.totalEntradas) },
      { 'Indicador': 'Total de Despesas Efetivamente Pagas', 'Valor (R$)': fmtMoney(summary.totalDespesas) },
      { 'Indicador': 'Compras Pendentes de Pagamento (Comprometido)', 'Valor (R$)': fmtMoney(summary.comprasPendentesValor) },
      { 'Indicador': 'Quantidade de Compras Aguardando Entrega', 'Valor (R$)': `${summary.comprasAguardandoEntrega} itens` },
      { 'Indicador': 'Compras Atrasadas na Entrega', 'Valor (R$)': `${summary.comprasAtrasadasCount || 0} itens` },
      {},
      { 'Indicador': 'EVOLUÇÃO MENSAL', 'Valor (R$)': '' },
      ...summary.monthlyData.map((m) => ({
        'Indicador': `${m.monthName}/${m.ano}`,
        'Entradas (R$)': fmtMoney(m.entradas),
        'Saídas (R$)': fmtMoney(m.saidas),
        'Balanço (R$)': fmtMoney(m.balanco),
      })),
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Geral');
  }

  // ─── ABA 2: MOVIMENTAÇÕES ───
  if (movements && movements.length > 0) {
    const movementRows = movements.map((m) => ({
      'Data': fmtDate(m.data),
      'Tipo': m.tipo === 'entrada' ? 'Entrada' : 'Saída',
      'Categoria': m.categoria,
      'Descrição': m.descricao,
      'Valor (R$)': fmtMoney(m.valor),
      'Forma de Pagamento': m.formaPagamento,
      'Responsável': m.responsavel,
      'Status': m.status === 'cancelado' ? 'CANCELADO' : 'Ativo',
      'Observações': m.observacoes || '',
      'Criado por': m.criadoPor || '',
      'Última Atualização': m.atualizadoPor || '',
    }));

    const wsMov = XLSX.utils.json_to_sheet(movementRows);
    wsMov['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 28 }, { wch: 35 },
      { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 14 },
      { wch: 30 }, { wch: 16 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsMov, 'Movimentações');
  }

  // ─── ABA 3: CONTROLE DE COMPRAS ───
  if (purchases && purchases.length > 0) {
    const purchaseRows = purchases.map((p) => {
      const valorTotal = Number(p.valorTotal) || 0;
      const valorPago = Number(p.valorPago) || 0;
      const valorRestante = Math.max(0, valorTotal - valorPago);

      return {
        'Data Compra': fmtDate(p.dataCompra),
        'Produto / Material': p.produto,
        'Categoria': p.categoria,
        'Qtd': p.quantidade,
        'Tipo de Loja': p.tipoLoja === 'fisica' ? 'Loja Física' : 'Loja Online',
        'Fornecedor / Loja': p.fornecedor || '—',
        'Link do Produto': p.linkProduto || '—',
        'Valor Unit (R$)': fmtMoney(p.valorUnitario),
        'Valor Total (R$)': fmtMoney(valorTotal),
        'Valor Já Pago (R$)': fmtMoney(valorPago),
        'Restante a Pagar (R$)': fmtMoney(valorRestante),
        'Status Pagamento': p.statusPagamento?.toUpperCase() || 'PENDENTE',
        'Status Entrega': p.statusEntrega?.toUpperCase() || 'AGUARDANDO',
        'Previsão Chegada': fmtDate(p.dataPrevisaoEntrega),
        'Data Recebimento': fmtDate(p.dataEntrega),
        'Recebido Por': p.recebidoPor || '—',
        'Comprador': p.comprador,
        'Código Rastreio': p.codigoRastreamento || '—',
        'Status Registro': p.status === 'cancelado' ? 'CANCELADO' : 'Ativo',
      };
    });

    const wsPurchases = XLSX.utils.json_to_sheet(purchaseRows);
    wsPurchases['!cols'] = [
      { wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 8 }, { wch: 14 },
      { wch: 22 }, { wch: 35 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsPurchases, 'Compras & Entregas');
  }

  const periodLabel = year ? (month ? `${year}_${month}` : `${year}`) : 'geral';
  XLSX.writeFile(wb, `fluxo_de_caixa_microraptor_${periodLabel}.xlsx`);
}

export function exportMovementsToCSV(movements, filename = 'movimentacoes_caixa.csv') {
  if (!movements || movements.length === 0) return;
  const rows = movements.map((m) => ({
    'Data': fmtDate(m.data),
    'Tipo': m.tipo === 'entrada' ? 'Entrada' : 'Saída',
    'Categoria': m.categoria,
    'Descrição': `"${(m.descricao || '').replace(/"/g, '""')}"`,
    'Valor (R$)': fmtMoney(m.valor),
    'Forma Pagamento': m.formaPagamento,
    'Responsável': m.responsavel,
    'Status': m.status,
    'Observações': `"${(m.observacoes || '').replace(/"/g, '""')}"`,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

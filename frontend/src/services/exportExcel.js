import * as XLSX from 'xlsx';
import { getPayments } from './api';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const COLS = [
  { wch: 24 }, // Nome
  { wch: 30 }, // Email
  { wch: 12 }, // Tipo
  { wch: 12 }, // Gasolina
  { wch: 12 }, // Drive
  { wch: 14 }, // Status geral
  { wch: 18 }, // Valor devido
  { wch: 16 }, // Valor pago
  { wch: 18 }, // Valor pendente
];

function buildRows(payments, monthName, year) {
  return payments.map((p) => ({
    'Nome':              p.userId?.name || '—',
    'Email':             p.userId?.email || '—',
    'Tipo':              p.isDriver ? 'Motorista' : 'Normal',
    'Gasolina':          p.isDriver ? '—' : p.gasolinaPaid ? 'Pago' : 'Pendente',
    'Drive':             p.drivePaid ? 'Pago' : 'Pendente',
    'Status':            p.fullyPaid ? 'Pago' : 'Pendente',
    'Valor devido (R$)': p.amount.toFixed(2).replace('.', ','),
    'Valor pago (R$)':   p.amountPaid.toFixed(2).replace('.', ','),
    'Pendente (R$)':     (p.amount - p.amountPaid).toFixed(2).replace('.', ','),
  }));
}

// Exporta o ano inteiro — uma aba por mês
export async function exportYearToExcel(year, onProgress) {
  const wb = XLSX.utils.book_new();

  for (let m = 1; m <= 12; m++) {
    onProgress?.(m);
    const data = await getPayments(m, year);
    const monthName = MONTHS[m - 1];

    if (data.payments.length === 0) continue;

    const ws = XLSX.utils.json_to_sheet(buildRows(data.payments, monthName, year));
    ws['!cols'] = COLS;
    XLSX.utils.book_append_sheet(wb, ws, monthName);
  }

  XLSX.writeFile(wb, `pagamentos_${year}.xlsx`);
}

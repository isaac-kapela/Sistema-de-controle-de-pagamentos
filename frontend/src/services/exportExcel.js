import * as XLSX from 'xlsx';
import { getPayments } from './api';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function buildRows(payments, chargeTypes) {
  return payments.map((p) => {
    const row = {
      'Nome': p.userId?.name || '—',
      'Email': p.userId?.email || '—',
      'Tipo': p.isDriver ? 'Motorista' : 'Normal',
    };

    for (const ct of chargeTypes) {
      const charge = p.charges?.find(c => c.chargeTypeId === ct._id || c.chargeTypeId?.toString() === ct._id);
      row[ct.name] = charge ? (charge.paid ? 'Pago' : 'Pendente') : '—';
    }

    row['Status'] = p.fullyPaid ? 'Pago' : 'Pendente';
    row['Valor devido (R$)'] = p.amount.toFixed(2).replace('.', ',');
    row['Valor pago (R$)'] = p.amountPaid.toFixed(2).replace('.', ',');
    row['Pendente (R$)'] = (p.amount - p.amountPaid).toFixed(2).replace('.', ',');

    return row;
  });
}

export async function exportYearToExcel(year, chargeTypes = [], onProgress) {
  const wb = XLSX.utils.book_new();

  for (let m = 1; m <= 12; m++) {
    onProgress?.(m);
    const data = await getPayments(m, year);
    const monthName = MONTHS[m - 1];

    if (data.payments.length === 0) continue;

    const rows = buildRows(data.payments, chargeTypes);
    const ws = XLSX.utils.json_to_sheet(rows);

    // Larguras dinâmicas
    const fixedCols = [{ wch: 24 }, { wch: 30 }, { wch: 12 }];
    const chargeCols = chargeTypes.map(() => ({ wch: 14 }));
    const tailCols = [{ wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 18 }];
    ws['!cols'] = [...fixedCols, ...chargeCols, ...tailCols];

    XLSX.utils.book_append_sheet(wb, ws, monthName);
  }

  XLSX.writeFile(wb, `pagamentos_${year}.xlsx`);
}

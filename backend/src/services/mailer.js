const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const fmt = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function buildHtml({ name, month, year, isDriver, gasolinaPaid, drivePaid, amount, amountPaid }) {
  const monthName = MONTHS[month - 1];
  const pendingMonth = amount - amountPaid;

  const gasRow = !isDriver ? `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #2e2e2e;">Gasolina</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2e2e2e;">R$ 5,00</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2e2e2e;color:${gasolinaPaid ? '#22c55e' : '#a80303'}">
        ${gasolinaPaid ? 'Pago' : 'Pendente'}
      </td>
    </tr>` : '';


  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',sans-serif;color:#f5f5f5;">
  <div style="max-width:520px;margin:32px auto;background:#141414;border:1px solid #2e2e2e;border-radius:12px;overflow:hidden;">

    <div style="background:#a80303;padding:24px 28px;">
      <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">Cobrança de Pagamento</h1>
      <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">${monthName} de ${year}</p>
    </div>

    <div style="padding:24px 28px;">
      <p style="margin:0 0 16px;font-size:15px;">Olá, <strong>${name}</strong>!</p>
      <p style="margin:0 0 20px;font-size:14px;color:#9ca3af;">
        Identificamos que você possui pagamentos pendentes referentes ao mês de <strong style="color:#f5f5f5;">${monthName}/${year}</strong>.
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
        <thead>
          <tr style="background:#1f1f1f;">
            <th style="padding:8px 12px;text-align:left;color:#9ca3af;font-weight:600;">Item</th>
            <th style="padding:8px 12px;text-align:left;color:#9ca3af;font-weight:600;">Valor</th>
            <th style="padding:8px 12px;text-align:left;color:#9ca3af;font-weight:600;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${gasRow}
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #2e2e2e;">Drive</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2e2e2e;">R$ 2,27</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2e2e2e;color:${drivePaid ? '#22c55e' : '#a80303'}">
              ${drivePaid ? 'Pago' : 'Pendente'}
            </td>
          </tr>
        </tbody>
      </table>

      <div style="background:#1f1f1f;border-radius:8px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:14px;color:#9ca3af;">Pendente este mês</div>
        </div>
        <span style="font-size:20px;font-weight:700;color:#e5e7eb;">${fmt(pendingMonth)}</span>
      </div>

      <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;text-align:center;">
        Por favor, regularize o pagamento o quanto antes.<br>Em caso de dúvidas, fale com a gestão.
      </p>
    </div>

    <div style="padding:14px 28px;border-top:1px solid #2e2e2e;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">GP Microraptor — Sistema de Controle de Pagamentos</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendChargeEmail({ to, name, month, year, isDriver, gasolinaPaid, drivePaid, amount, amountPaid }) {
  const monthName = MONTHS[month - 1];
  const pendingMonth = amount - amountPaid;

  await transporter.sendMail({
    from: `"GP Microraptor" <${process.env.MAIL_USER}>`,
    to,
    subject: `[Cobrança GMM] Pagamento pendente — ${monthName}/${year} (${fmt(pendingMonth)})`,
    html: buildHtml({ name, month, year, isDriver, gasolinaPaid, drivePaid, amount, amountPaid }),
  });
}

function buildBirthdayHtml({ name }) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',sans-serif;color:#f5f5f5;">
  <div style="max-width:520px;margin:32px auto;background:#141414;border:1px solid #2e2e2e;border-radius:12px;overflow:hidden;">

    <div style="background:#a80303;padding:32px 28px;text-align:center;">
      <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.02em;">
        Feliz Aniversario!
      </h1>
      <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);">GP Microraptor</p>
    </div>

    <div style="padding:32px 28px;text-align:center;">
      <p style="margin:0 0 16px;font-size:18px;font-weight:600;">
        ${name},
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#d1d5db;line-height:1.7;">
        A equipe <strong style="color:#f5f5f5;">Microraptor</strong> deseja a voce um
        feliz aniversario! Obrigado por fazer parte da nossa historia e por tudo
        que voce ja contribuiu para o nosso grupo. Que esse novo ano de vida seja
        repleto de conquistas, saude e muito voo alto.
      </p>
      <div style="display:inline-block;background:#1f1f1f;border:1px solid #2e2e2e;border-radius:10px;padding:16px 32px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#9ca3af;">Com carinho,</p>
        <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#f5f5f5;">Equipe Microraptor</p>
      </div>
    </div>

    <div style="padding:14px 28px;border-top:1px solid #2e2e2e;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">GP Microraptor — Sistema de Gestao de Membros</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendBirthdayEmail({ to, name }) {
  await transporter.sendMail({
    from: `"GP Microraptor" <${process.env.MAIL_USER}>`,
    to,
    subject: `Feliz Aniversario, ${name}! A equipe Microraptor deseja tudo de bom`,
    html: buildBirthdayHtml({ name }),
  });
}

module.exports = { sendChargeEmail, sendBirthdayEmail };

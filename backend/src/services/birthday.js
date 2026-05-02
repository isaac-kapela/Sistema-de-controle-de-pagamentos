const cron = require('node-cron');
const Member = require('../models/Member');
const { sendBirthdayEmail } = require('./mailer');

// Busca membros que fazem aniversario hoje e envia emails
async function sendTodayBirthdays() {
  const now = new Date();
  const today = { month: now.getMonth() + 1, day: now.getDate() };

  const members = await Member.find({
    ativo: true,
    email: { $ne: '' },
    dataNascimento: { $ne: null },
  });

  const aniversariantes = members.filter((m) => {
    if (!m.dataNascimento) return false;
    const d = new Date(m.dataNascimento);
    return d.getMonth() + 1 === today.month && d.getDate() === today.day;
  });

  if (aniversariantes.length === 0) return { sent: 0, failed: 0, names: [] };

  const results = await Promise.allSettled(
    aniversariantes.map((m) =>
      sendBirthdayEmail({ to: m.email, name: m.nome })
    )
  );

  const sent   = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  const names  = aniversariantes.map((m) => m.nome);

  console.log(`[Birthday] ${sent} email(s) enviado(s) para: ${names.join(', ')}`);
  return { sent, failed, names };
}

// Roda todo dia as 08:00
function startBirthdayCron() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[Birthday] Verificando aniversariantes do dia...');
    try {
      await sendTodayBirthdays();
    } catch (err) {
      console.error('[Birthday] Erro:', err.message);
    }
  }, { timezone: 'America/Sao_Paulo' });

  console.log('[Birthday] Cron de aniversarios ativo (todo dia as 08:00 BRT)');
}

module.exports = { startBirthdayCron, sendTodayBirthdays };

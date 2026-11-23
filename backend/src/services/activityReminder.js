const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Member = require('../models/Member');
const Activity = require('../models/Activity');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function buildActivityEmailHtml({ activity, isTomorrow = true, memberName = 'Membro' }) {
  const dataFormatada = formatDateBR(activity.data);
  const tagTempo = isTomorrow ? 'Lembrete: Atividade Amanhã!' : 'Lembrete de Atividade da Equipe';
  const localOuLink = activity.local
    ? activity.local.startsWith('http')
      ? `<a href="${activity.local}" style="color:#38bdf8;text-decoration:none;" target="_blank">Acessar link da reunião &rarr;</a>`
      : activity.local
    : 'Local a ser definido';

  const prioridadeColor =
    activity.prioridade === 'alta'
      ? '#ef4444'
      : activity.prioridade === 'baixa'
      ? '#22c55e'
      : '#eab308';

  const prioridadeLabel =
    activity.prioridade === 'alta'
      ? 'Alta Prioridade'
      : activity.prioridade === 'baixa'
      ? 'Prioridade Normal'
      : 'Prioridade Média';

  const descFormatada = activity.descricao
    ? activity.descricao.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:#38bdf8;text-decoration:underline;">$1</a>')
    : '';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tagTempo} - ${activity.titulo}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f4f6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;padding:30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#141414;border:1px solid #262626;border-radius:12px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.7);">
          
          <!-- Top Accent Banner -->
          <tr>
            <td style="background-color:#a80303;padding:24px 30px;text-align:left;">
              <span style="display:inline-block;background:rgba(0,0,0,0.3);color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:4px 10px;border-radius:20px;margin-bottom:10px;">
                ${tagTempo}
              </span>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;line-height:1.3;">
                ${activity.titulo}
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
                Categoria: <strong>${activity.categoria}</strong>
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:28px 30px;">
              <p style="margin:0 0 16px;font-size:15px;color:#e5e7eb;">
                Olá, <strong>${memberName}</strong>!
              </p>

              <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;line-height:1.5;">
                ${isTomorrow
                  ? 'Este é um lembrete automático de que temos uma atividade importante agendada para <strong>amanhã</strong>. Confira os detalhes abaixo para se planejar:'
                  : 'Confira os detalhes da atividade importante agendada para a equipe:'}
              </p>

              <!-- Event Details Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#1c1c1c;border:1px solid #333333;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:18px 20px;">
                    
                    <!-- Data -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
                      <tr>
                        <td width="28" valign="top" style="font-size:16px;">📅</td>
                        <td style="font-size:14px;color:#f3f4f6;">
                          <strong style="color:#9ca3af;font-size:12px;text-transform:uppercase;display:block;">Data do Evento</strong>
                          ${dataFormatada}
                        </td>
                      </tr>
                    </table>

                    <!-- Horário -->
                    ${activity.hora ? `
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
                      <tr>
                        <td width="28" valign="top" style="font-size:16px;">⏰</td>
                        <td style="font-size:14px;color:#f3f4f6;">
                          <strong style="color:#9ca3af;font-size:12px;text-transform:uppercase;display:block;">Horário</strong>
                          ${activity.hora}
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- Local -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
                      <tr>
                        <td width="28" valign="top" style="font-size:16px;">📍</td>
                        <td style="font-size:14px;color:#f3f4f6;">
                          <strong style="color:#9ca3af;font-size:12px;text-transform:uppercase;display:block;">Local</strong>
                          ${localOuLink}
                        </td>
                      </tr>
                    </table>

                    <!-- Responsável -->
                    ${activity.responsavel ? `
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
                      <tr>
                        <td width="28" valign="top" style="font-size:16px;">👤</td>
                        <td style="font-size:14px;color:#f3f4f6;">
                          <strong style="color:#9ca3af;font-size:12px;text-transform:uppercase;display:block;">Responsável / Líder</strong>
                          ${activity.responsavel}
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- Prioridade -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="font-size:16px;">⚡</td>
                        <td style="font-size:13px;color:${prioridadeColor};font-weight:600;">
                          <strong style="color:#9ca3af;font-size:12px;text-transform:uppercase;display:block;">Importância</strong>
                          ${prioridadeLabel}
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Descrição se houver -->
              ${descFormatada ? `
              <div style="background-color:#171717;border-left:3px solid #a80303;padding:14px 16px;border-radius:4px;margin-bottom:24px;">
                <strong style="display:block;font-size:12px;text-transform:uppercase;color:#9ca3af;margin-bottom:6px;">Orientações e Pauta:</strong>
                <p style="margin:0;font-size:13px;color:#d1d5db;line-height:1.5;white-space:pre-line;">
                  ${descFormatada}
                </p>
              </div>
              ` : ''}

              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
                Contamos com a pontualidade e dedicação de todos os membros!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0d0d0d;padding:18px 30px;border-top:1px solid #222222;text-align:center;">
              <p style="margin:0;font-size:12px;font-weight:700;color:#e5e7eb;">
                Equipe Microraptor — UFJF
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">
                Sistema de Gestão Interna • Notificação Automática de Agenda
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Envia lembrete de uma atividade específica para membros ativos ou para um e-mail de teste
async function sendActivityReminderToActiveMembers(activity, isTomorrow = false, targetEmail = null) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.warn('[ActivityReminder] Credenciais de e-mail não configuradas no .env');
    return { ok: false, error: 'Credenciais de e-mail não configuradas' };
  }

  let recipients = [];
  if (targetEmail && targetEmail.trim()) {
    recipients = [{ nome: 'Isaac Dizolele (Teste)', email: targetEmail.trim() }];
  } else {
    recipients = await Member.find({
      ativo: true,
      email: { $exists: true, $ne: '' },
    }).select('nome email');
  }

  if (recipients.length === 0) {
    return { ok: true, count: 0, message: 'Nenhum destinatário encontrado com e-mail cadastrado' };
  }

  let sentCount = 0;
  const errors = [];

  for (const member of recipients) {
    try {
      const html = buildActivityEmailHtml({
        activity,
        isTomorrow,
        memberName: member.nome,
      });

      const subject = isTomorrow
        ? `[Microraptor] Lembrete: ${activity.titulo} (Amanhã!)`
        : `[Microraptor] Agenda: ${activity.titulo}`;

      await transporter.sendMail({
        from: `"Equipe Microraptor" <${process.env.MAIL_USER}>`,
        to: member.email,
        subject,
        html,
      });

      sentCount++;
    } catch (err) {
      console.error(`[ActivityReminder] Erro ao enviar para ${member.email}:`, err.message);
      errors.push({ email: member.email, error: err.message });
    }
  }

  // Marca atividade como notificada
  activity.notificacaoEnviada = true;
  activity.notificadoEm = new Date();
  await activity.save();

  return {
    ok: true,
    sentCount,
    total: recipients.length,
    errors,
  };
}

// Checa atividades agendadas para amanhã (1 dia antes) e notifica
async function checkAndSendTomorrowActivities() {
  try {
    // Calcula intervalo de "amanhã" em UTC
    const now = new Date();
    // Adiciona 1 dia
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const startOfTomorrow = new Date(
      Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 0, 0, 0, 0)
    );
    const endOfTomorrow = new Date(
      Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 23, 59, 59, 999)
    );

    const activitiesTomorrow = await Activity.find({
      data: { $gte: startOfTomorrow, $lte: endOfTomorrow },
      notificarEmail: true,
      notificacaoEnviada: false,
      concluida: false,
      status: { $ne: 'cancelada' },
    });

    if (activitiesTomorrow.length === 0) {
      console.log('[ActivityReminder] Nenhuma atividade para notificar para amanhã.');
      return { ok: true, count: 0 };
    }

    console.log(`[ActivityReminder] Encontradas ${activitiesTomorrow.length} atividade(s) para amanhã. Enviando lembretes...`);

    for (const act of activitiesTomorrow) {
      console.log(`[ActivityReminder] Disparando e-mails para a atividade: "${act.titulo}"`);
      await sendActivityReminderToActiveMembers(act, true);
    }

    return { ok: true, count: activitiesTomorrow.length };
  } catch (err) {
    console.error('[ActivityReminder] Erro ao verificar atividades de amanhã:', err.message);
    return { ok: false, error: err.message };
  }
}

// Inicia o cron diário às 08:00 (Horário de Brasília)
function startActivityReminderCron() {
  // Roda todo dia às 08:00 BRT
  cron.schedule(
    '0 8 * * *',
    async () => {
      console.log('[ActivityReminder] Executando verificação diária de atividades para amanhã...');
      await checkAndSendTomorrowActivities();
    },
    {
      scheduled: true,
      timezone: 'America/Sao_Paulo',
    }
  );
  console.log('[ActivityReminder] Cron de lembrete de atividades ativo (todo dia às 08:00 BRT)');
}

module.exports = {
  startActivityReminderCron,
  checkAndSendTomorrowActivities,
  sendActivityReminderToActiveMembers,
};

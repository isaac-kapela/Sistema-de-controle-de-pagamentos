const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Member = require('../models/Member');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Banco de mensagens e reflexões motivacionais focadas em engenharia, equipe e evolução contínua
const MOTIVATIONAL_MESSAGES = [
  {
    id: 1,
    title: 'Superação & Engenharia',
    quote: 'Grandes projetos não surgem da ausência de erros, mas da capacidade de aprender, iterar e continuar até o sucesso.',
    author: 'Equipe Microraptor',
    body: 'Cada ensaio, cada ajuste no projeto e cada hora dedicada no laboratório nos aproximam dos nossos maiores objetivos. Continue firme no seu propósito e dê o seu melhor nesta semana!',
  },
  {
    id: 2,
    title: 'Trabalho em Equipe',
    quote: 'Sozinhos podemos ir mais rápido, mas juntos voamos muito mais alto e mais longe.',
    author: 'GP Microraptor',
    body: 'O sucesso de um avião depende da perfeita sincronia de cada componente. Da mesma forma, cada membro da Microraptor é essencial para a nossa engrenagem funcionar perfeitamente.',
  },
  {
    id: 3,
    title: 'Dedicação & Foco',
    quote: 'A disciplina é a ponte entre as metas que traçamos no papel e os resultados que vemos na pista.',
    author: 'Gestão Microraptor',
    body: 'Nesta semana, concentre sua energia no que realmente importa, colabore com os seus colegas de área e lembre-se do impacto direto que o seu esforço tem em toda a equipe.',
  },
  {
    id: 4,
    title: 'Inovação e Resiliência',
    quote: 'O vento contrário não é um obstáculo para quem sabe ajustar as asas.',
    author: 'Princípio da Aviação',
    body: 'Quando surgirem desafios técnicos ou prazos apertados, mantenha a calma, pense criticamente e busque soluções em conjunto. É na resolução dos problemas difíceis que nos tornamos profissionais fora da curva.',
  },
  {
    id: 5,
    title: 'Excelência & Detalhe',
    quote: 'A excelência não é um ato isolado, mas um hábito construído a cada pequeno detalhe.',
    author: 'Cultura Microraptor',
    body: 'Verifique os cálculos, cuide dos materiais, mantenha a comunicação transparente e apoie quem estiver ao seu lado. Uma equipe de ponta se constrói na dedicação diária.',
  },
  {
    id: 6,
    title: 'Propósito & Conquista',
    quote: 'A paixão pelo que fazemos transforma horas de trabalho em memórias de vitória.',
    author: 'Família Microraptor',
    body: 'Lembre-se do motivo pelo qual você entrou para a equipe. O aprendizado que você constrói aqui levará sua trajetória acadêmica e profissional a outro patamar.',
  },
  {
    id: 7,
    title: 'Constância & Evolução',
    quote: 'Pequenos progressos diários resultam em conquistas gigantescas ao longo do tempo.',
    author: 'Engenharia Microraptor',
    body: 'Não subestime o valor de avançar um pouco a cada dia. O que plantamos hoje na oficina e nos relatórios é o que nos colocará no pódio amanhã.',
  },
  {
    id: 8,
    title: 'Coragem para Decidir',
    quote: 'Para quem sonha com os céus, nenhum desafio em solo é grande demais.',
    author: 'Espírito Microraptor',
    body: 'Confie na sua capacidade e na capacidade dos seus companheiros de equipe. Que a sua semana seja extremamente produtiva, inspiradora e cheia de boas entregas!',
  },
];

// Obtém mensagem da semana com base no número da semana do ano
function getMessageOfTheWeek() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  const index = (weekNumber - 1) % MOTIVATIONAL_MESSAGES.length;
  return MOTIVATIONAL_MESSAGES[index];
}

// Construtor do template HTML responsivo e temático
function buildMotivationalHtml({ name, title, quote, author, body }) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Mensagem da Semana'}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f5f5f5;">
  <div style="max-width:540px;margin:32px auto;background:#141414;border:1px solid #2e2e2e;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
    
    <!-- Cabeçalho -->
    <div style="background:#a80303;padding:28px 28px;text-align:center;">
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;text-transform:uppercase;">
        GP Microraptor
      </h1>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.85);letter-spacing:0.04em;">
        ${title || 'Reflexão & Motivação da Semana'}
      </p>
    </div>

    <!-- Conteúdo Principal -->
    <div style="padding:28px 28px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f5f5f5;">
        Olá, <strong>${name || 'Membro Microraptor'}</strong>!
      </p>

      <p style="margin:0 0 20px;font-size:14px;color:#9ca3af;line-height:1.6;">
        Começamos mais uma semana com foco no desenvolvimento e no crescimento de toda a nossa equipe. Confira a mensagem desta semana:
      </p>

      <!-- Cartão da Citação -->
      <div style="background:#1a1a1a;border-left:4px solid #a80303;border-radius:0 8px 8px 0;padding:18px 20px;margin-bottom:22px;">
        <p style="margin:0 0 8px;font-size:15px;font-weight:600;font-style:italic;color:#f3f4f6;line-height:1.6;">
          "${quote}"
        </p>
        <p style="margin:0;font-size:13px;color:#ef4444;font-weight:700;text-align:right;">
          — ${author}
        </p>
      </div>

      <!-- Texto complementar -->
      <p style="margin:0 0 24px;font-size:14px;color:#d1d5db;line-height:1.7;">
        ${body}
      </p>

      <!-- Caixa de Destaque -->
      <div style="background:#1f1f1f;border:1px solid #2e2e2e;border-radius:8px;padding:14px 20px;text-align:center;margin-bottom:20px;">
        <p style="margin:0;font-size:13px;color:#9ca3af;">
          Conta com o apoio dos seus líderes e colegas para qualquer desafio.
        </p>
        <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#22c55e;">
          Uma excelente e produtiva semana para todos nós!
        </p>
      </div>

      <div style="text-align:center;margin-top:16px;">
        <p style="margin:0;font-size:13px;color:#9ca3af;">Com dedicação,</p>
        <p style="margin:2px 0 0;font-size:15px;font-weight:700;color:#f5f5f5;">Equipe Microraptor</p>
      </div>
    </div>

    <!-- Rodapé -->
    <div style="padding:16px 28px;border-top:1px solid #2e2e2e;text-align:center;background:#0d0d0d;">
      <p style="margin:0;font-size:12px;color:#6b7280;">
        GP Microraptor — Equipe de Competição AeroDesign | UFJF
      </p>
      <p style="margin:4px 0 0;font-size:11px;color:#4b5563;">
        Esta mensagem semanal é enviada a cada 7 dias para os membros ativos da equipe.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// Envia emails para todos os membros ativos da equipe
async function sendWeeklyMotivationalEmails(options = {}) {
  const {
    customQuote,
    customAuthor,
    customTitle,
    customBody,
    customSubject,
    targetEmails = null,
  } = options;

  const defaultMsg = getMessageOfTheWeek();
  const title = customTitle || defaultMsg.title;
  const quote = customQuote || defaultMsg.quote;
  const author = customAuthor || defaultMsg.author;
  const body = customBody || defaultMsg.body;
  const subject = customSubject || `[Microraptor] Motivação da Semana: ${title}`;

  let members = [];

  if (Array.isArray(targetEmails) && targetEmails.length > 0) {
    members = targetEmails.map((e) => ({
      email: typeof e === 'string' ? e : e.email,
      nome: (typeof e === 'object' && e.nome) ? e.nome : 'Membro',
    }));
  } else {
    members = await Member.find({
      ativo: true,
      tipoMembro: 'membro',
      email: { $exists: true, $ne: '' },
    }).select('nome email');
  }

  // Filtra emails válidos e deduplica
  const validMap = new Map();
  members.forEach((m) => {
    if (m.email && m.email.includes('@')) {
      const emailNorm = m.email.trim().toLowerCase();
      if (!validMap.has(emailNorm)) {
        validMap.set(emailNorm, m.nome || 'Membro');
      }
    }
  });

  const memberList = Array.from(validMap.entries()).map(([email, nome]) => ({ email, nome }));

  if (memberList.length === 0) {
    return {
      sent: 0,
      failed: 0,
      total: 0,
      recipients: [],
      message: 'Nenhum membro ativo com email válido encontrado.',
    };
  }

  const results = await Promise.allSettled(
    memberList.map((m) =>
      transporter.sendMail({
        from: `"GP Microraptor" <${process.env.MAIL_USER}>`,
        to: m.email,
        subject,
        html: buildMotivationalHtml({
          name: m.nome,
          title,
          quote,
          author,
          body,
        }),
      })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  const recipients = memberList.map((m) => m.email);

  console.log(`[Motivational] Disparo concluído: ${sent} enviado(s), ${failed} falha(s).`);

  return {
    sent,
    failed,
    total: memberList.length,
    recipients,
    quote: { title, quote, author, body },
  };
}

// Inicia o cron semanal: toda segunda-feira às 09:00 (a cada 7 dias)
function startMotivationalCron() {
  // '0 9 * * 1' = toda segunda-feira às 09:00 no fuso de São Paulo
  cron.schedule('0 9 * * 1', async () => {
    console.log('[Motivational] Iniciando envio semanal de mensagens motivacionais...');
    try {
      const result = await sendWeeklyMotivationalEmails();
      console.log(`[Motivational] Sucesso no cron semanal: ${result.sent} emails enviados.`);
    } catch (err) {
      console.error('[Motivational] Erro no cron semanal:', err.message);
    }
  }, { timezone: 'America/Sao_Paulo' });

  console.log('[Motivational] Cron motivacional ativo (a cada 7 dias: segunda-feira as 09:00 BRT)');
}

module.exports = {
  MOTIVATIONAL_MESSAGES,
  getMessageOfTheWeek,
  buildMotivationalHtml,
  sendWeeklyMotivationalEmails,
  startMotivationalCron,
};

const https = require('https');

/**
 * Envia mensagem WhatsApp via CallMeBot (gratuito) para múltiplos números.
 *
 * Configuração — cada destinatário faz uma vez:
 *   1. Salve o número +34 644 49 19 50 no WhatsApp como "CallMeBot"
 *   2. Envie: "I allow callmebot to send me messages"
 *   3. Você receberá um apikey — coloque no .env:
 *        WHATSAPP_PHONES=5532848230760,553299310160   (DDI+DDD+número, sem +, separados por vírgula)
 *        WHATSAPP_APIKEYS=chave1,chave2               (na mesma ordem dos números)
 */

function sendOne(phone, apikey, message) {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${apikey}`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`[WhatsApp] Enviado para ${phone}.`);
          resolve({ ok: true, phone });
        } else {
          console.warn(`[WhatsApp] Falha para ${phone}: ${res.statusCode} — ${body}`);
          resolve({ ok: false, phone, reason: body });
        }
      });
    }).on('error', (err) => {
      console.error(`[WhatsApp] Erro para ${phone}:`, err.message);
      resolve({ ok: false, phone, reason: err.message });
    });
  });
}

async function sendWhatsApp(message) {
  const phones = (process.env.WHATSAPP_PHONES || '').split(',').map(s => s.trim()).filter(Boolean);
  const keys   = (process.env.WHATSAPP_APIKEYS || '').split(',').map(s => s.trim());

  if (phones.length === 0) {
    console.warn('[WhatsApp] WHATSAPP_PHONES não configurado — mensagem não enviada.');
    return { ok: false, reason: 'não configurado' };
  }

  const results = await Promise.all(
    phones.map((phone, i) => {
      const apikey = keys[i] || '';
      if (!apikey) {
        console.warn(`[WhatsApp] Sem apikey para ${phone} — pulando.`);
        return Promise.resolve({ ok: false, phone, reason: 'sem apikey' });
      }
      return sendOne(phone, apikey, message);
    })
  );

  const sent = results.filter(r => r.ok).length;
  return { ok: sent > 0, sent, total: phones.length, results };
}

module.exports = { sendWhatsApp };

import { jsPDF } from 'jspdf';
import { getFeedbackMemberReport } from './api';

const PRIMARY = [168, 3, 3];
const DARK = [20, 20, 20];
const CARD = [31, 31, 31];
const TEXT = [245, 245, 245];
const MUTED = [156, 163, 175];
const SUCCESS = [34, 197, 94];
const WHITE = [255, 255, 255];

function addPage(doc) {
  doc.addPage();
  return 20;
}

function drawRect(doc, x, y, w, h, color, radius = 0) {
  doc.setFillColor(...color);
  if (radius) {
    doc.roundedRect(x, y, w, h, radius, radius, 'F');
  } else {
    doc.rect(x, y, w, h, 'F');
  }
}

function tipoLabel(tipo, tipoCustom) {
  const map = {
    'pos-offseason': 'Pós-Offseason',
    'pos-relatorio': 'Pós-Relatório',
    'pos-competicao': 'Pós-Competição',
    outro: tipoCustom || 'Outro',
  };
  return map[tipo] || tipo;
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR');
}

function calcAverage(respostas) {
  const notes = respostas.filter(
    (r) => r.tipoCriterio !== 'aberta' && r.valor != null
  );
  if (notes.length === 0) return null;
  return (notes.reduce((a, b) => a + Number(b.valor), 0) / notes.length).toFixed(1);
}

function drawCover(doc, member, campaign) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Background
  drawRect(doc, 0, 0, W, H, DARK);

  // Top accent bar
  drawRect(doc, 0, 0, W, 8, PRIMARY);

  // Center content
  const cx = W / 2;
  let y = 70;

  // Circle avatar placeholder
  doc.setFillColor(...PRIMARY);
  doc.circle(cx, y, 22, 'F');
  doc.setFontSize(24);
  doc.setTextColor(...WHITE);
  const initials = (member?.nome || '?')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  doc.text(initials, cx, y + 8, { align: 'center' });

  y += 36;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  doc.text(member?.nome || 'Membro', cx, y, { align: 'center' });

  if (member?.area) {
    y += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(member.area, cx, y, { align: 'center' });
  }

  // Divider
  y += 20;
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(cx - 40, y, cx + 40, y);

  // Campaign name
  y += 14;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  doc.text(campaign.nome, cx, y, { align: 'center' });

  y += 9;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(tipoLabel(campaign.tipo, campaign.tipoCustom), cx, y, { align: 'center' });

  y += 8;
  doc.text(
    `${formatDate(campaign.dataInicio)} – ${formatDate(campaign.dataEncerramento)}`,
    cx,
    y,
    { align: 'center' }
  );

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('Microraptor — Sistema de Feedback', cx, H - 16, { align: 'center' });
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, cx, H - 10, {
    align: 'center',
  });
}

function drawSection(doc, title, y, pageW) {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text(title.toUpperCase(), 20, y);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.4);
  doc.line(20, y + 2, pageW - 20, y + 2);
  return y + 10;
}

function drawResponseBlock(doc, label, respostas, criterios, y, pageW) {
  const H = doc.internal.pageSize.getHeight();
  if (y > H - 40) y = addPage(doc);

  // Label header
  drawRect(doc, 20, y, pageW - 40, 9, CARD, 2);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  doc.text(label, 25, y + 6);

  const avg = calcAverage(respostas);
  if (avg !== null) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SUCCESS);
    doc.text(`Média: ${avg}`, pageW - 24, y + 6, { align: 'right' });
  }
  y += 13;

  respostas.forEach((r) => {
    if (y > H - 30) y = addPage(doc);
    const crit = criterios.find(
      (c) => (c._id || c.pergunta) === r.criterioId
    );
    const pergunta = r.pergunta || crit?.pergunta || '';

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(`• ${pergunta}`, 26, y);

    if (r.tipoCriterio !== 'aberta') {
      const val = r.valor ?? '-';
      const max = r.tipoCriterio === 'nota10' ? 10 : 5;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXT);
      doc.text(`${val}/${max}`, pageW - 24, y, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...TEXT);
      const wrapped = doc.splitTextToSize(String(r.valor || '-'), pageW - 70);
      doc.text(wrapped, 60, y);
      y += (wrapped.length - 1) * 5;
    }
    y += 6;

    if (r.comentario) {
      if (y > H - 20) y = addPage(doc);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      const wrapped = doc.splitTextToSize(`"${r.comentario}"`, pageW - 56);
      doc.text(wrapped, 30, y);
      y += wrapped.length * 4 + 2;
    }
  });

  return y + 4;
}

export async function generateMemberFeedbackPdf(campaignId, member) {
  const { campaign, received } = await getFeedbackMemberReport(
    campaignId,
    member._id || member
  );

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // Cover page
  drawCover(doc, member, campaign);

  // Content pages
  doc.addPage();
  let y = 20;
  const H = doc.internal.pageSize.getHeight();

  // Page header
  drawRect(doc, 0, 0, W, 14, DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('MICRORAPTOR', 20, 9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(campaign.nome, W / 2, 9, { align: 'center' });
  doc.text(member?.nome || '', W - 20, 9, { align: 'right' });

  y = 24;

  // Summary card
  const avgTotal = (() => {
    const all = received.flatMap((r) =>
      r.respostas.filter(
        (rr) => rr.tipoCriterio !== 'aberta' && rr.valor != null
      )
    );
    if (all.length === 0) return null;
    return (all.reduce((a, b) => a + Number(b.valor), 0) / all.length).toFixed(1);
  })();

  drawRect(doc, 20, y, W - 40, 28, CARD, 3);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  doc.text('Resumo Geral', 28, y + 9);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(`Avaliações recebidas: ${received.length}`, 28, y + 17);
  if (avgTotal !== null) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SUCCESS);
    doc.text(`Média geral: ${avgTotal}`, W - 28, y + 17, { align: 'right' });
  }
  y += 34;

  // Avaliações de membros — sem identificar o avaliador
  const membroRespostas = received.filter((r) => r.tipo === 'membro');
  if (membroRespostas.length > 0) {
    y = drawSection(doc, 'Avaliações de Membros', y, W);
    membroRespostas.forEach((r, idx) => {
      y = drawResponseBlock(
        doc,
        `Avaliação ${idx + 1}`,
        r.respostas || [],
        campaign.criterios || [],
        y,
        W
      );
      if (y > H - 20) y = addPage(doc);
    });
  }

  // Avaliações de áreas — sem identificar o avaliador
  const areaRespostas = received.filter((r) => r.tipo === 'area');
  if (areaRespostas.length > 0) {
    if (y > H - 50) y = addPage(doc);
    y += 4;
    y = drawSection(doc, 'Avaliações de Áreas', y, W);
    areaRespostas.forEach((r, idx) => {
      y = drawResponseBlock(
        doc,
        `Avaliação ${idx + 1} — ${r.area || 'Área'}`,
        r.respostas || [],
        campaign.criterios || [],
        y,
        W
      );
      if (y > H - 20) y = addPage(doc);
    });
  }

  // Per-criteria averages
  if (campaign.criterios?.length > 0) {
    if (y > H - 60) y = addPage(doc);
    y += 4;
    y = drawSection(doc, 'Médias por Critério', y, W);

    for (const crit of campaign.criterios) {
      if (crit.tipo === 'aberta') continue;
      const cid = crit._id || crit.pergunta;
      const vals = received.flatMap((r) =>
        r.respostas
          .filter((rr) => rr.criterioId === cid && rr.valor != null)
          .map((rr) => Number(rr.valor))
      );
      const avg =
        vals.length > 0
          ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
          : null;

      if (y > H - 20) y = addPage(doc);
      const max = crit.tipo === 'nota10' ? 10 : 5;
      const pct = avg ? (Number(avg) / max) * 100 : 0;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT);
      doc.text(crit.pergunta, 24, y);
      doc.setTextColor(...MUTED);
      doc.text(`${avg ?? '-'}/${max}`, W - 24, y, { align: 'right' });

      y += 3;
      drawRect(doc, 24, y, W - 48, 3, CARD);
      if (pct > 0) {
        drawRect(doc, 24, y, ((W - 48) * pct) / 100, 3, PRIMARY);
      }
      y += 8;
    }
  }

  // Nota metodológica
  if (y > H - 50) y = addPage(doc);
  y += 8;
  drawRect(doc, 20, y, W - 40, 36, CARD, 3);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...MUTED);
  doc.text('Metodologia de avaliação', 28, y + 7);
  doc.setFont('helvetica', 'normal');
  const metodologia = [
    'Média geral: média aritmética de todas as notas numéricas recebidas. Respostas dissertativas não são computadas.',
    'Média por critério: média aritmética das notas atribuídas por cada avaliador àquele critério, conforme a escala indicada.',
  ];
  let my = y + 14;
  for (const linha of metodologia) {
    const wrapped = doc.splitTextToSize(`• ${linha}`, W - 60);
    doc.text(wrapped, 28, my);
    my += wrapped.length * 4 + 2;
  }
  y += 40;

  // Footer on last page
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Página ${i} de ${totalPages}`, W - 20, H - 8, { align: 'right' });
  }

  const safeName = (member?.nome || 'membro').replace(/\s+/g, '_');
  doc.save(`feedback_${safeName}_${campaign.nome.replace(/\s+/g, '_')}.pdf`);
}

export async function generateAllMembersPdf(campaign, members) {
  for (const member of members) {
    await generateMemberFeedbackPdf(campaign._id, member);
  }
}

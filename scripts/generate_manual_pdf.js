const fs = require('fs');
const path = require('path');
const { jsPDF } = require('../frontend/node_modules/jspdf');

function generatePDF() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const W = doc.internal.pageSize.getWidth(); // 210mm
  const H = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 18;
  const contentWidth = W - margin * 2; // 174mm

  const PRIMARY = [168, 3, 3]; // #a80303
  const SECONDARY = [31, 41, 55]; // #1f2937
  const TEXT = [31, 41, 55];
  const MUTED = [107, 114, 128];
  const LIGHT_BG = [249, 250, 251];
  const BOX_BORDER = [229, 231, 235];
  const RED_BG = [254, 242, 242];

  let currentY = margin;

  function checkPageBreak(neededHeight) {
    if (currentY + neededHeight > H - 22) {
      doc.addPage();
      currentY = margin + 12;
      drawHeader();
    }
  }

  function drawHeader() {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...PRIMARY);
    doc.text('EQUIPE MICRORAPTOR — UFJF', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text('Manual do Usuário e Operação do Sistema', W - margin, 12, { align: 'right' });

    doc.setDrawColor(...BOX_BORDER);
    doc.setLineWidth(0.3);
    doc.line(margin, 14, W - margin, 14);
  }

  function drawFooter(pageNumber, totalPages) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setDrawColor(...BOX_BORDER);
    doc.setLineWidth(0.3);
    doc.line(margin, H - 14, W - margin, H - 14);

    doc.text('Guia Oficial de Gestão e Operação para as Próximas Gerações', margin, H - 9);
    doc.text(`Página ${pageNumber} de ${totalPages}`, W - margin, H - 9, { align: 'right' });
  }

  // ─── CAPA / CABEÇALHO PRINCIPAL ───
  // Faixa superior vermelha
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 8, 'F');

  // Emblema Microraptor estilizado
  let logoY = 20;
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(margin, logoY, 16, 16, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('M', margin + 8, logoY + 11.5, { align: 'center' });
  logoY = 44;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...PRIMARY);
  doc.text('Sistema de Gestão Microraptor', margin, logoY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...SECONDARY);
  doc.text('Manual Completo do Usuário & Guia Operacional', margin, logoY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(
    'Documento de transição e capacitação para as futuras gerações e membros da equipe',
    margin,
    logoY + 13
  );

  // Caixa de Introdução
  currentY = logoY + 20;
  doc.setFillColor(...RED_BG);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PRIMARY);
  doc.text('Objetivo deste documento:', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT);
  const introText =
    'Este guia foi elaborado para que qualquer membro ou diretor compreenda as funcionalidades do sistema de forma prática, direta e sem necessidade de conhecimento técnico. Leia com atenção as diretrizes de cada módulo.';
  doc.text(doc.splitTextToSize(introText, contentWidth - 8), margin + 4, currentY + 12);

  currentY += 30;

  // ─── ESTRUTURA DO CONTEÚDO ───
  const sections = [
    {
      title: '1. Visão Geral e Estrutura de Acesso',
      desc: 'O sistema é a central operacional da equipe, integrando finanças, membros, presença, estoque, cantina e feedbacks.',
      items: [
        'Modo Membro (Acesso Geral): Consulta de horários, materiais do estoque, contatos importantes e área individual.',
        'Modo Administrador (Admin): Acesso com senha da gestão no canto superior direito. Libera registro de pagamentos, movimentações financeiras, edição de estoque, cadastro de membros e envio de feedbacks.',
      ],
    },
    {
      title: '2. Pagamentos (Mensalidades e Taxas)',
      desc: 'Controle de contribuições financeiras dos membros (mensalidades normais, taxas de uniforme e rifas).',
      items: [
        'Navegação por Mês/Ano: Alterne entre os meses ou visualize o histórico completo do semestre.',
        'Confirmação de Pagamento: Clique na célula de pagamento do membro para alternar entre "Pago" (verde) e "Pendente" (cinza/vermelho).',
        'Tipos de Cobrança: Crie cobranças extraordinárias (ex: "Camisa 2026", "Inscrição RoboCore") sem misturar com as mensalidades regulares.',
        'Comprovantes: Permite anexar notas e registrar se o pagamento foi via Pix ou dinheiro.',
      ],
    },
    {
      title: '3. Fluxo de Caixa e Controle de Compras',
      desc: 'Centro de controle financeiro. Permite acompanhar saldo disponível, valores comprometidos e encomendas de materiais.',
      items: [
        'Indicadores do Topo: Saldo Atual em caixa, Total de Entradas, Total de Despesas, Compras Pendentes de Pagamento e Pacotes Aguardando Entrega.',
        'Registro de Movimentações: Clique em "+ Nova Movimentação" para registrar Entradas (patrocínios, doações) ou Saídas (transporte, lanches, serviços).',
        'Ajuste de Saldo Manual: Permite conciliação física com registro obrigatório de responsável e justificativa.',
        'Controle de Compras & Rastreio: Registra compras de materiais, quantidade, fornecedor, tipo de loja (Online ou Física) e link da loja quando for compra online.',
        'Acompanhamento de Entregas: Destaca encomendas aguardando envio, em transporte, próximas da chegada ou atrasadas. Ao chegar, clique em "Recebido" para registrar quem recebeu.',
        'Exportação de Relatórios: Botão "Exportar Excel / CSV" gera planilha completa com abas de Resumo Geral, Movimentações e Compras.',
      ],
    },
    {
      title: '4. Contatos Importantes',
      desc: 'Agenda estratégica com fornecedores, patrocinadores, professores e parceiros da equipe para preservar o networking entre gerações.',
      items: [
        'Informações Registradas: Nome, Organização/Empresa, Função/Cargo, Telefone/WhatsApp, E-mail, Categoria e Observações.',
        'Ações Rápidas: Botão direto para "Abrir no WhatsApp", envio de e-mail e cópia completa dos dados para a área de transferência.',
        'Busca e Filtros: Pesquisa instantânea por nome, organização, função ou categoria de parceiro.',
      ],
    },
    {
      title: '5. Membros',
      desc: 'Gestão dos integrantes da equipe (Capitães, Diretores, Membros de Área e Trainees).',
      items: [
        'Status do Integrante: Membros ativos e inativos (inativos preservam histórico financeiro e de presença sem poluir as listas).',
        'Data de Nascimento: Integração com disparo automático de felicitações por e-mail.',
        'Código de Acesso do Membro: Permite gerar código individual para que o integrante acesse seu portal exclusivo.',
      ],
    },
    {
      title: '6. Horários (Disponibilidade da Equipe)',
      desc: 'Organização da grade de horários livres no laboratório da UFJF por blocos semanais (Manhã, Tarde e Noite).',
      items: [
        'Quadro Semanal: Visualização de Segunda a Sábado com lista de membros livres em cada turno.',
        'Importação Automática do SIGA (PDF): O membro faz upload do comprovante de matrícula da UFJF e o sistema preenche a disponibilidade automaticamente.',
      ],
    },
    {
      title: '7. Presença (Frequência em Reuniões)',
      desc: 'Acompanhamento do comprometimento dos integrantes nas reuniões gerais e técnicas.',
      items: [
        'Criação de Reuniões: Registro de data, tema e tipo de encontro.',
        'Chamada e Frequência: Marcação simples de presença e geração automática de porcentagens de assiduidade.',
      ],
    },
    {
      title: '8. Cantina da Equipe',
      desc: 'Controle de consumo de alimentos, bebidas e lanches na sede/laboratório da equipe.',
      items: [
        'Catálogo de Itens: Estoque e valor de cada produto disponível.',
        'Registro de Consumo: Lançamento de pagamentos à vista ou acúmulo no saldo devedor do mês para quitação posterior.',
      ],
    },
    {
      title: '9. Estoque de Materiais e Peças',
      desc: 'Gerenciamento de ferramentas, eletrônica, parafusos, motores, baterias e filamentos.',
      items: [
        'Categorização: Separação organizada por área mecânica, elétrica e consumíveis.',
        'Alerta de Quantidade Mínima: Aviso visual quando um componente atinge o estoque crítico.',
        'Entradas e Saídas: Histórico de peças utilizadas em cada robô da equipe.',
      ],
    },
    {
      title: '10. Feedbacks (Avaliação de Desempenho)',
      desc: 'Ciclos periódicos de avaliação construtiva 360° para desenvolvimento individual dos membros.',
      items: [
        'Campanhas Semestrais: Abertura e encerramento de ciclos de avaliação pela liderança.',
        'Relatórios em PDF: Geração de documentos individuais com médias e comentários para reuniões de 1-on-1.',
      ],
    },
    {
      title: '11. Logins e Links Importantes',
      desc: 'Cofre seguro com links e acessos institucionais da equipe (Drive, GitHub, Figma, Redes Sociais e RoboCore).',
      items: [
        'Centralização: Evita perda de credenciais quando lideranças se formam.',
        'Cópia Rápida: Botões para copiar senhas e usuários com um clique.',
      ],
    },
    {
      title: '12. Automações Internas (Serviços em Segundo Plano)',
      desc: 'Rotinas automáticas que operam continuamente no servidor.',
      items: [
        'Aniversários: Todo dia às 08:00 BRT, checa aniversariantes ativos e envia e-mail comemorativo.',
        'E-mails Motivacionais: A cada 7 dias (segunda-feira às 09:00 BRT), dispara mensagem motivacional de alinhamento para toda a equipe.',
      ],
    },
    {
      title: '13. Boas Práticas e Recomendações de Gestão',
      desc: 'Conselhos fundamentais para a longevidade e organização da equipe.',
      items: [
        'Lançamentos em Tempo Real: Registre despesas e compras no mesmo dia em que ocorrerem.',
        'Transição Semestral: Ao início de cada semestre letivo, atualize o status dos membros que saíram e cadastre os novos ingressantes.',
        'Segurança: Mantenha a senha de Administrador restrita aos membros da diretoria.',
        'Backups: Exporte mensalmente o Fluxo de Caixa em planilha Excel e armazene no Google Drive oficial da Microraptor.',
      ],
    },
  ];

  sections.forEach((sec) => {
    checkPageBreak(38);

    // Título da Seção
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY);
    doc.text(sec.title, margin, currentY);
    currentY += 5;

    // Descrição
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    const descLines = doc.splitTextToSize(sec.desc, contentWidth);
    doc.text(descLines, margin, currentY);
    currentY += descLines.length * 4.2 + 2;

    // Itens em Bullet Points
    sec.items.forEach((item) => {
      const parts = item.split(': ');
      const title = parts[0] + (parts.length > 1 ? ': ' : '');
      const body = parts.length > 1 ? parts.slice(1).join(': ') : '';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...PRIMARY);
      doc.text('• ', margin + 2, currentY);

      doc.setTextColor(...SECONDARY);
      doc.text(title, margin + 6, currentY);

      const titleWidth = doc.getTextWidth(title);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT);

      if (parts.length > 1) {
        const bodyLines = doc.splitTextToSize(body, contentWidth - 6 - titleWidth);
        if (bodyLines.length === 1) {
          doc.text(bodyLines[0], margin + 6 + titleWidth, currentY);
          currentY += 4.5;
        } else {
          // Multiline wrap
          const fullWrapped = doc.splitTextToSize(`${title}${body}`, contentWidth - 6);
          // Redesenha completo com recuo
          currentY -= 0; // reset
          doc.text(fullWrapped, margin + 6, currentY);
          currentY += fullWrapped.length * 4.2 + 1;
        }
      } else {
        currentY += 4.5;
      }
    });

    currentY += 4;
    // Linha divisória suave
    doc.setDrawColor(...BOX_BORDER);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY, W - margin, currentY);
    currentY += 5;
  });

  // Numeração de páginas no rodapé
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(i, pageCount);
  }

  const outputPath = path.join(__dirname, '../MANUAL_DO_USUARIO_MICRORAPTOR.pdf');
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(outputPath, pdfBuffer);

  // Também salvar cópia no diretório de artefatos
  const artifactDir = '/home/oia100739/.gemini/antigravity-cli/brain/b59feb6d-96b5-4b54-90f7-3f3bcc8def0b';
  if (fs.existsSync(artifactDir)) {
    fs.writeFileSync(path.join(artifactDir, 'MANUAL_DO_USUARIO_MICRORAPTOR.pdf'), pdfBuffer);
  }

  console.log('PDF gerado com sucesso em:', outputPath);
}

generatePDF();

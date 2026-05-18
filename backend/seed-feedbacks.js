require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('./src/models/Member');
const FeedbackCampaign = require('./src/models/FeedbackCampaign');
const FeedbackResponse = require('./src/models/FeedbackResponse');

const AREAS = ['Aerodinâmica', 'Estruturas', 'Eletrônica', 'Gestão'];

const CRITERIOS = [
  { pergunta: 'Comunicação', tipo: 'nota5', obrigatorio: true },
  { pergunta: 'Trabalho em equipe', tipo: 'nota5', obrigatorio: true },
  { pergunta: 'Comprometimento', tipo: 'nota5', obrigatorio: true },
  { pergunta: 'Entrega técnica', tipo: 'nota10', obrigatorio: true },
  { pergunta: 'O que você destacaria positivamente?', tipo: 'aberta', obrigatorio: false },
  { pergunta: 'O que pode melhorar?', tipo: 'aberta', obrigatorio: false },
];

function randNota(max) {
  return Math.floor(Math.random() * max) + 1;
}

const COMENTARIOS_POSITIVOS = [
  'Sempre disposto a ajudar o time.',
  'Excelente proatividade nas entregas.',
  'Comunicação clara e objetiva.',
  'Referência técnica para a equipe.',
  'Muito comprometido com os prazos.',
];

const COMENTARIOS_MELHORIA = [
  'Poderia comunicar melhor os impedimentos.',
  'Participar mais das reuniões semanais.',
  'Documentar melhor as entregas.',
  'Dar mais feedback aos colegas.',
  'Organizar melhor as tarefas.',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado ao MongoDB');

  // Busca membros ativos (não ex-membros)
  const membros = await Member.find({ ativo: true, tipoMembro: 'membro' }).limit(6);

  if (membros.length < 2) {
    console.log('Nenhum membro encontrado. Cadastre membros primeiro.');
    process.exit(1);
  }

  console.log(`Usando ${membros.length} membros: ${membros.map((m) => m.nome).join(', ')}`);

  // Limpa dados antigos de teste
  await FeedbackCampaign.deleteMany({ nome: /Teste/ });
  await FeedbackResponse.deleteMany({});

  // Cria campanha
  const campaign = await FeedbackCampaign.create({
    nome: 'Feedback Pós-Competição 2025 (Teste)',
    tipo: 'pos-competicao',
    dataInicio: new Date('2025-01-01'),
    dataEncerramento: new Date('2025-12-31'),
    descricao: 'Avaliação interna após a competição. Dados de teste gerados automaticamente.',
    status: 'ativo',
    membros: membros.map((m) => m._id),
    areas: AREAS,
    criterios: CRITERIOS,
    anonimo: false,
  });

  console.log(`Campanha criada: ${campaign._id}`);

  // Cria respostas: cada membro avalia todos os outros + todas as áreas
  let totalRespostas = 0;

  for (const avaliador of membros) {
    // Avalia cada outro membro
    for (const avaliado of membros) {
      if (avaliador._id.equals(avaliado._id)) continue;

      const respostas = campaign.criterios.map((c) => ({
        criterioId: c._id.toString(),
        pergunta: c.pergunta,
        tipoCriterio: c.tipo,
        valor:
          c.tipo === 'aberta'
            ? c.pergunta.includes('positivamente')
              ? pick(COMENTARIOS_POSITIVOS)
              : pick(COMENTARIOS_MELHORIA)
            : randNota(c.tipo === 'nota10' ? 10 : 5),
        comentario:
          c.tipo !== 'aberta' && Math.random() > 0.5
            ? pick(COMENTARIOS_POSITIVOS)
            : '',
      }));

      await FeedbackResponse.create({
        campanha: campaign._id,
        avaliador: avaliador._id,
        avaliado: avaliado._id,
        tipo: 'membro',
        respostas,
        concluido: true,
      });

      totalRespostas++;
    }

    // Avalia cada área
    for (const area of AREAS) {
      const respostas = campaign.criterios.map((c) => ({
        criterioId: c._id.toString(),
        pergunta: c.pergunta,
        tipoCriterio: c.tipo,
        valor:
          c.tipo === 'aberta'
            ? c.pergunta.includes('positivamente')
              ? pick(COMENTARIOS_POSITIVOS)
              : pick(COMENTARIOS_MELHORIA)
            : randNota(c.tipo === 'nota10' ? 10 : 5),
        comentario: '',
      }));

      await FeedbackResponse.create({
        campanha: campaign._id,
        avaliador: avaliador._id,
        area,
        tipo: 'area',
        respostas,
        concluido: true,
      });

      totalRespostas++;
    }
  }

  console.log(`${totalRespostas} respostas criadas.`);
  console.log('Seed concluído.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

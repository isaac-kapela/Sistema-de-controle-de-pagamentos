const { GoogleGenerativeAI } = require('@google/generative-ai');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const KnowledgeSetting = require('../models/KnowledgeSetting');

/**
 * Divide o texto do documento em trechos (chunks) semânticos preservando cabeçalhos e tópicos
 */
function chunkText(text, maxChars = 900, overlap = 180) {
  if (!text || typeof text !== 'string') return [];

  // Limpa espaços excessivos
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) return [];
  if (normalized.length <= maxChars) {
    return [{ content: normalized, chunkIndex: 0, section: normalized.substring(0, 50) + '...' }];
  }

  const chunks = [];
  const paragraphs = normalized.split(/\n+/);
  let currentChunk = '';
  let currentSection = '';
  let chunkIdx = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    if (!p) continue;

    // Detecta se o parágrafo atual é um título/cabeçalho
    const isHeading =
      p.startsWith('#') ||
      /^(capítulo|título|seção|artigo|anexo|apêndice|tabela|figura)\b/i.test(p) ||
      (p.length < 70 && p === p.toUpperCase() && /[A-Z]/.test(p));

    if (isHeading) {
      currentSection = p.replace(/^#+\s*/, '').substring(0, 80);
    }

    // Se o próprio parágrafo for muito grande, quebra por frases
    if (p.length > maxChars) {
      const sentences = p.match(/[^.!?]+[.!?]+|\s*$/g) || [p];
      for (const sentence of sentences) {
        if (!sentence.trim()) continue;
        if ((currentChunk + ' ' + sentence).length > maxChars && currentChunk.length > 0) {
          chunks.push({
            content: currentChunk.trim(),
            chunkIndex: chunkIdx++,
            section: currentSection || currentChunk.substring(0, 50) + '...',
          });
          currentChunk = currentChunk.slice(-overlap) + ' ' + sentence;
        } else {
          currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
        }
      }
      continue;
    }

    if ((currentChunk + '\n' + p).length > maxChars && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        chunkIndex: chunkIdx++,
        section: currentSection || currentChunk.substring(0, 50) + '...',
      });
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = `${overlapText}\n${p}`;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n${p}` : p;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      chunkIndex: chunkIdx++,
      section: currentSection || currentChunk.substring(0, 50) + '...',
    });
  }

  return chunks;
}

/**
 * Obtém a chave de API do Gemini a partir do banco de configurações ou do ambiente
 */
async function getGeminiApiKey(explicitKey = null) {
  if (explicitKey && explicitKey.trim()) return explicitKey.trim();
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;

  const setting = await KnowledgeSetting.findOne().lean();
  if (setting?.geminiApiKey) return setting.geminiApiKey;

  return null;
}

/**
 * Gera embeddings usando a API do Gemini com batchEmbedContents em lote e alta performance
 */
async function generateEmbeddings(texts, apiKey) {
  if (!apiKey || !texts || texts.length === 0) {
    return texts.map(() => null);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

    const embeddings = [];
    const batchSize = 25; // Até 25 trechos por requisição HTTP única

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      let batchResults = null;
      let attempts = 0;

      while (attempts < 3 && !batchResults) {
        try {
          const response = await embeddingModel.batchEmbedContents({
            requests: batch.map((t) => ({
              content: { parts: [{ text: t.slice(0, 2048) }] },
            })),
          });

          if (response?.embeddings) {
            batchResults = response.embeddings.map((e) => e.values || null);
          }
        } catch (err) {
          attempts++;
          const isRateLimit =
            err.message &&
            (err.message.includes('429') ||
              err.message.includes('QuotaFailure') ||
              err.message.includes('RESOURCE_EXHAUSTED'));

          if (isRateLimit && attempts < 3) {
            await new Promise((r) => setTimeout(r, 1500 * attempts));
          } else {
            if (attempts >= 3) {
              console.warn('[RAG] Cota de embeddings do lote excedida; os trechos serão indexados via busca textual.');
            }
            batchResults = batch.map(() => null);
          }
        }
      }

      embeddings.push(...(batchResults || batch.map(() => null)));

      if (i + batchSize < texts.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return embeddings;
  } catch (err) {
    console.error('[RAG] Erro geral na API de Embeddings:', err.message);
    return texts.map(() => null);
  }
}

/**
 * Calcula a similaridade de cosseno entre dois vetores
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Expande e contextualiza a pergunta do usuário utilizando o histórico recente da conversa
 */
async function expandQueryWithContext(query, chatHistory = [], apiKey = null) {
  if (!chatHistory || chatHistory.length === 0 || !apiKey) {
    return query;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

    const recentHistory = chatHistory.slice(-4);
    const historyText = recentHistory
      .map((m) => `${m.role === 'user' ? 'Membro' : 'Microsabedoria'}: ${m.content}`)
      .join('\n');

    const prompt = `HISTÓRICO DA CONVERSA:
${historyText}

ÚLTIMA PERGUNTA DO MEMBRO:
"${query}"

INSTRUÇÃO:
Reescreva a pergunta acima transformando-a em uma frase de busca independente e contextualizada para recuperação de documentos técnicos no acervo da equipe Microraptor.
Se a pergunta já for autoexplicativa, mantenha-a como está.
Responda EXCLUSIVAMENTE com a frase de busca reescrita, sem introduções, aspas ou comentários.`;

    const result = await model.generateContent(prompt);
    const expanded = result.response.text().trim();
    if (expanded && expanded.length > 3 && expanded.length < 300) {
      return expanded;
    }
  } catch (err) {
    // Fallback silencioso para a query original
  }

  return query;
}

/**
 * Realiza busca semântica e híbrida nos chunks da base de conhecimento com suporte a filtro por Área
 */
async function searchRelevantChunks(query, limit = 8, area = null) {
  if (!query || !query.trim()) return [];

  const apiKey = await getGeminiApiKey();
  let queryEmbedding = null;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
      const embRes = await embeddingModel.embedContent(query.slice(0, 1024));
      queryEmbedding = embRes.embedding?.values || null;
    } catch (err) {
      console.warn('[RAG] Falha ao gerar embedding da pergunta do usuário:', err.message);
    }
  }

  // Prepara filtro do MongoDB por Área se especificado
  const queryFilter = {};
  if (area && area !== 'Todas' && area !== 'Geral') {
    queryFilter.area = area;
  }

  // Busca chunks no MongoDB
  let chunks = await KnowledgeChunk.find(queryFilter)
    .select('documentName folderPath area driveUrl chunkIndex totalChunks content section embedding')
    .lean();

  // Se o filtro estrito de área retornou poucos chunks, busca em todas as áreas
  if (chunks.length < 3 && area && area !== 'Todas') {
    chunks = await KnowledgeChunk.find()
      .select('documentName folderPath area driveUrl chunkIndex totalChunks content section embedding')
      .lean();
  }

  if (!chunks || chunks.length === 0) return [];

  // Palavras-chave da consulta para ranking híbrido
  const queryWords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const scoredChunks = chunks.map((chunk) => {
    let score = 0;

    // 1. Similaridade vetorial se disponível
    if (queryEmbedding && chunk.embedding && chunk.embedding.length > 0) {
      const cosScore = cosineSimilarity(queryEmbedding, chunk.embedding);
      score += cosScore * 0.75;
    }

    // 2. BM25 / Keyword matching boost
    const contentLower = (chunk.content || '').toLowerCase();
    const docNameLower = (chunk.documentName || '').toLowerCase();
    let keywordHits = 0;

    for (const word of queryWords) {
      if (docNameLower.includes(word)) keywordHits += 2.5;
      if (contentLower.includes(word)) keywordHits += 1;
    }

    if (queryWords.length > 0) {
      const kwScore = Math.min(keywordHits / (queryWords.length * 2), 1.0);
      score += kwScore * 0.25;
    }

    // Boost se pertencer à área selecionada pelo usuário
    if (area && area !== 'Todas' && chunk.area === area) {
      score += 0.15;
    }

    return {
      ...chunk,
      score,
    };
  });

  // Filtra por pontuação mínima e ordena decrescente
  return scoredChunks
    .filter((c) => c.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Gera resposta fundamentada utilizando Gemini com RAG, expansão de consulta e filtros
 */
async function generateRAGAnswer({ query, chatHistory = [], area = 'Todas', customApiKey = null }) {
  const apiKey = await getGeminiApiKey(customApiKey);

  if (!apiKey) {
    return {
      answer: 'Chave da API do Gemini não configurada. Por favor, acesse o painel da base de conhecimento (como Administrador) e adicione uma chave válida da API do Google Gemini para utilizar a Microsabedoria.',
      sources: [],
      model: 'none',
    };
  }

  // 1. Expande a consulta com base no histórico para buscas com dependência de contexto
  const effectiveQuery = await expandQueryWithContext(query, chatHistory, apiKey);

  // 2. Recupera chunks mais relevantes
  const relevantChunks = await searchRelevantChunks(effectiveQuery, 8, area);

  // 3. Extrai fontes únicas
  const sourcesMap = new Map();
  const contextSnippets = [];

  relevantChunks.forEach((chunk, idx) => {
    const key = `${chunk.documentName}-${chunk.driveUrl}`;
    if (!sourcesMap.has(key)) {
      sourcesMap.set(key, {
        documentName: chunk.documentName,
        driveUrl: chunk.driveUrl || '',
        folderPath: chunk.folderPath || '/',
        area: chunk.area || 'Geral',
        section: chunk.section || '',
        snippet: chunk.content.substring(0, 200) + '...',
        score: Math.round(chunk.score * 100) / 100,
      });
    }

    contextSnippets.push(
      `[DOCUMENTO ${idx + 1}: "${chunk.documentName}" | Área: ${chunk.area || 'Geral'} | Pasta: ${chunk.folderPath} | Seção: ${chunk.section || 'Geral'} | Link: ${chunk.driveUrl}]\n${chunk.content}\n`
    );
  });

  const sources = Array.from(sourcesMap.values());
  const contextText = contextSnippets.join('\n---\n');

  // 4. Monta o Prompt com regras estritas de confiabilidade
  const systemInstruction = `Você é a Microsabedoria, o assistente inteligente e central de conhecimento da equipe Microraptor UFJF (equipe de competição aerodesign da Universidade Federal de Juiz de Fora).

DIRETRIZES FUNDAMENTAIS DE RESPOSTA:
1. PRIORIDADE TOTAL AOS DOCUMENTOS: Responda fundamentando-se preferencialmente nos documentos institucionais da Microraptor fornecidos no contexto.
2. CITAÇÃO DAS FONTES: Sempre que utilizar informações dos documentos, cite o nome exato do documento e, se disponível, inclua o link do Google Drive como referência.
3. NÃO ALUCINE / TRANSPARÊNCIA: Se a informação solicitada NÃO estiver documentada nos arquivos fornecidos, declare explicitamente: "Não encontrei essa informação documentada nos arquivos do Google Drive da Microraptor." Caso possa dar uma orientação geral com base em engenharia/conhecimento amplo, deixe claro que se trata de uma explicação conceitual externa aos documentos oficiais da equipe.
4. DIVERGÊNCIAS: Caso documentos diferentes apresentem informações conflitantes, aponte a divergência e indique quais arquivos mencionam cada versão.
5. FORMATAÇÃO: Formate sua resposta de forma limpa, elegante e organizada em Markdown (use tópicos, negrito, tabelas e listas quando apropriado). Nunca utilize emojis decorativos.
6. TOM DE VOZ: Profissional, prestativo, claro e alinhado aos valores e espírito de engenharia da equipe Microraptor UFJF.`;

  const userPrompt = `DOCUMENTOS DISPONÍVEIS NA BASE DE CONHECIMENTO (${area !== 'Todas' ? `Filtro de Área: ${area}` : 'Todas as Áreas'}):
${contextText ? contextText : '(Nenhum documento diretamente relevante encontrado no banco vetorial)'}

HISTÓRICO DA CONVERSA:
${chatHistory
  .slice(-6)
  .map((m) => `${m.role === 'user' ? 'Membro' : 'Microsabedoria'}: ${m.content}`)
  .join('\n')}

PERGUNTA ATUAL DO INTEGRANTE:
"${query}"

Por favor, elabore uma resposta completa, precisa e fundamentada.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    // Tenta modelos modernos e rápidos em ordem de preferência
    const modelsToTry = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
    ];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
        });

        const result = await model.generateContent(userPrompt);
        const responseText = result.response.text();

        return {
          answer: responseText,
          sources: sources.length > 0 ? sources : [],
          model: modelName,
          expandedQuery: effectiveQuery !== query ? effectiveQuery : undefined,
        };
      } catch (err) {
        lastError = err;
        console.warn(`[RAG] Falha com modelo ${modelName}, tentando próximo...:`, err.message);
      }
    }

    throw lastError || new Error('Não foi possível gerar resposta com os modelos disponíveis.');
  } catch (err) {
    console.error('[RAG] Erro ao gerar resposta com Gemini:', err.message);
    return {
      answer: `Desculpe, ocorreu um erro ao processar sua pergunta com a IA: ${err.message}. Por favor, verifique se a chave da API do Gemini está correta nas configurações da Microsabedoria.`,
      sources,
      error: err.message,
    };
  }
}

module.exports = {
  chunkText,
  getGeminiApiKey,
  generateEmbeddings,
  cosineSimilarity,
  searchRelevantChunks,
  expandQueryWithContext,
  generateRAGAnswer,
};

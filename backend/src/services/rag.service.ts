import OpenAI from 'openai';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { RAGResult, RAGSource } from '../types';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

export class RAGService {
  // ── Generate Embedding ──

  static async getEmbedding(text: string): Promise<number[]> {
    if (!config.openai.apiKey) {
      throw new AppError('OpenAI API key nao configurada', 500);
    }

    const response = await openai.embeddings.create({
      model: config.openai.embeddingModel,
      input: text.replace(/\n/g, ' ').trim(),
    });

    return response.data[0].embedding;
  }

  // ── Chunk Text ──

  static chunkText(text: string, maxChunkSize = 500, overlap = 50): string[] {
    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      if (currentChunk.length + trimmed.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        // Keep overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-overlap);
        currentChunk = overlapWords.join(' ') + '\n\n' + trimmed;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // If no paragraphs found, split by sentences
    if (chunks.length === 0 && text.trim().length > 0) {
      chunks.push(text.trim().slice(0, maxChunkSize * 4));
    }

    return chunks;
  }

  // ── Ingest Document (chunk + embed + store) ──

  static async ingestDocument(
    collectionId: string,
    title: string,
    content: string,
    source?: string,
    metadata?: any
  ) {
    // Create document
    const doc = await prisma.kBDocument.create({
      data: {
        collectionId,
        title,
        content,
        source,
        metadata,
      },
    });

    // Chunk and embed
    const chunks = this.chunkText(content);
    console.log(`[RAG] Documento "${title}": ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.getEmbedding(chunks[i]);
      const embeddingStr = `[${embedding.join(',')}]`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO kb_chunks (id, document_id, content, embedding, chunk_index, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3::vector, $4, NOW())`,
        doc.id,
        chunks[i],
        embeddingStr,
        i
      );
    }

    return { documentId: doc.id, chunks: chunks.length };
  }

  // ── Semantic Search ──

  static async search(
    query: string,
    collectionIds: string[],
    topK = 5,
    threshold = 0.3
  ): Promise<RAGSource[]> {
    if (collectionIds.length === 0) return [];

    const embedding = await this.getEmbedding(query);
    const embeddingStr = `[${embedding.join(',')}]`;

    const results: any[] = await prisma.$queryRawUnsafe(
      `SELECT c.id, c.content, c.document_id,
              d.title,
              1 - (c.embedding <=> $1::vector) as similarity
       FROM kb_chunks c
       JOIN kb_documents d ON d.id = c.document_id
       WHERE d.collection_id = ANY($2::text[])
         AND 1 - (c.embedding <=> $1::vector) > $3
       ORDER BY c.embedding <=> $1::vector
       LIMIT $4`,
      embeddingStr,
      collectionIds,
      threshold,
      topK
    );

    return results.map((r) => ({
      documentId: r.document_id,
      title: r.title,
      content: r.content,
      similarity: parseFloat(r.similarity),
    }));
  }

  // ── Query with Persona Context ──

  static async query(
    question: string,
    personaId: string,
    orgId: string,
    conversationHistory?: { role: string; content: string }[]
  ): Promise<RAGResult> {
    // Get persona with KB collections
    const persona = await prisma.persona.findFirst({
      where: { id: personaId, orgId },
      include: {
        kbCollections: {
          include: { collection: true },
        },
      },
    });

    if (!persona) throw new AppError('Persona nao encontrada', 404);

    // Get collection IDs for this persona
    const collectionIds = persona.kbCollections.map((pk) => pk.collectionId);

    // Search for relevant documents
    const sources = collectionIds.length > 0
      ? await this.search(question, collectionIds)
      : [];

    // Build context from sources
    const contextText = sources.length > 0
      ? sources
          .map((s, i) => `[Fonte ${i + 1}: ${s.title}]\n${s.content}`)
          .join('\n\n---\n\n')
      : 'Nenhum documento relevante encontrado na base de conhecimento.';

    // Build messages for GPT
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `${persona.systemPrompt}\n\n---\n\nContexto da base de conhecimento:\n${contextText}\n\n---\n\nInstrucoes adicionais:\n- Responde sempre em portugues de Portugal.\n- Se a informacao nao estiver no contexto, diz que nao tens essa informacao na base de conhecimento.\n- Cita as fontes quando relevante.\n- Se nao houver documentos relevantes e a pergunta for generica, responde com base no teu conhecimento geral, mas avisa que a informacao nao vem da base de conhecimento.`,
      },
    ];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-6); // Last 6 messages
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    messages.push({ role: 'user', content: question });

    // Generate response
    const completion = await openai.chat.completions.create({
      model: persona.model || config.openai.generationModel,
      messages,
      temperature: persona.temperature,
      max_tokens: 2000,
    });

    const answer = completion.choices[0]?.message?.content || 'Sem resposta.';

    return {
      answer,
      sources,
    };
  }
}

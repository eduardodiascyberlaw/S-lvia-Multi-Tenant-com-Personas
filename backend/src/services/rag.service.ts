import OpenAI from 'openai';
import { Prisma } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { RAGResult, RAGSource } from '../types';
import { ToolService, ToolConfig } from './tool.service';

interface RawChunkResult {
  id: string;
  content: string;
  document_id: string;
  title: string;
  similarity: string;
}

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
    metadata?: Prisma.InputJsonValue
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
    if (config.nodeEnv === "development") {
      console.log(`[RAG] Documento "${title}": ${chunks.length} chunks`);
    }

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

    const results = await prisma.$queryRawUnsafe<RawChunkResult[]>(
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
    // Get persona with KB collections and tools
    const persona = await prisma.persona.findFirst({
      where: { id: personaId, orgId },
      include: {
        kbCollections: { include: { collection: true } },
        tools: { where: { isEnabled: true } },
      },
    });

    if (!persona) throw new AppError('Persona nao encontrada', 404);

    // Get collection IDs for this persona
    const collectionIds = persona.kbCollections.map((pk) => pk.collectionId);

    // Search for relevant documents in internal KB
    const sources = collectionIds.length > 0
      ? await this.search(question, collectionIds)
      : [];

    // Build context from internal KB sources
    const contextText = sources.length > 0
      ? sources
          .map((s, i) => `[Fonte ${i + 1}: ${s.title}]\n${s.content}`)
          .join('\n\n---\n\n')
      : 'Nenhum documento relevante encontrado na base de conhecimento interna.';

    // Build messages for GPT
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `${persona.systemPrompt}\n\n---\n\nContexto da base de conhecimento:\n${contextText}\n\n---\n\nInstrucoes adicionais:\n- Responde sempre em portugues de Portugal.\n- Se a informacao nao estiver no contexto, diz que nao tens essa informacao na base de conhecimento.\n- Cita as fontes quando relevante.\n- Se nao houver documentos relevantes e a pergunta for generica, responde com base no teu conhecimento geral, mas avisa que a informacao nao vem da base de conhecimento.`,
      },
    ];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-6);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    messages.push({ role: 'user', content: question });

    // Build tool definitions for this persona
    const toolDefs = persona.tools.length > 0
      ? ToolService.getDefinitions(persona.tools.map((t) => t.toolType))
      : undefined;

    const model = persona.model || config.openai.generationModel;
    const temperature = persona.temperature;

    // First completion call
    let completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: 2000,
      ...(toolDefs ? { tools: toolDefs, tool_choice: 'auto' } : {}),
    });

    // Agentic tool-calling loop (max 5 iterations to prevent infinite loops)
    let iterations = 0;
    while (completion.choices[0]?.finish_reason === 'tool_calls' && iterations < 5) {
      iterations++;
      const toolCalls = completion.choices[0].message.tool_calls!;

      // Add assistant message with tool_calls
      messages.push(completion.choices[0].message);

      // Execute each tool call and add results
      for (const tc of toolCalls) {
        const personaTool = persona.tools.find(
          (pt) => ToolService.toolTypeName(pt.toolType) === tc.function.name
        );

        let result: string;
        try {
          result = await ToolService.execute(
            tc.function.name,
            JSON.parse(tc.function.arguments),
            (personaTool?.config ?? null) as ToolConfig | null
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          result = `Erro ao executar ferramenta ${tc.function.name}: ${message}`;
        }

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        });
      }

      // Re-call with tool results
      completion = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: 2000,
        tools: toolDefs,
        tool_choice: 'auto',
      });
    }

    const answer = completion.choices[0]?.message?.content || 'Sem resposta.';

    return { answer, sources };
  }
}

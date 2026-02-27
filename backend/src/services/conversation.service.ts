import { Prisma, ConvStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { RAGService } from './rag.service';

export class ConversationService {
  // ── List Conversations ──

  static async list(
    orgId: string,
    params: {
      page?: number;
      limit?: number;
      personaId?: string;
      channelId?: string;
      status?: string;
    }
  ) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ConversationWhereInput = { orgId };
    if (params.personaId) where.personaId = params.personaId;
    if (params.channelId) where.channelId = params.channelId;
    if (params.status) where.status = params.status as ConvStatus;

    const [items, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          persona: { select: { id: true, name: true, avatar: true } },
          channel: { select: { id: true, name: true, type: true } },
          contact: { select: { id: true, name: true, phone: true, email: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true, createdAt: true, role: true },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Get Conversation with Messages ──

  static async getById(id: string, orgId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id, orgId },
      include: {
        persona: { select: { id: true, name: true, avatar: true } },
        channel: { select: { id: true, name: true, type: true } },
        contact: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) throw new AppError('Conversa nao encontrada', 404);
    return conversation;
  }

  // ── Get or Create Conversation ──

  static async getOrCreate(params: {
    orgId: string;
    personaId: string;
    channelId?: string;
    contactId?: string;
    sessionId?: string;
  }) {
    // Try to find active conversation
    const where: Prisma.ConversationWhereInput = {
      orgId: params.orgId,
      personaId: params.personaId,
      status: 'ACTIVE',
    };

    if (params.contactId) where.contactId = params.contactId;
    if (params.sessionId) where.sessionId = params.sessionId;
    if (params.channelId) where.channelId = params.channelId;

    let conversation = await prisma.conversation.findFirst({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          orgId: params.orgId,
          personaId: params.personaId,
          channelId: params.channelId,
          contactId: params.contactId,
          sessionId: params.sessionId,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    }

    return conversation;
  }

  // ── Process Message (RAG + Response) ──

  static async processMessage(
    conversationId: string,
    orgId: string,
    userMessage: string
  ) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, orgId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!conversation) throw new AppError('Conversa nao encontrada', 404);

    // Save user message
    await prisma.message.create({
      data: {
        conversationId,
        role: 'USER',
        content: userMessage,
      },
    });

    // Build conversation history
    const history = conversation.messages
      .reverse()
      .map((m) => ({ role: m.role.toLowerCase(), content: m.content }));

    // RAG query
    const result = await RAGService.query(
      userMessage,
      conversation.personaId,
      orgId,
      history
    );

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: result.answer,
        sources: result.sources as unknown as Prisma.InputJsonValue,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      message: assistantMessage,
      sources: result.sources,
    };
  }

  // ── Test Persona (one-shot query, no conversation save) ──

  static async testPersona(personaId: string, orgId: string, question: string) {
    return RAGService.query(question, personaId, orgId);
  }
}

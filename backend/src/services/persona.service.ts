import { Prisma, ToolType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class PersonaService {
  // ── List Personas ──

  static async list(orgId: string) {
    return prisma.persona.findMany({
      where: { orgId },
      include: {
        _count: {
          select: {
            conversations: true,
            channels: true,
            kbCollections: true,
          },
        },
        kbCollections: {
          include: {
            collection: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Get Persona ──

  static async getById(id: string, orgId: string) {
    const persona = await prisma.persona.findFirst({
      where: { id, orgId },
      include: {
        kbCollections: {
          include: {
            collection: {
              select: { id: true, name: true, description: true },
            },
          },
        },
        channels: {
          include: {
            channel: {
              select: { id: true, name: true, type: true },
            },
          },
        },
        _count: {
          select: { conversations: true },
        },
      },
    });

    if (!persona) throw new AppError('Persona nao encontrada', 404);
    return persona;
  }

  // ── Create Persona ──

  static async create(
    orgId: string,
    data: {
      name: string;
      description?: string;
      systemPrompt: string;
      model?: string;
      temperature?: number;
      voiceEnabled?: boolean;
      voiceUuid?: string;
      avatar?: string;
    }
  ) {
    return prisma.persona.create({
      data: {
        orgId,
        name: data.name,
        description: data.description,
        systemPrompt: data.systemPrompt,
        model: data.model || 'gpt-4o-mini',
        temperature: data.temperature ?? 0.3,
        voiceEnabled: data.voiceEnabled ?? true,
        voiceUuid: data.voiceUuid,
        avatar: data.avatar || null,
      },
    });
  }

  // ── Update Persona ──

  static async update(
    id: string,
    orgId: string,
    data: Partial<{
      name: string;
      description: string;
      systemPrompt: string;
      model: string;
      temperature: number;
      voiceEnabled: boolean;
      voiceUuid: string;
      avatar: string;
      isActive: boolean;
    }>
  ) {
    const persona = await prisma.persona.findFirst({ where: { id, orgId } });
    if (!persona) throw new AppError('Persona nao encontrada', 404);

    return prisma.persona.update({
      where: { id },
      data,
    });
  }

  // ── Delete Persona ──

  static async delete(id: string, orgId: string) {
    const persona = await prisma.persona.findFirst({ where: { id, orgId } });
    if (!persona) throw new AppError('Persona nao encontrada', 404);

    await prisma.persona.delete({ where: { id } });
  }

  // ── Assign KB Collection to Persona ──

  static async assignCollection(personaId: string, collectionId: string, orgId: string) {
    // Verify ownership
    const persona = await prisma.persona.findFirst({ where: { id: personaId, orgId } });
    if (!persona) throw new AppError('Persona nao encontrada', 404);

    const collection = await prisma.kBCollection.findFirst({ where: { id: collectionId, orgId } });
    if (!collection) throw new AppError('Colecao nao encontrada', 404);

    return prisma.personaKB.upsert({
      where: {
        personaId_collectionId: { personaId, collectionId },
      },
      update: {},
      create: { personaId, collectionId },
    });
  }

  // ── Remove KB Collection from Persona ──

  static async removeCollection(personaId: string, collectionId: string, orgId: string) {
    const persona = await prisma.persona.findFirst({ where: { id: personaId, orgId } });
    if (!persona) throw new AppError('Persona nao encontrada', 404);

    await prisma.personaKB.deleteMany({
      where: { personaId, collectionId },
    });
  }

  // ── List Tools ──

  static async listTools(personaId: string, orgId: string) {
    const persona = await prisma.persona.findFirst({ where: { id: personaId, orgId } });
    if (!persona) throw new AppError('Persona nao encontrada', 404);

    return prisma.personaTool.findMany({
      where: { personaId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Add Tool ──

  static async addTool(
    personaId: string,
    orgId: string,
    data: { toolType: ToolType; config?: Prisma.InputJsonObject; isEnabled?: boolean }
  ) {
    const persona = await prisma.persona.findFirst({ where: { id: personaId, orgId } });
    if (!persona) throw new AppError('Persona nao encontrada', 404);

    return prisma.personaTool.upsert({
      where: {
        personaId_toolType: { personaId, toolType: data.toolType },
      },
      update: {
        config: data.config,
        isEnabled: data.isEnabled ?? true,
      },
      create: {
        personaId,
        toolType: data.toolType,
        config: data.config,
        isEnabled: data.isEnabled ?? true,
      },
    });
  }

  // ── Update Tool ──

  static async updateTool(
    personaId: string,
    toolId: string,
    orgId: string,
    data: { config?: Prisma.InputJsonObject; isEnabled?: boolean }
  ) {
    const persona = await prisma.persona.findFirst({ where: { id: personaId, orgId } });
    if (!persona) throw new AppError('Persona nao encontrada', 404);

    const tool = await prisma.personaTool.findFirst({ where: { id: toolId, personaId } });
    if (!tool) throw new AppError('Ferramenta nao encontrada', 404);

    return prisma.personaTool.update({
      where: { id: toolId },
      data: {
        ...(data.config !== undefined && { config: data.config }),
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
      },
    });
  }

  // ── Remove Tool ──

  static async removeTool(personaId: string, toolId: string, orgId: string) {
    const persona = await prisma.persona.findFirst({ where: { id: personaId, orgId } });
    if (!persona) throw new AppError('Persona nao encontrada', 404);

    await prisma.personaTool.deleteMany({ where: { id: toolId, personaId } });
  }
}

import { Prisma, ChannelType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class ChannelService {
  // ── List Channels ──

  static async list(orgId: string) {
    return prisma.channel.findMany({
      where: { orgId },
      include: {
        personas: {
          include: {
            persona: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
        _count: {
          select: { conversations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Create Channel ──

  static async create(orgId: string, data: { type: ChannelType; name: string; config?: Prisma.InputJsonValue }) {
    return prisma.channel.create({
      data: {
        orgId,
        type: data.type,
        name: data.name,
        config: data.config,
      },
    });
  }

  // ── Update Channel ──

  static async update(
    id: string,
    orgId: string,
    data: { name?: string; config?: Prisma.InputJsonValue; isActive?: boolean }
  ) {
    const channel = await prisma.channel.findFirst({ where: { id, orgId } });
    if (!channel) throw new AppError('Canal nao encontrado', 404);

    return prisma.channel.update({
      where: { id },
      data,
    });
  }

  // ── Delete Channel ──

  static async delete(id: string, orgId: string) {
    const channel = await prisma.channel.findFirst({ where: { id, orgId } });
    if (!channel) throw new AppError('Canal nao encontrado', 404);

    await prisma.channel.delete({ where: { id } });
  }

  // ── Assign Persona to Channel ──

  static async assignPersona(
    channelId: string,
    personaId: string,
    orgId: string,
    isDefault = false
  ) {
    // Verify ownership
    const channel = await prisma.channel.findFirst({ where: { id: channelId, orgId } });
    if (!channel) throw new AppError('Canal nao encontrado', 404);

    const persona = await prisma.persona.findFirst({ where: { id: personaId, orgId } });
    if (!persona) throw new AppError('Persona nao encontrada', 404);

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.channelPersona.updateMany({
        where: { channelId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.channelPersona.upsert({
      where: {
        channelId_personaId: { channelId, personaId },
      },
      update: { isDefault },
      create: { channelId, personaId, isDefault },
    });
  }

  // ── Remove Persona from Channel ──

  static async removePersona(channelId: string, personaId: string, orgId: string) {
    const channel = await prisma.channel.findFirst({ where: { id: channelId, orgId } });
    if (!channel) throw new AppError('Canal nao encontrado', 404);

    await prisma.channelPersona.deleteMany({
      where: { channelId, personaId },
    });
  }

  // ── Get Channel by Token (for public endpoints) ──

  static async getByToken(token: string) {
    const channel = await prisma.channel.findUnique({
      where: { token },
      include: {
        org: { select: { id: true, status: true } },
        personas: {
          where: { isDefault: true },
          include: {
            persona: true,
          },
        },
      },
    });

    if (!channel || !channel.isActive) {
      throw new AppError('Canal nao encontrado ou inativo', 404);
    }

    if (channel.org.status !== 'ACTIVE') {
      throw new AppError('Organizacao inativa', 403);
    }

    return channel;
  }
}

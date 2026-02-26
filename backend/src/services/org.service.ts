import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

export class OrgService {
  // ── Get Organization ──

  static async getOrg(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            users: true,
            personas: true,
            channels: true,
            conversations: true,
          },
        },
      },
    });

    if (!org) throw new AppError('Organizacao nao encontrada', 404);
    return org;
  }

  // ── Update Organization ──

  static async updateOrg(orgId: string, data: { name?: string; settings?: any }) {
    return prisma.organization.update({
      where: { id: orgId },
      data,
    });
  }

  // ── List Users ──

  static async listUsers(orgId: string) {
    return prisma.user.findMany({
      where: { orgId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Invite User ──

  static async inviteUser(
    orgId: string,
    data: { email: string; name: string; role: UserRole; password: string }
  ) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError('Email ja registado', 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    return prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role,
        orgId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  // ── Dashboard Stats ──

  static async getStats(orgId: string) {
    const [
      totalPersonas,
      activePersonas,
      totalChannels,
      activeChannels,
      totalConversations,
      activeConversations,
      totalMessages,
      totalDocuments,
      todayConversations,
      todayMessages,
    ] = await Promise.all([
      prisma.persona.count({ where: { orgId } }),
      prisma.persona.count({ where: { orgId, isActive: true } }),
      prisma.channel.count({ where: { orgId } }),
      prisma.channel.count({ where: { orgId, isActive: true } }),
      prisma.conversation.count({ where: { orgId } }),
      prisma.conversation.count({ where: { orgId, status: 'ACTIVE' } }),
      prisma.message.count({
        where: { conversation: { orgId } },
      }),
      prisma.kBDocument.count({
        where: { collection: { orgId } },
      }),
      prisma.conversation.count({
        where: {
          orgId,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.message.count({
        where: {
          conversation: { orgId },
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return {
      personas: { total: totalPersonas, active: activePersonas },
      channels: { total: totalChannels, active: activeChannels },
      conversations: { total: totalConversations, active: activeConversations, today: todayConversations },
      messages: { total: totalMessages, today: todayMessages },
      documents: { total: totalDocuments },
    };
  }
}

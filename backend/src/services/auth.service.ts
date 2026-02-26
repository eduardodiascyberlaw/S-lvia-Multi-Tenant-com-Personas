import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { JwtPayload } from '../types';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  // ── Login ──

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { org: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('Credenciais invalidas', 401);
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new AppError('Credenciais invalidas', 401);
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      orgStatus: user.org.status,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: 900, // 15 minutes
    } as jwt.SignOptions);

    const refreshToken = uuid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
        orgName: user.org.name,
      },
    };
  }

  // ── Register (creates org + owner) ──

  static async register(email: string, password: string, name: string, orgName: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('Email ja registado', 409);
    }

    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) {
      throw new AppError('Organizacao com este nome ja existe', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'OWNER',
          orgId: org.id,
        },
      });

      return { org, user };
    });

    // Auto-login after registration
    return this.login(email, password);
  }

  // ── Refresh Token ──

  static async refresh(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { org: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new AppError('Refresh token invalido ou expirado', 401);
    }

    const user = stored.user;

    // Delete old token
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      orgStatus: user.org.status,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: 900, // 15 minutes
    } as jwt.SignOptions);

    const newRefreshToken = uuid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  // ── Logout ──

  static async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  // ── Seed Super Admin ──

  static async seedSuperAdmin() {
    if (!config.superAdmin.email || !config.superAdmin.password) {
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { email: config.superAdmin.email },
    });

    if (existing) return;

    const hashedPassword = await bcrypt.hash(config.superAdmin.password, 12);

    // Create default org for super admin
    const org = await prisma.organization.upsert({
      where: { slug: 'lexcod' },
      update: {},
      create: {
        name: 'Lexcod',
        slug: 'lexcod',
        plan: 'ENTERPRISE',
      },
    });

    await prisma.user.create({
      data: {
        email: config.superAdmin.email,
        password: hashedPassword,
        name: config.superAdmin.name,
        role: 'SUPER_ADMIN',
        orgId: org.id,
      },
    });

    console.log(`[Auth] Super admin criado: ${config.superAdmin.email}`);
  }
}

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../types';
import { UserRole } from '@prisma/client';

// ── Authenticate ──

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : (req.query.token as string);

    if (!token) {
      return res.status(401).json({ success: false, error: 'Token nao fornecido' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expirado' });
    }
    return res.status(401).json({ success: false, error: 'Token invalido' });
  }
}

// ── Authorize (RBAC) ──

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Nao autenticado' });
    }

    // SUPER_ADMIN bypasses all role checks
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return res.status(403).json({ success: false, error: 'Sem permissao' });
    }

    next();
  };
}

// ── Require Active Organization ──

export function requireActiveOrg(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Nao autenticado' });
  }

  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  if (req.user.orgStatus !== 'ACTIVE') {
    return res.status(403).json({
      success: false,
      error: 'Organizacao suspensa ou cancelada',
    });
  }

  next();
}

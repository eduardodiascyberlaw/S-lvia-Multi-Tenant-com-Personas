import { Request, Response, NextFunction } from 'express';
import { OrgService } from '../services/org.service';

export class OrgController {
  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await OrgService.getOrg(req.user!.orgId);
      res.json({ success: true, data: org });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await OrgService.updateOrg(req.user!.orgId, req.body);
      res.json({ success: true, data: org });
    } catch (err) {
      next(err);
    }
  }

  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await OrgService.listUsers(req.user!.orgId);
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  static async inviteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await OrgService.inviteUser(req.user!.orgId, req.body);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  static async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await OrgService.getStats(req.user!.orgId);
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }
}

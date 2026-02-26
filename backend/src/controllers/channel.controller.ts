import { Request, Response, NextFunction } from 'express';
import { ChannelService } from '../services/channel.service';

export class ChannelController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const channels = await ChannelService.list(req.user!.orgId);
      res.json({ success: true, data: channels });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const channel = await ChannelService.create(req.user!.orgId, req.body);
      res.status(201).json({ success: true, data: channel });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const channel = await ChannelService.update(req.params.id, req.user!.orgId, req.body);
      res.json({ success: true, data: channel });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await ChannelService.delete(req.params.id, req.user!.orgId);
      res.json({ success: true, message: 'Canal eliminado' });
    } catch (err) {
      next(err);
    }
  }

  static async assignPersona(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ChannelService.assignPersona(
        req.params.id,
        req.body.personaId,
        req.user!.orgId,
        req.body.isDefault
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async removePersona(req: Request, res: Response, next: NextFunction) {
    try {
      await ChannelService.removePersona(req.params.id, req.params.personaId, req.user!.orgId);
      res.json({ success: true, message: 'Persona removida do canal' });
    } catch (err) {
      next(err);
    }
  }
}

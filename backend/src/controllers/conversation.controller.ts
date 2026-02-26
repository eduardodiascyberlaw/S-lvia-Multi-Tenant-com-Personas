import { Request, Response, NextFunction } from 'express';
import { ConversationService } from '../services/conversation.service';

export class ConversationController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ConversationService.list(req.user!.orgId, {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        personaId: req.query.personaId as string,
        channelId: req.query.channelId as string,
        status: req.query.status as string,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const conversation = await ConversationService.getById(req.params.id, req.user!.orgId);
      res.json({ success: true, data: conversation });
    } catch (err) {
      next(err);
    }
  }

  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const conversation = await ConversationService.getById(req.params.id, req.user!.orgId);
      res.json({ success: true, data: conversation.messages });
    } catch (err) {
      next(err);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { PersonaService } from '../services/persona.service';
import { ConversationService } from '../services/conversation.service';

export class PersonaController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const personas = await PersonaService.list(req.user!.orgId);
      res.json({ success: true, data: personas });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const persona = await PersonaService.getById(req.params.id, req.user!.orgId);
      res.json({ success: true, data: persona });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const persona = await PersonaService.create(req.user!.orgId, req.body);
      res.status(201).json({ success: true, data: persona });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const persona = await PersonaService.update(req.params.id, req.user!.orgId, req.body);
      res.json({ success: true, data: persona });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await PersonaService.delete(req.params.id, req.user!.orgId);
      res.json({ success: true, message: 'Persona eliminada' });
    } catch (err) {
      next(err);
    }
  }

  static async test(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ConversationService.testPersona(
        req.params.id,
        req.user!.orgId,
        req.body.question
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async assignCollection(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PersonaService.assignCollection(
        req.params.id,
        req.body.collectionId,
        req.user!.orgId
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async removeCollection(req: Request, res: Response, next: NextFunction) {
    try {
      await PersonaService.removeCollection(
        req.params.id,
        req.params.collectionId,
        req.user!.orgId
      );
      res.json({ success: true, message: 'Colecao removida da persona' });
    } catch (err) {
      next(err);
    }
  }
}

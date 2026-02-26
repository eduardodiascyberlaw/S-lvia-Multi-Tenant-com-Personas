import { Request, Response, NextFunction } from 'express';
import { KnowledgeService } from '../services/knowledge.service';

export class KnowledgeController {
  static async listCollections(req: Request, res: Response, next: NextFunction) {
    try {
      const collections = await KnowledgeService.listCollections(req.user!.orgId);
      res.json({ success: true, data: collections });
    } catch (err) {
      next(err);
    }
  }

  static async createCollection(req: Request, res: Response, next: NextFunction) {
    try {
      const collection = await KnowledgeService.createCollection(
        req.user!.orgId,
        req.body.name,
        req.body.description
      );
      res.status(201).json({ success: true, data: collection });
    } catch (err) {
      next(err);
    }
  }

  static async deleteCollection(req: Request, res: Response, next: NextFunction) {
    try {
      await KnowledgeService.deleteCollection(req.params.id, req.user!.orgId);
      res.json({ success: true, message: 'Colecao eliminada' });
    } catch (err) {
      next(err);
    }
  }

  static async listDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const docs = await KnowledgeService.listDocuments(req.params.id, req.user!.orgId);
      res.json({ success: true, data: docs });
    } catch (err) {
      next(err);
    }
  }

  static async ingestDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await KnowledgeService.ingestDocument(
        req.params.id,
        req.user!.orgId,
        req.body
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      await KnowledgeService.deleteDocument(req.params.id, req.user!.orgId);
      res.json({ success: true, message: 'Documento eliminado' });
    } catch (err) {
      next(err);
    }
  }
}

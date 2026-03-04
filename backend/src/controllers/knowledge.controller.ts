import { Request, Response, NextFunction } from 'express';
import { PDFParse } from 'pdf-parse';
import { KnowledgeService } from '../services/knowledge.service';
import { AppError } from '../middleware/errorHandler';

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

  // ── File Upload + Parse ──

  static async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      console.log(`[Upload] Recebido ficheiro: ${file?.originalname} (${file?.mimetype}, ${file?.size} bytes)`);
      if (!file) {
        throw new AppError('Nenhum ficheiro enviado', 400);
      }

      let content: string;
      const mime = file.mimetype;

      console.log(`[Upload] A extrair texto (${mime})...`);
      if (mime === 'application/pdf') {
        const parser = new PDFParse({ data: file.buffer });
        const result = await parser.getText();
        content = result.text;
      } else if (mime === 'text/plain' || mime === 'text/markdown') {
        content = file.buffer.toString('utf-8');
      } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        content = await extractDocxText(file.buffer);
      } else {
        throw new AppError(`Tipo de ficheiro nao suportado: ${mime}`, 400);
      }

      console.log(`[Upload] Texto extraido: ${content.length} caracteres`);

      if (!content || content.trim().length < 10) {
        throw new AppError('Nao foi possivel extrair texto do ficheiro. O ficheiro pode estar vazio ou protegido.', 400);
      }

      // Use original filename (without extension) as title if not provided
      const title = req.body.title || file.originalname.replace(/\.[^/.]+$/, '');
      const source = req.body.source || file.originalname;

      console.log(`[Upload] A ingerir documento "${title}" na colecao ${req.params.id}...`);
      const result = await KnowledgeService.ingestDocument(
        req.params.id,
        req.user!.orgId,
        { title, content, source }
      );

      console.log(`[Upload] Concluido: ${result.chunks} chunks criados`);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      console.error(`[Upload] Erro:`, err);
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

// ── Helper: Extract text from DOCX buffer ──

async function extractDocxText(buffer: Buffer): Promise<string> {
  // DOCX is a ZIP file. We need to find word/document.xml and extract text from XML tags.
  // Using a minimal approach without external zip library.
  try {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file('word/document.xml')?.async('string');
    if (!docXml) return '';
    // Strip XML tags, keep text content
    return docXml
      .replace(/<w:p[^>]*>/g, '\n')  // paragraph breaks
      .replace(/<w:tab\/>/g, '\t')     // tabs
      .replace(/<[^>]+>/g, '')         // strip all XML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, '\n\n')     // collapse multiple newlines
      .trim();
  } catch {
    return '';
  }
}

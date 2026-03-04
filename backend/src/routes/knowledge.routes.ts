import { Router } from 'express';
import multer from 'multer';
import { KnowledgeController } from '../controllers/knowledge.controller';
import { authenticate, authorize, requireActiveOrg } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createCollectionSchema, ingestDocumentSchema } from '../utils/validators';

const router = Router();

// Multer config for file uploads (memory storage, max 20MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de ficheiro nao suportado: ${file.mimetype}. Aceites: PDF, TXT, MD, DOCX`));
    }
  },
});

router.use(authenticate, requireActiveOrg);

router.get('/collections', KnowledgeController.listCollections);
router.post('/collections', authorize('OWNER', 'ADMIN'), validate(createCollectionSchema), KnowledgeController.createCollection);
router.delete('/collections/:id', authorize('OWNER', 'ADMIN'), KnowledgeController.deleteCollection);
router.get('/collections/:id/documents', KnowledgeController.listDocuments);
router.post('/collections/:id/documents', authorize('OWNER', 'ADMIN'), validate(ingestDocumentSchema), KnowledgeController.ingestDocument);
router.post('/collections/:id/documents/upload', authorize('OWNER', 'ADMIN'), upload.single('file'), KnowledgeController.uploadDocument);
router.delete('/documents/:id', authorize('OWNER', 'ADMIN'), KnowledgeController.deleteDocument);

export default router;

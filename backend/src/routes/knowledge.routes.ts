import { Router } from 'express';
import { KnowledgeController } from '../controllers/knowledge.controller';
import { authenticate, authorize, requireActiveOrg } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createCollectionSchema, ingestDocumentSchema } from '../utils/validators';

const router = Router();

router.use(authenticate, requireActiveOrg);

router.get('/collections', KnowledgeController.listCollections);
router.post('/collections', authorize('OWNER', 'ADMIN'), validate(createCollectionSchema), KnowledgeController.createCollection);
router.delete('/collections/:id', authorize('OWNER', 'ADMIN'), KnowledgeController.deleteCollection);
router.get('/collections/:id/documents', KnowledgeController.listDocuments);
router.post('/collections/:id/documents', authorize('OWNER', 'ADMIN'), validate(ingestDocumentSchema), KnowledgeController.ingestDocument);
router.delete('/documents/:id', authorize('OWNER', 'ADMIN'), KnowledgeController.deleteDocument);

export default router;

import { Router } from 'express';
import { ConversationController } from '../controllers/conversation.controller';
import { authenticate, requireActiveOrg } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireActiveOrg);

router.get('/', ConversationController.list);
router.get('/:id', ConversationController.getById);
router.get('/:id/messages', ConversationController.getMessages);

export default router;

import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

// Webhooks are public (validated by secret/signature)
router.post('/whatsapp', WebhookController.whatsapp);
router.post('/email', WebhookController.email);

export default router;

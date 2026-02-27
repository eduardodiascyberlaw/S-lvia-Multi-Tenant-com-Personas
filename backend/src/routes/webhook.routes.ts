import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

// Webhooks são públicos (validados pelo token na URL ou assinatura)
// URL WhatsApp por canal: /api/webhooks/whatsapp/:channelToken
// Configurar no Z-API como: https://seu-dominio/api/webhooks/whatsapp/{channel.token}
router.post('/whatsapp/:channelToken', WebhookController.whatsapp);
router.post('/email', WebhookController.email);

export default router;

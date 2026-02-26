import { Request, Response, NextFunction } from 'express';

export class WebhookController {
  // ── WhatsApp (Z-API) ──
  // TODO: Implement in Sprint 2

  static async whatsapp(req: Request, res: Response, _next: NextFunction) {
    console.log('[Webhook] WhatsApp:', JSON.stringify(req.body).slice(0, 200));
    // Acknowledge immediately
    res.status(200).json({ status: 'received' });
  }

  // ── Email ──
  // TODO: Implement in Sprint 2

  static async email(req: Request, res: Response, _next: NextFunction) {
    console.log('[Webhook] Email:', JSON.stringify(req.body).slice(0, 200));
    res.status(200).json({ status: 'received' });
  }
}

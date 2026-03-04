import { Request, Response, NextFunction } from 'express';
import { ChannelService } from '../services/channel.service';
import { EvolutionService } from '../services/evolution.service';
import { prisma } from '../utils/prisma';
import { config } from '../config';

interface EvolutionChannelConfig {
  serverUrl?: string;
  apiKey?: string;
  instanceName?: string;
}

export class ChannelController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const channels = await ChannelService.list(req.user!.orgId);
      res.json({ success: true, data: channels });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const channel = await ChannelService.create(req.user!.orgId, req.body);
      res.status(201).json({ success: true, data: channel });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const channel = await ChannelService.update(req.params.id, req.user!.orgId, req.body);
      res.json({ success: true, data: channel });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await ChannelService.delete(req.params.id, req.user!.orgId);
      res.json({ success: true, message: 'Canal eliminado' });
    } catch (err) {
      next(err);
    }
  }

  static async assignPersona(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ChannelService.assignPersona(
        req.params.id,
        req.body.personaId,
        req.user!.orgId,
        req.body.isDefault
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async removePersona(req: Request, res: Response, next: NextFunction) {
    try {
      await ChannelService.removePersona(req.params.id, req.params.personaId, req.user!.orgId);
      res.json({ success: true, message: 'Persona removida do canal' });
    } catch (err) {
      next(err);
    }
  }

  // ── WhatsApp: Conectar via Evolution API (QR Code) ────────────────────

  static async connectWhatsApp(req: Request, res: Response, next: NextFunction) {
    try {
      const channel = await prisma.channel.findFirst({
        where: { id: req.params.id, orgId: req.user!.orgId, type: 'WHATSAPP' },
      });
      if (!channel) {
        res.status(404).json({ success: false, error: 'Canal WhatsApp nao encontrado' });
        return;
      }

      const cfg = (channel.config ?? {}) as EvolutionChannelConfig;

      // Gera instanceName se não existir
      const instanceName = cfg.instanceName || `silvia-${channel.id.slice(0, 8)}`;

      // Webhook URL para este canal (usa API_BASE_URL público)
      const backendUrl = config.apiBaseUrl
        || config.cors.origin.replace(/:\d+$/, `:${config.port}`);
      const webhookUrl = `${backendUrl}/api/webhooks/whatsapp/${channel.id}`;

      let qrCode: string | null = null;
      let instanceApiKey = cfg.apiKey ?? '';

      if (cfg.instanceName) {
        // Instância já existe — apagar e recriar para obter QR code novo
        try {
          await EvolutionService.deleteInstance(instanceName);
        } catch {
          // Pode falhar se não existe, ignorar
        }
      }

      const result = await EvolutionService.createInstance(instanceName, webhookUrl);
      qrCode = result.qrCode;
      instanceApiKey = result.apiKey;

      // Guarda config actualizado no canal
      await prisma.channel.update({
        where: { id: channel.id },
        data: {
          config: {
            serverUrl: config.whatsapp.evolution.serverUrl,
            apiKey: instanceApiKey,
            instanceName,
          },
        },
      });

      res.json({
        success: true,
        data: {
          qrCode,
          instanceName,
          status: 'connecting',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // ── WhatsApp: Estado da conexão ────────────────────────────────────────

  static async getWhatsAppStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const channel = await prisma.channel.findFirst({
        where: { id: req.params.id, orgId: req.user!.orgId, type: 'WHATSAPP' },
      });
      if (!channel) {
        res.status(404).json({ success: false, error: 'Canal WhatsApp nao encontrado' });
        return;
      }

      const cfg = (channel.config ?? {}) as EvolutionChannelConfig;
      if (!cfg.instanceName) {
        res.json({ success: true, data: { status: 'not_configured' } });
        return;
      }

      const result = await EvolutionService.getConnectionState(cfg.instanceName);
      res.json({ success: true, data: { status: result.state } });
    } catch (err) {
      next(err);
    }
  }
}

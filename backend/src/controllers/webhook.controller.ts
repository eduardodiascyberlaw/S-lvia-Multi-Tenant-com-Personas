import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { ConversationService } from "../services/conversation.service";
import { config } from "../config";

// ── Tipos Z-API ───────────────────────────────────────────────────────────────

interface ZApiPayload {
  type: string;
  fromMe: boolean;
  text?: { message: string };
  phone: string;
  participantPhone?: string;
  senderName?: string;
  chatName?: string;
  isGroup?: boolean;
}

interface ZApiChannelConfig {
  instanceId: string;
  token: string;
}

// ── Z-API send message helper ────────────────────────────────────────────────

async function zapiSendText(
  instanceId: string,
  token: string,
  phone: string,
  message: string
): Promise<void> {
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[Webhook] Z-API send error ${res.status}: ${body}`);
  }
}

// ── WhatsApp (Z-API) ─────────────────────────────────────────────────────────

export class WebhookController {
  static async whatsapp(req: Request, res: Response, _next: NextFunction) {
    // Acknowledge immediately — Z-API espera 200 em < 5s
    res.status(200).json({ status: "received" });

    try {
      const payload = req.body as ZApiPayload;

      // Só processa mensagens recebidas com texto
      if (
        payload.type !== "ReceivedCallback" ||
        payload.fromMe === true ||
        !payload.text?.message
      ) {
        return;
      }

      const userMessage = payload.text.message.trim();
      if (!userMessage) return;

      // Identifica o canal pelo token na URL (/api/webhooks/whatsapp/:channelToken)
      const channelToken = req.params.channelToken;
      if (!channelToken) {
        console.warn("[Webhook] WhatsApp recebido sem channelToken na URL");
        return;
      }

      const channel = await prisma.channel.findUnique({
        where: { token: channelToken },
        include: {
          personas: {
            where: { isDefault: true },
            include: { persona: true },
            take: 1,
          },
        },
      });

      if (!channel || !channel.isActive) {
        console.warn("[Webhook] Canal não encontrado ou inactivo");
        return;
      }

      const channelPersona = channel.personas[0];
      if (!channelPersona) {
        console.warn(`[Webhook] Canal ${channel.name} sem persona default configurada`);
        return;
      }

      const persona = channelPersona.persona;
      const isGroup = payload.isGroup === true;

      // chatPhone = destinatário da resposta (grupo ou individual)
      const chatPhone = payload.phone;
      const senderName = payload.senderName ?? null;

      // Cria ou encontra o contacto externo (grupo ou indivíduo)
      const contact = await prisma.externalContact.upsert({
        where: { orgId_phone: { orgId: channel.orgId, phone: chatPhone } },
        update: { name: isGroup ? (payload.chatName ?? null) : senderName },
        create: {
          orgId: channel.orgId,
          phone: chatPhone,
          name: isGroup ? (payload.chatName ?? null) : senderName,
          metadata: isGroup
            ? { isGroup: true, lastSenderName: payload.senderName ?? "" }
            : undefined,
        },
      });

      // Obtém ou cria a conversa activa
      const conversation = await ConversationService.getOrCreate({
        orgId: channel.orgId,
        personaId: persona.id,
        channelId: channel.id,
        contactId: contact.id,
      });

      // Processa a mensagem e obtém resposta
      const result = await ConversationService.processMessage(
        conversation.id,
        channel.orgId,
        userMessage
      );

      const answer = result.message.content;
      if (!answer) return;

      // Envia resposta via Z-API
      const zapiConfig = channel.config as ZApiChannelConfig | null;

      if (!zapiConfig?.instanceId || !zapiConfig?.token) {
        console.error(`[Webhook] Canal ${channel.name} sem instanceId/token Z-API no config`);
        return;
      }

      await zapiSendText(zapiConfig.instanceId, zapiConfig.token, chatPhone, answer);

      if (config.nodeEnv === "development") {
        console.log(`[Webhook] Resposta enviada | canal=${channel.name} | persona=${persona.name} | chars=${answer.length}`);
      }
    } catch (err) {
      console.error("[Webhook] Erro ao processar WhatsApp:", err);
    }
  }

  // ── Email ────────────────────────────────────────────────────────────────
  // TODO: Implement in Sprint 3

  static async email(req: Request, res: Response, _next: NextFunction) {
    if (config.nodeEnv === "development") {
      console.log("[Webhook] Email recebido");
    }
    res.status(200).json({ status: "received" });
  }
}

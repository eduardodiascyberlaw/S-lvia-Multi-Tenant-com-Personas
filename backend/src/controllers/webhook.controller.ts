import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { ConversationService } from "../services/conversation.service";
import { config } from "../config";

// ── Tipos Evolution API ──────────────────────────────────────────────────────

interface EvolutionPayload {
  event: string;
  instance: string;
  data: {
    key: {
      id: string;
      fromMe: boolean;
      remoteJid: string;
      participant?: string; // presente em grupos
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text: string };
    };
    messageType?: string;
  };
}

interface EvolutionChannelConfig {
  serverUrl: string;   // URL do servidor Evolution API (ex: http://localhost:8080)
  apiKey: string;      // API key da instância
  instanceName: string; // Nome da instância no Evolution API
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extrai número de telefone limpo a partir do JID do WhatsApp */
function phoneFromJid(jid: string): string {
  return jid.replace(/@.*$/, "");
}

/** Verifica se é um grupo pelo JID */
function isGroupJid(jid: string): boolean {
  return jid.endsWith("@g.us");
}

/** Extrai texto da mensagem (suporta texto simples e extendido) */
function extractText(message?: EvolutionPayload["data"]["message"]): string {
  if (!message) return "";
  return (message.conversation || message.extendedTextMessage?.text || "").trim();
}

// ── Evolution API send message helper ────────────────────────────────────────

async function evolutionSendText(
  serverUrl: string,
  apiKey: string,
  instanceName: string,
  phone: string,
  message: string
): Promise<void> {
  const url = `${serverUrl}/message/sendText/${instanceName}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({ number: phone, text: message }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[Webhook] Evolution API send error ${res.status}: ${body}`);
  }
}

// ── WhatsApp (Evolution API) ─────────────────────────────────────────────────

export class WebhookController {
  static async whatsapp(req: Request, res: Response, _next: NextFunction) {
    // Acknowledge immediately
    res.status(200).json({ status: "received" });

    try {
      const payload = req.body as EvolutionPayload;

      console.log(`[Webhook] Evento recebido: ${payload.event} | instance: ${payload.instance}`);

      // Só processa mensagens recebidas (messages.upsert) que não sejam nossas
      // Evolution API envia como "messages.upsert" (lowercase com ponto)
      if (
        payload.event !== "messages.upsert" ||
        payload.data?.key?.fromMe === true
      ) {
        return;
      }

      const userMessage = extractText(payload.data?.message);
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
      const remoteJid = payload.data.key.remoteJid;
      const isGroup = isGroupJid(remoteJid);
      const chatPhone = phoneFromJid(remoteJid);
      const senderName = payload.data.pushName ?? null;

      // Cria ou encontra o contacto externo (grupo ou indivíduo)
      const contact = await prisma.externalContact.upsert({
        where: { orgId_phone: { orgId: channel.orgId, phone: chatPhone } },
        update: { name: senderName },
        create: {
          orgId: channel.orgId,
          phone: chatPhone,
          name: senderName,
          metadata: isGroup
            ? { isGroup: true, lastSenderName: senderName ?? "" }
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

      // Envia resposta via Evolution API
      const evoConfig = channel.config as EvolutionChannelConfig | null;

      if (!evoConfig?.serverUrl || !evoConfig?.apiKey || !evoConfig?.instanceName) {
        console.error(`[Webhook] Canal ${channel.name} sem configuração Evolution API`);
        return;
      }

      await evolutionSendText(evoConfig.serverUrl, evoConfig.apiKey, evoConfig.instanceName, chatPhone, answer);

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

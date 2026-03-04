import { config } from '../config';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface CreateInstanceResponse {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
  };
  hash: { apikey: string };
  qrcode?: { code: string; base64: string };
}

interface ConnectResponse {
  pairingCode?: string;
  code?: string;
  base64?: string;
}

interface ConnectionStateResponse {
  instance: {
    instanceName: string;
    state: string; // "open" | "close" | "connecting"
  };
}

// ── Service ──────────────────────────────────────────────────────────────────

export class EvolutionService {
  private static get serverUrl(): string {
    return config.whatsapp.evolution.serverUrl.replace(/\/$/, '');
  }

  private static get apiKey(): string {
    return config.whatsapp.evolution.apiKey;
  }

  private static async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.serverUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: this.apiKey,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Evolution API ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Cria instância no Evolution API com QR code.
   * Também configura o webhook para receber mensagens.
   */
  static async createInstance(
    instanceName: string,
    webhookUrl: string
  ): Promise<{ qrCode: string | null; instanceId: string; apiKey: string }> {
    const data = await this.request<CreateInstanceResponse>(
      'POST',
      '/instance/create',
      {
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        rejectCall: false,
        groupsIgnore: true,
        alwaysOnline: false,
        readMessages: false,
        readStatus: false,
        syncFullHistory: false,
      }
    );

    // Configura webhook na instância
    await this.setWebhook(instanceName, webhookUrl).catch((err) => {
      console.error(`[Evolution] Erro ao configurar webhook: ${err.message}`);
    });

    return {
      qrCode: data.qrcode?.base64 ?? null,
      instanceId: data.instance.instanceId,
      apiKey: data.hash.apikey,
    };
  }

  /**
   * Gera novo QR code para instância existente (reconexão).
   */
  static async connectInstance(
    instanceName: string
  ): Promise<{ qrCode: string | null }> {
    const data = await this.request<ConnectResponse>(
      'GET',
      `/instance/connect/${instanceName}`
    );

    return {
      qrCode: data.base64 ?? null,
    };
  }

  /**
   * Verifica o estado da conexão da instância.
   */
  static async getConnectionState(
    instanceName: string
  ): Promise<{ state: string }> {
    try {
      const data = await this.request<ConnectionStateResponse>(
        'GET',
        `/instance/connectionState/${instanceName}`
      );
      return { state: data.instance.state };
    } catch {
      return { state: 'close' };
    }
  }

  /**
   * Configura o webhook da instância para receber eventos.
   */
  static async setWebhook(
    instanceName: string,
    webhookUrl: string
  ): Promise<void> {
    await this.request('POST', `/webhook/set/${instanceName}`, {
      url: webhookUrl,
      events: ['MESSAGES_UPSERT'],
      enabled: true,
      webhookByEvents: false,
      webhookBase64: false,
    });
  }
}

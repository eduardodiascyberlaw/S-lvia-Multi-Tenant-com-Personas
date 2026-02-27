import Stripe from 'stripe';
import OpenAI from 'openai';
import { ToolType } from '@prisma/client';
import { config } from '../config';

// ── Tipos internos ────────────────────────────────────────────────────────────

interface ToolArgs {
  email?: string;
  product?: string;
  query?: string;
  tribunal?: string;
  date_from?: string;
  date_to?: string;
}

export interface ToolConfig {
  paymentLinks?: Record<string, string>;
}

interface LexCorpusResult {
  tribunal?: string;
  processo?: string;
  data_acordao?: string;
  relator?: string;
  sumario?: string;
  url?: string;
  similarity?: number | string;
  title?: string;
  content?: string;
}

interface LexCorpusResponse {
  data?: {
    results?: LexCorpusResult[];
  };
}

// ── Tool definitions para o OpenAI ──────────────────────────────────────────

const TOOL_DEFINITIONS: Record<ToolType, OpenAI.ChatCompletionTool> = {
  STRIPE_CHECK_PAYMENT: {
    type: "function",
    function: {
      name: "stripe_check_payment",
      description:
        "Verifica o estado da subscrição/pagamento de um aluno no Stripe pelo email.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Email do aluno" },
        },
        required: ["email"],
      },
    },
  },

  STRIPE_SEND_PAYMENT_LINK: {
    type: "function",
    function: {
      name: "stripe_send_payment_link",
      description:
        "Obtém o link de pagamento para um curso ou produto específico.",
      parameters: {
        type: "object",
        properties: {
          product: {
            type: "string",
            description: "Nome ou identificador do curso/produto",
          },
        },
        required: ["product"],
      },
    },
  },

  TRIBUNAIS_SEARCH: {
    type: "function",
    function: {
      name: "tribunais_search",
      description:
        "Pesquisa jurisprudência dos tribunais administrativos portugueses (STA, TCAN, TCAS, TC). Usa quando precisas de fundamentar com acórdãos.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Descrição da questão jurídica a pesquisar" },
          tribunal: {
            type: "string",
            description: "Filtro por tribunal: STA, TCAN, TCAS, TC, TRL, TRP, TRC (opcional)",
          },
          date_from: { type: "string", description: "Data início no formato YYYY-MM-DD (opcional)" },
          date_to: { type: "string", description: "Data fim no formato YYYY-MM-DD (opcional)" },
        },
        required: ["query"],
      },
    },
  },

  LEGISLACAO_SEARCH: {
    type: "function",
    function: {
      name: "legislacao_search",
      description:
        "Pesquisa legislação portuguesa (CPTA, CPA, CPPT, etc.). Usa para encontrar artigos a citar inline na resposta.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Descrição da norma ou matéria a pesquisar" },
        },
        required: ["query"],
      },
    },
  },
};

// ── Executor ─────────────────────────────────────────────────────────────────

export class ToolService {
  static getDefinitions(toolTypes: ToolType[]): OpenAI.ChatCompletionTool[] {
    return toolTypes.map((t) => TOOL_DEFINITIONS[t]).filter(Boolean);
  }

  static toolTypeName(toolType: ToolType): string {
    return TOOL_DEFINITIONS[toolType]?.function.name ?? toolType.toLowerCase();
  }

  static async execute(
    toolName: string,
    args: ToolArgs,
    toolConfig: ToolConfig | null
  ): Promise<string> {
    switch (toolName) {
      case "stripe_check_payment":
        return ToolService.stripeCheckPayment(args.email ?? "");
      case "stripe_send_payment_link":
        return ToolService.stripeSendPaymentLink(args.product ?? "", toolConfig);
      case "tribunais_search":
        return ToolService.tribunaisSearch(args.query ?? "", args.tribunal, args.date_from, args.date_to);
      case "legislacao_search":
        return ToolService.legislacaoSearch(args.query ?? "");
      default:
        return `Ferramenta desconhecida: ${toolName}`;
    }
  }

  // ── Stripe: verificar pagamento ──────────────────────────────────────────

  private static async stripeCheckPayment(email: string): Promise<string> {
    if (!config.stripe.secretKey) return "Stripe não configurado.";

    const stripe = new Stripe(config.stripe.secretKey);

    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) {
      return JSON.stringify({ found: false, message: "Nenhum cliente encontrado com este email." });
    }

    const customer = customers.data[0];
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 5,
      expand: ["data.items.data.price.product"],
    });

    if (!subscriptions.data.length) {
      return JSON.stringify({
        found: true,
        customer: customer.name || customer.email,
        subscriptions: [],
        message: "Cliente existe mas sem subscrições.",
      });
    }

    const subs = subscriptions.data.map((s: Stripe.Subscription) => {
      const priceItem = s.items?.data?.[0];
      const product = priceItem?.price?.product as Stripe.Product | undefined;
      const periodEnd = (s as unknown as { current_period_end?: number }).current_period_end;
      return {
        status: s.status,
        product: product?.name ?? priceItem?.price?.nickname ?? priceItem?.price?.id ?? "Desconhecido",
        current_period_end: periodEnd
          ? new Date(periodEnd * 1000).toLocaleDateString("pt-PT")
          : null,
        cancel_at_period_end: s.cancel_at_period_end ?? false,
      };
    });

    return JSON.stringify({ found: true, customer: customer.name || customer.email, subscriptions: subs });
  }

  // ── Stripe: enviar link de pagamento ────────────────────────────────────

  private static async stripeSendPaymentLink(
    product: string,
    toolConfig: ToolConfig | null
  ): Promise<string> {
    if (toolConfig?.paymentLinks) {
      const key = product.toLowerCase().replace(/[\s-]+/g, "_");
      const entries = Object.entries(toolConfig.paymentLinks);
      const match = entries.find(([k]) => k.includes(key) || key.includes(k));
      if (match) return match[1];
    }

    if (!config.stripe.secretKey) return "Stripe não configurado.";

    const stripe = new Stripe(config.stripe.secretKey);

    const products = await stripe.products.search({
      query: `name~"${product}"`,
      limit: 3,
    });

    if (!products.data.length) {
      return `Produto "${product}" não encontrado.`;
    }

    const prices = await stripe.prices.list({
      product: products.data[0].id,
      active: true,
      limit: 1,
    });

    if (!prices.data.length) {
      return `Produto "${products.data[0].name}" sem preços activos.`;
    }

    const priceId = prices.data[0].id;

    const paymentLinks = await stripe.paymentLinks.list({ active: true });
    const existing = paymentLinks.data.find(
      (pl) => (pl.metadata as Record<string, string>)?.price_id === priceId
    );

    if (existing) return existing.url;

    const link = await stripe.paymentLinks.create({
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { price_id: priceId },
    });

    return link.url;
  }

  // ── Lex Corpus: jurisprudência ───────────────────────────────────────────

  private static async tribunaisSearch(
    query: string,
    tribunal?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<string> {
    const baseUrl = config.lexCorpus.url;
    if (!baseUrl) return "Lex Corpus não configurado.";

    const body: Record<string, unknown> = { query, contentType: "jurisprudencia", topK: 5 };
    if (tribunal) body.tribunal = tribunal;
    if (dateFrom) body.dateFrom = dateFrom;
    if (dateTo) body.dateTo = dateTo;

    const res = await fetch(`${baseUrl}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return `Erro ao pesquisar jurisprudência: ${res.status}`;

    const data = await res.json() as LexCorpusResponse;
    const results = data?.data?.results ?? [];

    if (!results.length) return "Nenhuma decisão relevante encontrada.";

    return JSON.stringify(
      results.map((r) => ({
        tribunal: r.tribunal,
        processo: r.processo,
        data: r.data_acordao,
        relator: r.relator,
        sumario: r.sumario ? r.sumario.slice(0, 400) : null,
        url: r.url,
        similarity: r.similarity ? parseFloat(String(r.similarity)).toFixed(2) : null,
      }))
    );
  }

  // ── Lex Corpus: legislação ───────────────────────────────────────────────

  private static async legislacaoSearch(query: string): Promise<string> {
    const baseUrl = config.lexCorpus.url;
    if (!baseUrl) return "Lex Corpus não configurado.";

    const res = await fetch(`${baseUrl}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, contentType: "legislacao", topK: 5 }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return `Erro ao pesquisar legislação: ${res.status}`;

    const data = await res.json() as LexCorpusResponse;
    const results = data?.data?.results ?? [];

    if (!results.length) return "Nenhuma norma relevante encontrada.";

    return JSON.stringify(
      results.map((r) => ({
        titulo: r.title,
        conteudo: r.content ? r.content.slice(0, 600) : null,
        similarity: r.similarity ? parseFloat(String(r.similarity)).toFixed(2) : null,
      }))
    );
  }
}

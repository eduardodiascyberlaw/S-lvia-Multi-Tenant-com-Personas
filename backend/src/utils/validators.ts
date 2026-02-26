import { z } from 'zod';

// ── Auth ──

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Password deve ter pelo menos 6 caracteres'),
});

export const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Password deve ter pelo menos 6 caracteres'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  orgName: z.string().min(2, 'Nome da organizacao deve ter pelo menos 2 caracteres'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ── Organization ──

export const updateOrgSchema = z.object({
  name: z.string().min(2).optional(),
  settings: z.record(z.any()).optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email('Email invalido'),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'MEMBER']),
  password: z.string().min(6),
});

// ── Personas ──

export const createPersonaSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  description: z.string().optional(),
  systemPrompt: z.string().min(10, 'System prompt deve ter pelo menos 10 caracteres'),
  model: z.string().default('gpt-4o-mini'),
  temperature: z.number().min(0).max(2).default(0.3),
  voiceEnabled: z.boolean().default(true),
  voiceUuid: z.string().optional(),
  avatar: z.string().url().optional().or(z.literal('')),
});

export const updatePersonaSchema = createPersonaSchema.partial();

// ── Knowledge Base ──

export const createCollectionSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  description: z.string().optional(),
});

export const ingestDocumentSchema = z.object({
  title: z.string().min(1, 'Titulo e obrigatorio'),
  content: z.string().min(10, 'Conteudo deve ter pelo menos 10 caracteres'),
  source: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// ── Channels ──

export const createChannelSchema = z.object({
  type: z.enum(['WHATSAPP', 'WEBCHAT', 'EMAIL']),
  name: z.string().min(1, 'Nome e obrigatorio'),
  config: z.record(z.any()).optional(),
});

export const updateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  config: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export const assignPersonaSchema = z.object({
  personaId: z.string().uuid('ID de persona invalido'),
  isDefault: z.boolean().default(false),
});

// ── Conversations ──

export const testPersonaSchema = z.object({
  question: z.string().min(1, 'Pergunta e obrigatoria'),
});

// ── Voice ──

export const synthesizeSchema = z.object({
  text: z.string().min(1).max(5000, 'Texto nao pode exceder 5000 caracteres'),
  voiceUuid: z.string().optional(),
});

// ── Web Chat ──

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Mensagem e obrigatoria').max(2000),
  sessionId: z.string().optional(),
});

export const chatStartSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

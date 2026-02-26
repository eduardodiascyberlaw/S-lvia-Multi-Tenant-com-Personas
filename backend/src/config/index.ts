import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3002'),
  nodeEnv: process.env.NODE_ENV || 'development',

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5174',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'silvia-dev-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'silvia-dev-refresh',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  database: {
    url: process.env.DATABASE_URL || '',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    generationModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    whisperModel: process.env.WHISPER_MODEL || 'whisper-1',
  },

  voice: {
    enabled: process.env.VOICE_ENABLED === 'true',
    resemble: {
      apiKey: process.env.RESEMBLE_API_KEY || '',
      defaultVoiceUuid: process.env.RESEMBLE_VOICE_UUID || '',
      syncUrl: process.env.RESEMBLE_SYNC_URL || 'https://f.cluster.resemble.ai/synthesize',
    },
  },

  whatsapp: {
    zapi: {
      instanceId: process.env.ZAPI_INSTANCE_ID || '',
      token: process.env.ZAPI_TOKEN || '',
      webhookSecret: process.env.ZAPI_WEBHOOK_SECRET || '',
    },
  },

  email: {
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    imap: {
      host: process.env.IMAP_HOST || '',
      port: parseInt(process.env.IMAP_PORT || '993'),
      user: process.env.IMAP_USER || '',
      pass: process.env.IMAP_PASS || '',
    },
  },

  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@lexcod.pt',
    password: process.env.SUPER_ADMIN_PASSWORD || '',
    name: process.env.SUPER_ADMIN_NAME || 'Admin',
  },
};

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { AuthService } from './services/auth.service';

// Routes
import authRoutes from './routes/auth.routes';
import orgRoutes from './routes/org.routes';
import personaRoutes from './routes/persona.routes';
import knowledgeRoutes from './routes/knowledge.routes';
import conversationRoutes from './routes/conversation.routes';
import channelRoutes from './routes/channel.routes';
import voiceRoutes from './routes/voice.routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();

// ── Security ──
app.use(helmet());
const allowedOrigins = config.cors.origin.split(',').map((o) => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin || true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));

// ── Rate Limiting ──
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Demasiados pedidos. Tente novamente mais tarde.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Demasiadas tentativas. Tente novamente mais tarde.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// ── Body Parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'silvia-backend',
      timestamp: new Date().toISOString(),
    },
  });
});

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/webhooks', webhookRoutes);

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Rota nao encontrada' });
});

// ── Error Handler ──
app.use(errorHandler);

// ── Start ──
async function start() {
  try {
    console.log('═══════════════════════════════════════════');
    console.log('  Silvia Platform — Backend');
    console.log(`  Ambiente: ${config.nodeEnv}`);
    console.log('═══════════════════════════════════════════');

    // Seed super admin
    await AuthService.seedSuperAdmin();

    app.listen(config.port, () => {
      console.log(`[Server] A escutar na porta ${config.port}`);
      console.log(`[Server] Voice: ${config.voice.enabled ? 'ATIVO' : 'INATIVO'}`);
      console.log(`[Server] OpenAI: ${config.openai.apiKey ? 'CONFIGURADO' : 'NAO CONFIGURADO'}`);
    });
  } catch (err) {
    console.error('[Server] Erro ao iniciar:', err);
    process.exit(1);
  }
}

start();

export default app;

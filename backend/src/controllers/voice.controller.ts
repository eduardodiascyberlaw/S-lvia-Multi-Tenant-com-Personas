import { Request, Response, NextFunction } from 'express';
import { VoiceService } from '../services/voice.service';
import { ConversationService } from '../services/conversation.service';
import { prisma } from '../utils/prisma';

export class VoiceController {
  // ── Health ──

  static async health(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { voiceEnabled: VoiceService.isEnabled() },
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Transcribe ──

  static async transcribe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!VoiceService.isEnabled()) {
        return res.status(503).json({ success: false, error: 'Voz nao esta ativa' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'Ficheiro de audio obrigatorio' });
      }

      const language = (req.body.language as string) || 'pt';
      const result = await VoiceService.transcribe(file.buffer, file.mimetype, language);

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // ── Synthesize ──

  static async synthesize(req: Request, res: Response, next: NextFunction) {
    try {
      if (!VoiceService.isEnabled()) {
        return res.status(503).json({ success: false, error: 'Voz nao esta ativa' });
      }

      const { text, voiceUuid } = req.body;
      const result = await VoiceService.synthesize(text, voiceUuid);

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // ── Voice Ask (STT → RAG → TTS combined) ──

  static async voiceAsk(req: Request, res: Response, next: NextFunction) {
    try {
      if (!VoiceService.isEnabled()) {
        return res.status(503).json({ success: false, error: 'Voz nao esta ativa' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'Ficheiro de audio obrigatorio' });
      }

      const { personaId, conversationId } = req.body;
      const language = (req.body.language as string) || 'pt';

      if (!personaId) {
        return res.status(400).json({ success: false, error: 'personaId obrigatorio' });
      }

      // 1. STT
      const transcription = await VoiceService.transcribe(file.buffer, file.mimetype, language);

      if (!transcription.text || transcription.text.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Nao foi possivel transcrever o audio' });
      }

      // 2. Get or create conversation
      let convId = conversationId;
      if (!convId) {
        const conv = await ConversationService.getOrCreate({
          orgId: req.user!.orgId,
          personaId,
        });
        convId = conv.id;
      }

      // 3. RAG
      const ragResult = await ConversationService.processMessage(
        convId,
        req.user!.orgId,
        transcription.text
      );

      // 4. TTS (graceful fallback)
      let audio: { base64: string; contentType: string } | null = null;
      try {
        const persona = await prisma.persona.findUnique({ where: { id: personaId } });
        if (persona?.voiceEnabled) {
          const synthesis = await VoiceService.synthesize(
            ragResult.message.content,
            persona.voiceUuid || undefined
          );
          audio = { base64: synthesis.audioBase64, contentType: synthesis.contentType };
        }
      } catch (ttsErr) {
        console.error('[Voice] TTS fallback - continuing without audio:', ttsErr);
      }

      res.json({
        success: true,
        data: {
          pergunta: transcription.text,
          resposta: ragResult.message.content,
          fontes: ragResult.sources,
          conversationId: convId,
          audio,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

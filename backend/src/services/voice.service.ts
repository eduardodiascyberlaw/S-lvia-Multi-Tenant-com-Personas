import FormData from 'form-data';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { TranscriptionResult, SynthesisResult } from '../types';

export class VoiceService {
  // ── Is Enabled ──

  static isEnabled(): boolean {
    return (
      config.voice.enabled &&
      !!config.openai.apiKey &&
      !!config.voice.resemble.apiKey
    );
  }

  // ── Transcribe (Whisper STT) ──

  static async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    language = 'pt'
  ): Promise<TranscriptionResult> {
    if (!config.openai.apiKey) {
      throw new AppError('OpenAI API key nao configurada', 500);
    }

    const ext = mimeType.includes('webm')
      ? 'webm'
      : mimeType.includes('mp4') || mimeType.includes('m4a')
        ? 'm4a'
        : mimeType.includes('wav')
          ? 'wav'
          : mimeType.includes('ogg')
            ? 'ogg'
            : 'webm';

    const form = new FormData();
    form.append('file', audioBuffer, {
      filename: `audio.${ext}`,
      contentType: mimeType,
    });
    form.append('model', config.openai.whisperModel);
    form.append('language', language);
    form.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openai.apiKey}`,
        ...form.getHeaders(),
      },
      body: form.getBuffer(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Voice] Whisper error:', errorText);
      throw new AppError(`Erro na transcricao: ${response.status}`, 502);
    }

    const data = (await response.json()) as { text: string };

    return {
      text: data.text,
      language,
    };
  }

  // ── Synthesize (Resemble AI TTS) ──

  static async synthesize(
    text: string,
    voiceUuid?: string
  ): Promise<SynthesisResult> {
    if (!config.voice.resemble.apiKey) {
      throw new AppError('Resemble API key nao configurada', 500);
    }

    const uuid = voiceUuid || config.voice.resemble.defaultVoiceUuid;
    if (!uuid) {
      throw new AppError('Voice UUID nao configurado', 500);
    }

    // Limit text to 3000 chars for Resemble
    const truncatedText = text.slice(0, 3000);

    const response = await fetch(config.voice.resemble.syncUrl, {
      method: 'POST',
      headers: {
        Authorization: `Token token=${config.voice.resemble.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_uuid: uuid,
        data: truncatedText,
        output_format: 'mp3',
        sample_rate: 22050,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Voice] Resemble error:', errorText);
      throw new AppError(`Erro na sintese de voz: ${response.status}`, 502);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      audioBase64: base64,
      contentType: 'audio/mpeg',
    };
  }
}

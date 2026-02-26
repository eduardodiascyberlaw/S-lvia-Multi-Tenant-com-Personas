import { Router } from 'express';
import multer from 'multer';
import { VoiceController } from '../controllers/voice.controller';
import { authenticate, requireActiveOrg } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { synthesizeSchema } from '../utils/validators';

const router = Router();

// Multer for audio uploads
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'audio/webm',
      'audio/wav',
      'audio/mpeg',
      'audio/mp4',
      'audio/ogg',
      'audio/x-m4a',
      'audio/mp3',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de audio nao suportado: ${file.mimetype}`));
    }
  },
});

// Health is public (no auth)
router.get('/health', VoiceController.health);

// Protected routes
router.use(authenticate, requireActiveOrg);

router.post('/transcribe', audioUpload.single('audio'), VoiceController.transcribe);
router.post('/synthesize', validate(synthesizeSchema), VoiceController.synthesize);
router.post('/ask', audioUpload.single('audio'), VoiceController.voiceAsk);

export default router;

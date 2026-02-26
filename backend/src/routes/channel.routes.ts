import { Router } from 'express';
import { ChannelController } from '../controllers/channel.controller';
import { authenticate, authorize, requireActiveOrg } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createChannelSchema, updateChannelSchema, assignPersonaSchema } from '../utils/validators';

const router = Router();

router.use(authenticate, requireActiveOrg);

router.get('/', ChannelController.list);
router.post('/', authorize('OWNER', 'ADMIN'), validate(createChannelSchema), ChannelController.create);
router.put('/:id', authorize('OWNER', 'ADMIN'), validate(updateChannelSchema), ChannelController.update);
router.delete('/:id', authorize('OWNER', 'ADMIN'), ChannelController.delete);
router.post('/:id/personas', authorize('OWNER', 'ADMIN'), validate(assignPersonaSchema), ChannelController.assignPersona);
router.delete('/:id/personas/:personaId', authorize('OWNER', 'ADMIN'), ChannelController.removePersona);

export default router;

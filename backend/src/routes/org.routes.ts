import { Router } from 'express';
import { OrgController } from '../controllers/org.controller';
import { authenticate, authorize, requireActiveOrg } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateOrgSchema, inviteUserSchema } from '../utils/validators';

const router = Router();

router.use(authenticate, requireActiveOrg);

router.get('/', OrgController.get);
router.put('/', authorize('OWNER', 'ADMIN'), validate(updateOrgSchema), OrgController.update);
router.get('/users', OrgController.listUsers);
router.post('/users/invite', authorize('OWNER', 'ADMIN'), validate(inviteUserSchema), OrgController.inviteUser);
router.get('/stats', OrgController.stats);

export default router;

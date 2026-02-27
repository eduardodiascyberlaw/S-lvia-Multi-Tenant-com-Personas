import { Router } from 'express';
import { PersonaController } from '../controllers/persona.controller';
import { authenticate, authorize, requireActiveOrg } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPersonaSchema, updatePersonaSchema, testPersonaSchema } from '../utils/validators';

const router = Router();

router.use(authenticate, requireActiveOrg);

router.get('/', PersonaController.list);
router.post('/', authorize('OWNER', 'ADMIN'), validate(createPersonaSchema), PersonaController.create);
router.get('/:id', PersonaController.getById);
router.put('/:id', authorize('OWNER', 'ADMIN'), validate(updatePersonaSchema), PersonaController.update);
router.delete('/:id', authorize('OWNER', 'ADMIN'), PersonaController.delete);
router.post('/:id/test', validate(testPersonaSchema), PersonaController.test);
router.post('/:id/collections', authorize('OWNER', 'ADMIN'), PersonaController.assignCollection);
router.delete('/:id/collections/:collectionId', authorize('OWNER', 'ADMIN'), PersonaController.removeCollection);

router.get('/:id/tools', PersonaController.listTools);
router.post('/:id/tools', authorize('OWNER', 'ADMIN'), PersonaController.addTool);
router.put('/:id/tools/:toolId', authorize('OWNER', 'ADMIN'), PersonaController.updateTool);
router.delete('/:id/tools/:toolId', authorize('OWNER', 'ADMIN'), PersonaController.removeTool);

export default router;

import { Router } from 'express';
import { registerDevice, listDevices, revokeDevice, verifyDevice } from '../controllers/device.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All device routes require JWT authentication
router.use(authenticateToken);

router.post('/register', registerDevice);
router.get('/', listDevices);
router.delete('/:id', revokeDevice);
router.post('/verify', verifyDevice);

export default router;

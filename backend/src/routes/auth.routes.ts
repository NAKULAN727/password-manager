import { Router } from 'express';
import { getNonce, verifySiwe, getProfile } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Public Authentication Endpoints
router.post('/nonce', getNonce);
router.post('/verify', verifySiwe);

// Protected User Endpoint
router.get('/profile', authenticateToken, getProfile);

export default router;

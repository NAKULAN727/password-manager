import { Router } from 'express';
import {
  createRecoveryRequest,
  approveRecovery,
  cancelRecovery,
  getRecoveryStatus,
  completeRecovery,
  getRecoveryShares,
  getAuditTrail,
} from '../controllers/recovery.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Recovery request management (requires JWT)
router.post('/request', authenticateToken, createRecoveryRequest);
router.post('/cancel', authenticateToken, cancelRecovery);
router.get('/status', authenticateToken, getRecoveryStatus);
router.post('/complete', authenticateToken, completeRecovery);
router.get('/shares', authenticateToken, getRecoveryShares);
router.get('/audit', authenticateToken, getAuditTrail);

// Guardian approval endpoint (authenticates via signature, not JWT)
router.post('/approve', approveRecovery);

export default router;

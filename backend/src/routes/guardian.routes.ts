import { Router } from 'express';
import {
  inviteGuardian,
  acceptGuardianInvitation,
  revokeGuardian,
  getGuardianCircle,
  distributeShares,
  getMyInvitations,
} from '../controllers/guardian.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All guardian routes require JWT authentication
router.use(authenticateToken);

// Guardian Circle Management
router.post('/invite', inviteGuardian);
router.post('/accept', acceptGuardianInvitation);
router.delete('/:id', revokeGuardian);
router.get('/circle', getGuardianCircle);
router.post('/distribute-shares', distributeShares);
router.get('/invitations', getMyInvitations);

export default router;

import { Router } from 'express';
import { addVaultEntry, listVaultEntries, deleteVaultEntry, updateVaultEntry, getVekStatus, saveVek, getVek } from '../controllers/vault.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply JWT authentication middleware globally across all vault actions
router.use(authenticateToken);

// Sanctuary VEK Envelope Routes
router.get('/vek-status', getVekStatus);
router.post('/vek', saveVek);
router.get('/vek', getVek);

// ZK Vault Actions
router.post('/add', addVaultEntry);
router.get('/list', listVaultEntries);
router.delete('/:id', deleteVaultEntry);
router.put('/:id', updateVaultEntry);

export default router;

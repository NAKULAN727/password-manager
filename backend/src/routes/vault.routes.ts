import { Router } from 'express';
import { addVaultEntry, listVaultEntries, deleteVaultEntry, updateVaultEntry } from '../controllers/vault.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply JWT authentication middleware globally across all vault actions
router.use(authenticateToken);

// ZK Vault Actions
router.post('/add', addVaultEntry);
router.get('/list', listVaultEntries);
router.delete('/:id', deleteVaultEntry);
router.put('/:id', updateVaultEntry);

export default router;

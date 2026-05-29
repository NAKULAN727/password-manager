import { Request, Response } from 'express';
import { UserService, VaultService, AuditService } from '../services';

/**
 * Returns whether an encrypted VEK exists for the authenticated wallet.
 * GET /api/vault/vek-status
 */
export async function getVekStatus(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(200).json({ hasVek: false });

    const hasVek = await VaultService.hasVek(dbUser.id);
    return res.status(200).json({ hasVek });
  } catch (error) {
    console.error('Error in getVekStatus:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Persists the client-side encrypted VEK envelope.
 * POST /api/vault/vek
 */
export async function saveVek(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const { encryptedVEK, vekIv, vekTag } = req.body;
    if (!encryptedVEK || !vekIv || !vekTag) {
      return res.status(400).json({ error: 'encryptedVEK, vekIv, and vekTag are required.' });
    }

    const dbUser = await UserService.findOrCreate(user.address);

    // Check if VEK already exists
    const hasVek = await VaultService.hasVek(dbUser.id);
    if (hasVek) {
      return res.status(409).json({ error: 'Encrypted VEK already exists for this wallet.' });
    }

    await VaultService.saveVek(dbUser.id, {
      encryptedVEK: String(encryptedVEK),
      iv: String(vekIv),
      tag: String(vekTag),
      kdfSalt: dbUser.walletAddress,
    });

    await AuditService.log({
      userId: dbUser.id,
      eventType: 'vault.vek_created',
      ipAddress: req.ip || undefined,
    });

    return res.status(201).json({ status: 'success' });
  } catch (error) {
    console.error('Error in saveVek:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Returns the encrypted VEK envelope for the authenticated wallet.
 * GET /api/vault/vek
 */
export async function getVek(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(404).json({ error: 'No VEK found for this wallet.' });

    const vek = await VaultService.getVek(dbUser.id);
    if (!vek) return res.status(404).json({ error: 'No VEK found for this wallet.' });

    return res.status(200).json({
      encryptedVEK: vek.encryptedVEK,
      vekIv: vek.iv,
      vekTag: vek.tag,
      kdfSalt: vek.kdfSalt,
      createdAt: vek.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error in getVek:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Adds an encrypted credential secret to the authenticated user's locker.
 * POST /api/vault/add
 */
export async function addVaultEntry(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const { label, username, ciphertext, iv, tag, checksum } = req.body;
    if (!label || !ciphertext || !iv || !tag) {
      return res.status(400).json({ error: 'Missing required parameters (label, ciphertext, iv, tag).' });
    }

    const dbUser = await UserService.findOrCreate(user.address);

    const entry = await VaultService.addEntry(dbUser.id, {
      label: String(label).trim(),
      username: username ? String(username).trim() : '',
      ciphertext,
      iv,
      tag,
      checksum: checksum ? String(checksum) : undefined,
    });

    await AuditService.log({
      userId: dbUser.id,
      eventType: 'vault.entry_created',
      metadata: { entryId: entry.id, label: entry.label },
      ipAddress: req.ip || undefined,
    });

    return res.status(201).json({ status: 'success', entry });
  } catch (error) {
    console.error('Error in addVaultEntry:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Lists all encrypted credential secrets for the authenticated wallet.
 * GET /api/vault/list
 */
export async function listVaultEntries(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(200).json([]);

    const entries = await VaultService.listEntries(dbUser.id);
    return res.status(200).json(entries);
  } catch (error) {
    console.error('Error in listVaultEntries:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Deletes a specific encrypted secret.
 * DELETE /api/vault/:id
 */
export async function deleteVaultEntry(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Entry ID is required.' });

    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(404).json({ error: 'User not found.' });

    const result = await VaultService.deleteEntry(dbUser.id, id);
    if (result.count === 0) {
      return res.status(404).json({ error: 'Vault entry not found.' });
    }

    await AuditService.log({
      userId: dbUser.id,
      eventType: 'vault.entry_deleted',
      metadata: { entryId: id },
      ipAddress: req.ip || undefined,
    });

    return res.status(200).json({ status: 'success', id });
  } catch (error) {
    console.error('Error in deleteVaultEntry:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Updates an existing encrypted secret.
 * PUT /api/vault/:id
 */
export async function updateVaultEntry(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const { id } = req.params;
    const { label, username, ciphertext, iv, tag, checksum } = req.body;

    if (!label || !ciphertext || !iv || !tag) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(404).json({ error: 'User not found.' });

    const result = await VaultService.updateEntry(dbUser.id, id, {
      label: String(label).trim(),
      username: username ? String(username).trim() : '',
      ciphertext,
      iv,
      tag,
      checksum: checksum ? String(checksum) : undefined,
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Vault entry not found.' });
    }

    await AuditService.log({
      userId: dbUser.id,
      eventType: 'vault.entry_updated',
      metadata: { entryId: id, label },
      ipAddress: req.ip || undefined,
    });

    return res.status(200).json({ status: 'success', id });
  } catch (error) {
    console.error('Error in updateVaultEntry:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

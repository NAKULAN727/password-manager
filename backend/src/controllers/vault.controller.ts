import { Request, Response } from 'express';
import crypto from 'crypto';

// In-memory ZK VEK store: Key is lowercase wallet address
interface EncryptedVEKRecord {
  encryptedVEK: string; // Base64 AES-GCM ciphertext
  vekIv: string;        // Base64 IV
  vekTag: string;       // Base64 GCM auth tag
  kdfSalt: string;      // wallet address used as PBKDF2 salt (informational)
  createdAt: string;
}
const vekStore = new Map<string, EncryptedVEKRecord>();

/**
 * Returns whether an encrypted VEK exists for the authenticated wallet.
 * GET /api/vault/vek-status
 */
export async function getVekStatus(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

  const hasVek = vekStore.has(user.address.toLowerCase());
  return res.status(200).json({ hasVek });
}

/**
 * Persists the client-side encrypted VEK envelope. Zero-knowledge: server
 * never receives the sanctuary phrase, KEK, or raw VEK.
 * POST /api/vault/vek
 */
export async function saveVek(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

  const { encryptedVEK, vekIv, vekTag } = req.body;
  if (!encryptedVEK || !vekIv || !vekTag) {
    return res.status(400).json({ error: 'encryptedVEK, vekIv, and vekTag are required.' });
  }

  const cleanAddress = user.address.toLowerCase();

  // Prevent overwriting an existing VEK — sanctuary phrase cannot be reset
  if (vekStore.has(cleanAddress)) {
    return res.status(409).json({ error: 'Encrypted VEK already exists for this wallet.' });
  }

  vekStore.set(cleanAddress, {
    encryptedVEK: String(encryptedVEK),
    vekIv: String(vekIv),
    vekTag: String(vekTag),
    kdfSalt: cleanAddress,
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json({ status: 'success' });
}

/**
 * Returns the encrypted VEK envelope for the authenticated wallet.
 * GET /api/vault/vek
 */
export async function getVek(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

  const record = vekStore.get(user.address.toLowerCase());
  if (!record) return res.status(404).json({ error: 'No VEK found for this wallet.' });

  return res.status(200).json(record);
}

export interface VaultEntry {
  id: string;
  label: string;
  username: string;
  iv: string;         // Base64
  ciphertext: string; // Base64
  tag: string;        // Base64
  checksum?: string;  // Base64 HMAC
  createdAt: string;
  updatedAt: string;
}

// In-memory ZK vault cache: Key is lowercase wallet address, value is user entries
const userVaultStore = new Map<string, VaultEntry[]>();

/**
 * Adds an encrypted credential secret to the authenticated user's locker.
 * POST /api/vault/add
 */
export async function addVaultEntry(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || !user.address) {
      return res.status(401).json({ error: 'Unauthorized: Session missing user context.' });
    }

    const { label, username, ciphertext, iv, tag, checksum } = req.body;

    if (!label || !ciphertext || !iv || !tag) {
      return res.status(400).json({ error: 'Missing required vault schema parameters (label, ciphertext, iv, and tag are required).' });
    }

    const cleanAddress = user.address.toLowerCase();

    // Reconstruct the zero-knowledge vault record
    const entry: VaultEntry = {
      id: crypto.randomUUID(), // Generates secure random UUID v4
      label: String(label).trim(),
      username: username ? String(username).trim() : '',
      iv,
      ciphertext,
      tag,
      checksum: checksum ? String(checksum) : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store isolated by wallet address
    if (!userVaultStore.has(cleanAddress)) {
      userVaultStore.set(cleanAddress, []);
    }
    userVaultStore.get(cleanAddress)!.push(entry);

    return res.status(201).json({
      status: 'success',
      entry
    });
  } catch (error) {
    console.error('Error in addVaultEntry:', error);
    return res.status(500).json({ error: 'Internal server error while saving encrypted secret.' });
  }
}

/**
 * Lists all encrypted credential secrets for the authenticated wallet user.
 * GET /api/vault/list
 */
export async function listVaultEntries(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || !user.address) {
      return res.status(401).json({ error: 'Unauthorized: Session missing user context.' });
    }

    const cleanAddress = user.address.toLowerCase();
    const entries = userVaultStore.get(cleanAddress) || [];

    return res.status(200).json(entries);
  } catch (error) {
    console.error('Error in listVaultEntries:', error);
    return res.status(500).json({ error: 'Internal server error while retrieving credentials.' });
  }
}

/**
 * Purges a specific encrypted secret from the authenticated user's locker.
 * DELETE /api/vault/:id
 */
export async function deleteVaultEntry(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || !user.address) {
      return res.status(401).json({ error: 'Unauthorized: Session missing user context.' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Vault entry ID parameter is required.' });
    }

    const cleanAddress = user.address.toLowerCase();
    const entries = userVaultStore.get(cleanAddress) || [];

    // Find the item to delete
    const initialLength = entries.length;
    const filteredEntries = entries.filter(entry => entry.id !== id);

    if (initialLength === filteredEntries.length) {
      return res.status(404).json({ error: 'Vault entry not found.' });
    }

    // Save filtered list back
    userVaultStore.set(cleanAddress, filteredEntries);

    return res.status(200).json({
      status: 'success',
      id
    });
  } catch (error) {
    console.error('Error in deleteVaultEntry:', error);
    return res.status(500).json({ error: 'Internal server error while deleting secret.' });
  }
}

/**
 * Updates an existing encrypted secret in the authenticated user's locker.
 * PUT /api/vault/:id
 */
export async function updateVaultEntry(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || !user.address) {
      return res.status(401).json({ error: 'Unauthorized: Session missing user context.' });
    }

    const { id } = req.params;
    const { label, username, ciphertext, iv, tag, checksum } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Vault entry ID parameter is required.' });
    }

    if (!label || !ciphertext || !iv || !tag) {
      return res.status(400).json({ error: 'Missing required vault schema parameters (label, ciphertext, iv, and tag are required).' });
    }

    const cleanAddress = user.address.toLowerCase();
    const entries = userVaultStore.get(cleanAddress) || [];

    // Find the item to update
    const entryIndex = entries.findIndex(entry => entry.id === id);
    if (entryIndex === -1) {
      return res.status(404).json({ error: 'Vault entry not found.' });
    }

    // Update the record fields, preserving id and createdAt
    const updatedEntry: VaultEntry = {
      ...entries[entryIndex],
      label: String(label).trim(),
      username: username ? String(username).trim() : '',
      iv,
      ciphertext,
      tag,
      checksum: checksum ? String(checksum) : undefined,
      updatedAt: new Date().toISOString()
    };

    entries[entryIndex] = updatedEntry;
    userVaultStore.set(cleanAddress, entries);

    return res.status(200).json({
      status: 'success',
      entry: updatedEntry
    });
  } catch (error) {
    console.error('Error in updateVaultEntry:', error);
    return res.status(500).json({ error: 'Internal server error while updating encrypted secret.' });
  }
}

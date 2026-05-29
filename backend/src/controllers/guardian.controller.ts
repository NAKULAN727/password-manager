import { Request, Response } from 'express';
import crypto from 'crypto';
import { ethers } from 'ethers';

// ─── In-Memory Guardian Storage ──────────────────────────────────────────────

export interface Guardian {
  id: string;
  ownerAddress: string;
  guardianAddress: string;
  status: 'pending' | 'accepted' | 'revoked';
  invitationNonce: string;
  encryptedShare?: string;    // Base64 encrypted recovery share
  shareIndex?: number;        // Shamir share index
  createdAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  expiresAt: string;          // Invitation expiry (72h)
  // Blockchain extensibility fields
  txHash?: string | null;
  blockNumber?: number | null;
  contractAddress?: string | null;
}

export interface GuardianCircle {
  ownerAddress: string;
  threshold: number;
  totalGuardians: number;
  guardians: Guardian[];
  createdAt: string;
  updatedAt: string;
}

// Key: ownerAddress (lowercase)
const guardianCircleStore = new Map<string, GuardianCircle>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getOrCreateCircle(ownerAddress: string): GuardianCircle {
  const clean = ownerAddress.toLowerCase();
  if (!guardianCircleStore.has(clean)) {
    guardianCircleStore.set(clean, {
      ownerAddress: clean,
      threshold: 0,
      totalGuardians: 0,
      guardians: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return guardianCircleStore.get(clean)!;
}

function getActiveGuardians(circle: GuardianCircle): Guardian[] {
  return circle.guardians.filter(g => g.status === 'accepted');
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * Invite a guardian to the circle.
 * POST /api/guardians/invite
 * Body: { guardianAddress, threshold? }
 */
export async function inviteGuardian(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const { guardianAddress, threshold } = req.body;

    if (!guardianAddress || !ethers.isAddress(guardianAddress)) {
      return res.status(400).json({ error: 'A valid Ethereum guardian address is required.' });
    }

    const ownerAddress = user.address.toLowerCase();
    const cleanGuardian = guardianAddress.toLowerCase();

    // Cannot invite self
    if (ownerAddress === cleanGuardian) {
      return res.status(400).json({ error: 'You cannot designate yourself as a guardian.' });
    }

    const circle = getOrCreateCircle(ownerAddress);

    // Check max guardians (7)
    const activeAndPending = circle.guardians.filter(g => g.status !== 'revoked');
    if (activeAndPending.length >= 7) {
      return res.status(400).json({ error: 'Maximum of 7 guardians allowed per circle.' });
    }

    // Check duplicate
    const existing = circle.guardians.find(
      g => g.guardianAddress === cleanGuardian && g.status !== 'revoked'
    );
    if (existing) {
      return res.status(409).json({ error: 'This address is already in your guardian circle.' });
    }

    // Update threshold if provided
    if (threshold !== undefined) {
      const t = Number(threshold);
      if (t < 2) {
        return res.status(400).json({ error: 'Threshold must be at least 2.' });
      }
      circle.threshold = t;
    }

    const invitationNonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72h

    const guardian: Guardian = {
      id: crypto.randomUUID(),
      ownerAddress,
      guardianAddress: cleanGuardian,
      status: 'pending',
      invitationNonce,
      createdAt: new Date().toISOString(),
      expiresAt,
      txHash: null,
      blockNumber: null,
      contractAddress: null,
    };

    circle.guardians.push(guardian);
    circle.totalGuardians = circle.guardians.filter(g => g.status !== 'revoked').length;
    circle.updatedAt = new Date().toISOString();

    return res.status(201).json({
      status: 'success',
      guardian: {
        id: guardian.id,
        guardianAddress: guardian.guardianAddress,
        status: guardian.status,
        invitationNonce: guardian.invitationNonce,
        expiresAt: guardian.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error in inviteGuardian:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Accept a guardian invitation.
 * POST /api/guardians/accept
 * Body: { ownerAddress, invitationNonce, signature }
 */
export async function acceptGuardianInvitation(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const { ownerAddress, invitationNonce, signature } = req.body;

    if (!ownerAddress || !invitationNonce || !signature) {
      return res.status(400).json({ error: 'ownerAddress, invitationNonce, and signature are required.' });
    }

    const cleanOwner = ownerAddress.toLowerCase();
    const guardianAddress = user.address.toLowerCase();

    const circle = guardianCircleStore.get(cleanOwner);
    if (!circle) {
      return res.status(404).json({ error: 'Guardian circle not found for this owner.' });
    }

    const guardian = circle.guardians.find(
      g => g.guardianAddress === guardianAddress &&
           g.invitationNonce === invitationNonce &&
           g.status === 'pending'
    );

    if (!guardian) {
      return res.status(404).json({ error: 'No pending invitation found for your address.' });
    }

    // Check expiration
    if (new Date() > new Date(guardian.expiresAt)) {
      guardian.status = 'revoked';
      return res.status(410).json({ error: 'Invitation has expired.' });
    }

    // Verify EIP-712 acceptance signature
    // The message format: "I accept guardianship for {ownerAddress} with nonce {nonce}"
    const message = `I accept guardianship for ${cleanOwner} with nonce ${invitationNonce}`;
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== guardianAddress) {
        return res.status(401).json({ error: 'Signature verification failed.' });
      }
    } catch {
      return res.status(401).json({ error: 'Invalid signature format.' });
    }

    guardian.status = 'accepted';
    guardian.acceptedAt = new Date().toISOString();
    circle.updatedAt = new Date().toISOString();

    return res.status(200).json({
      status: 'success',
      message: 'Guardian invitation accepted.',
    });
  } catch (error) {
    console.error('Error in acceptGuardianInvitation:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Revoke a guardian from the circle.
 * DELETE /api/guardians/:id
 */
export async function revokeGuardian(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const { id } = req.params;
    const ownerAddress = user.address.toLowerCase();

    const circle = guardianCircleStore.get(ownerAddress);
    if (!circle) {
      return res.status(404).json({ error: 'Guardian circle not found.' });
    }

    const guardian = circle.guardians.find(g => g.id === id && g.status !== 'revoked');
    if (!guardian) {
      return res.status(404).json({ error: 'Guardian not found or already revoked.' });
    }

    guardian.status = 'revoked';
    guardian.revokedAt = new Date().toISOString();
    guardian.encryptedShare = undefined;
    guardian.shareIndex = undefined;
    circle.totalGuardians = circle.guardians.filter(g => g.status !== 'revoked').length;
    circle.updatedAt = new Date().toISOString();

    return res.status(200).json({
      status: 'success',
      message: 'Guardian revoked successfully.',
    });
  } catch (error) {
    console.error('Error in revokeGuardian:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Get the full guardian circle for the authenticated user.
 * GET /api/guardians/circle
 */
export async function getGuardianCircle(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const ownerAddress = user.address.toLowerCase();
    const circle = guardianCircleStore.get(ownerAddress);

    if (!circle) {
      return res.status(200).json({
        ownerAddress,
        threshold: 0,
        totalGuardians: 0,
        guardians: [],
      });
    }

    // Filter out revoked, return sanitized data
    const guardians = circle.guardians
      .filter(g => g.status !== 'revoked')
      .map(g => ({
        id: g.id,
        guardianAddress: g.guardianAddress,
        status: g.status,
        createdAt: g.createdAt,
        acceptedAt: g.acceptedAt,
        expiresAt: g.expiresAt,
      }));

    return res.status(200).json({
      ownerAddress: circle.ownerAddress,
      threshold: circle.threshold,
      totalGuardians: circle.totalGuardians,
      guardians,
    });
  } catch (error) {
    console.error('Error in getGuardianCircle:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Store encrypted recovery shares for guardians.
 * POST /api/guardians/distribute-shares
 * Body: { shares: [{ guardianId, encryptedShare, shareIndex }] }
 */
export async function distributeShares(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const { shares } = req.body;
    if (!shares || !Array.isArray(shares) || shares.length === 0) {
      return res.status(400).json({ error: 'shares array is required.' });
    }

    const ownerAddress = user.address.toLowerCase();
    const circle = guardianCircleStore.get(ownerAddress);
    if (!circle) {
      return res.status(404).json({ error: 'Guardian circle not found.' });
    }

    for (const share of shares) {
      const { guardianId, encryptedShare, shareIndex } = share;
      const guardian = circle.guardians.find(g => g.id === guardianId && g.status === 'accepted');
      if (guardian) {
        guardian.encryptedShare = encryptedShare;
        guardian.shareIndex = shareIndex;
      }
    }

    circle.updatedAt = new Date().toISOString();

    return res.status(200).json({
      status: 'success',
      message: 'Recovery shares distributed successfully.',
    });
  } catch (error) {
    console.error('Error in distributeShares:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Get pending guardian invitations for the authenticated wallet (as a guardian).
 * GET /api/guardians/invitations
 */
export async function getMyInvitations(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const myAddress = user.address.toLowerCase();
    const invitations: Array<{ ownerAddress: string; invitationNonce: string; expiresAt: string; createdAt: string }> = [];

    for (const [, circle] of guardianCircleStore) {
      for (const g of circle.guardians) {
        if (g.guardianAddress === myAddress && g.status === 'pending') {
          if (new Date() < new Date(g.expiresAt)) {
            invitations.push({
              ownerAddress: circle.ownerAddress,
              invitationNonce: g.invitationNonce,
              expiresAt: g.expiresAt,
              createdAt: g.createdAt,
            });
          }
        }
      }
    }

    return res.status(200).json(invitations);
  } catch (error) {
    console.error('Error in getMyInvitations:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

// Export the store for use by recovery controller
export { guardianCircleStore };

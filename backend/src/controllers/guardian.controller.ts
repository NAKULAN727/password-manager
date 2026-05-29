import { Request, Response } from 'express';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { UserService, GuardianService, AuditService } from '../services';

/**
 * Invite a guardian to the circle.
 * POST /api/guardians/invite
 */
export async function inviteGuardian(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const { guardianAddress, threshold } = req.body;

    if (!guardianAddress || !ethers.isAddress(guardianAddress)) {
      return res.status(400).json({ error: 'A valid Ethereum guardian address is required.' });
    }

    const cleanGuardian = guardianAddress.toLowerCase();
    if (user.address.toLowerCase() === cleanGuardian) {
      return res.status(400).json({ error: 'You cannot designate yourself as a guardian.' });
    }

    const dbUser = await UserService.findOrCreate(user.address);
    const circle = await GuardianService.getCircle(dbUser.id);

    if (circle.length >= 7) {
      return res.status(400).json({ error: 'Maximum of 7 guardians allowed per circle.' });
    }

    const existing = circle.find(g => g.guardianAddress === cleanGuardian);
    if (existing) {
      return res.status(409).json({ error: 'This address is already in your guardian circle.' });
    }

    const t = threshold ? Math.max(2, Number(threshold)) : 3;
    const invitationNonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const guardian = await GuardianService.createInvitation(dbUser.id, {
      guardianAddress: cleanGuardian,
      invitationNonce,
      threshold: t,
      expiresAt,
    });

    await AuditService.log({
      userId: dbUser.id,
      eventType: 'guardian.invited',
      metadata: { guardianAddress: cleanGuardian, guardianId: guardian.id },
      ipAddress: req.ip || undefined,
    });

    return res.status(201).json({
      status: 'success',
      guardian: {
        id: guardian.id,
        guardianAddress: guardian.guardianAddress,
        status: guardian.status,
        invitationNonce: guardian.invitationNonce,
        expiresAt: guardian.expiresAt.toISOString(),
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

    const owner = await UserService.findByAddress(cleanOwner);
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });

    // Verify signature
    const message = `I accept guardianship for ${cleanOwner} with nonce ${invitationNonce}`;
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== guardianAddress) {
        return res.status(401).json({ error: 'Signature verification failed.' });
      }
    } catch {
      return res.status(401).json({ error: 'Invalid signature format.' });
    }

    const result = await GuardianService.acceptInvitation(owner.id, guardianAddress, invitationNonce);
    if (result.count === 0) {
      return res.status(404).json({ error: 'No pending invitation found.' });
    }

    await AuditService.log({
      userId: owner.id,
      eventType: 'guardian.accepted',
      metadata: { guardianAddress },
      ipAddress: req.ip || undefined,
    });

    return res.status(200).json({ status: 'success', message: 'Guardian invitation accepted.' });
  } catch (error) {
    console.error('Error in acceptGuardianInvitation:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Revoke a guardian.
 * DELETE /api/guardians/:id
 */
export async function revokeGuardian(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const { id } = req.params;
    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(404).json({ error: 'User not found.' });

    const result = await GuardianService.revokeGuardian(dbUser.id, id);
    if (result.count === 0) {
      return res.status(404).json({ error: 'Guardian not found or already revoked.' });
    }

    await AuditService.log({
      userId: dbUser.id,
      eventType: 'guardian.revoked',
      metadata: { guardianId: id },
      ipAddress: req.ip || undefined,
    });

    return res.status(200).json({ status: 'success', message: 'Guardian revoked.' });
  } catch (error) {
    console.error('Error in revokeGuardian:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Get the guardian circle.
 * GET /api/guardians/circle
 */
export async function getGuardianCircle(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) {
      return res.status(200).json({ ownerAddress: user.address, threshold: 0, totalGuardians: 0, guardians: [] });
    }

    const guardians = await GuardianService.getCircle(dbUser.id);
    const threshold = await GuardianService.getThreshold(dbUser.id);

    return res.status(200).json({
      ownerAddress: dbUser.walletAddress,
      threshold,
      totalGuardians: guardians.length,
      guardians: guardians.map(g => ({
        id: g.id,
        guardianAddress: g.guardianAddress,
        status: g.status.toLowerCase(),
        createdAt: g.createdAt.toISOString(),
        acceptedAt: g.acceptedAt?.toISOString(),
        expiresAt: g.expiresAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error in getGuardianCircle:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Distribute encrypted recovery shares.
 * POST /api/guardians/distribute-shares
 */
export async function distributeShares(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const { shares } = req.body;
    if (!shares || !Array.isArray(shares) || shares.length === 0) {
      return res.status(400).json({ error: 'shares array is required.' });
    }

    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(404).json({ error: 'User not found.' });

    await GuardianService.distributeShares(shares);

    await AuditService.log({
      userId: dbUser.id,
      eventType: 'guardian.shares_distributed',
      metadata: { shareCount: shares.length },
      ipAddress: req.ip || undefined,
    });

    return res.status(200).json({ status: 'success', message: 'Shares distributed.' });
  } catch (error) {
    console.error('Error in distributeShares:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Get pending invitations for the authenticated wallet (as a guardian).
 * GET /api/guardians/invitations
 */
export async function getMyInvitations(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const invitations = await GuardianService.getPendingInvitations(user.address);

    return res.status(200).json(
      invitations.map(g => ({
        ownerAddress: g.owner.walletAddress,
        invitationNonce: g.invitationNonce,
        expiresAt: g.expiresAt.toISOString(),
        createdAt: g.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('Error in getMyInvitations:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

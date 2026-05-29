import { Request, Response } from 'express';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { RecoveryStatus } from '@prisma/client';
import { UserService, GuardianService, RecoveryService, VaultService, AuditService } from '../services';

/**
 * Create a recovery request.
 * POST /api/recovery/request
 */
export async function createRecoveryRequest(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(404).json({ error: 'User not found.' });

    // Rate limit: max 3 requests per 30 days
    const recentCount = await RecoveryService.countRecentRequests(dbUser.id, 30);
    if (recentCount >= 3) {
      return res.status(429).json({ error: 'Maximum 3 recovery requests per 30-day period exceeded.' });
    }

    // Global cooldown: 7 days between successful recoveries
    const lastRecovery = await RecoveryService.getLastCompletedRecovery(dbUser.id);
    if (lastRecovery?.completedAt) {
      const daysSince = (Date.now() - lastRecovery.completedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        return res.status(429).json({ error: `Recovery cooldown active. ${Math.ceil(7 - daysSince)} days remaining.` });
      }
    }

    // Cancel any existing active requests
    await RecoveryService.cancelActiveRequests(dbUser.id);

    // Verify guardian circle
    const threshold = await GuardianService.getThreshold(dbUser.id);
    if (threshold === 0) {
      return res.status(400).json({ error: 'No guardian circle configured.' });
    }

    const acceptedCount = await GuardianService.getAcceptedCount(dbUser.id);
    if (acceptedCount < threshold) {
      return res.status(400).json({ error: 'Insufficient active guardians to meet threshold.' });
    }

    // Elevated security check
    let effectiveThreshold = threshold;
    const recentCancellations = await RecoveryService.countRecentCancellations(dbUser.id, 30);
    if (recentCancellations >= 2) {
      effectiveThreshold = Math.min(threshold + 1, acceptedCount);
    }

    const challengeNonce = crypto.randomBytes(32).toString('hex');
    const cooldownExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const requestExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const request = await RecoveryService.createRequest(dbUser.id, {
      challengeNonce,
      threshold: effectiveThreshold,
      cooldownExpiresAt,
      requestExpiresAt,
    });

    await AuditService.log({
      userId: dbUser.id,
      eventType: 'recovery.request_created',
      metadata: { requestId: request.id, threshold: effectiveThreshold },
      ipAddress: req.ip || undefined,
    });

    return res.status(201).json({
      status: 'success',
      request: {
        id: request.id,
        status: request.status,
        challengeNonce: request.challengeNonce,
        cooldownExpiresAt: request.cooldownExpiresAt.toISOString(),
        requestExpiresAt: request.requestExpiresAt.toISOString(),
        threshold: request.threshold,
        approvalsCollected: 0,
      },
    });
  } catch (error) {
    console.error('Error in createRecoveryRequest:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Approve a recovery request (called by guardians).
 * POST /api/recovery/approve
 */
export async function approveRecovery(req: Request, res: Response) {
  try {
    const { ownerAddress, requestId, signature, guardianAddress } = req.body;
    if (!ownerAddress || !requestId || !signature || !guardianAddress) {
      return res.status(400).json({ error: 'ownerAddress, requestId, signature, and guardianAddress are required.' });
    }

    const cleanOwner = ownerAddress.toLowerCase();
    const cleanGuardian = guardianAddress.toLowerCase();

    const owner = await UserService.findByAddress(cleanOwner);
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });

    const request = await RecoveryService.getActiveRequest(owner.id);
    if (!request || request.id !== requestId) {
      return res.status(404).json({ error: 'Recovery request not found.' });
    }

    // Check expiration
    if (new Date() > request.requestExpiresAt) {
      await RecoveryService.updateStatus(request.id, RecoveryStatus.EXPIRED);
      return res.status(410).json({ error: 'Recovery request has expired.' });
    }

    // Check cooldown
    if (request.status === 'PENDING_COOLDOWN' && new Date() < request.cooldownExpiresAt) {
      return res.status(400).json({ error: 'Recovery is in cooldown period.', cooldownExpiresAt: request.cooldownExpiresAt.toISOString() });
    }

    // Activate if cooldown passed
    if (request.status === 'PENDING_COOLDOWN') {
      await RecoveryService.updateStatus(request.id, RecoveryStatus.ACTIVE);
    }

    // Verify guardian
    const guardian = await GuardianService.findByOwnerAndAddress(owner.id, cleanGuardian);
    if (!guardian) {
      return res.status(403).json({ error: 'You are not an active guardian for this vault.' });
    }

    // Verify signature
    const message = `I approve recovery for ${cleanOwner} request ${requestId} nonce ${request.challengeNonce}`;
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== cleanGuardian) {
        return res.status(401).json({ error: 'Signature verification failed.' });
      }
    } catch {
      return res.status(401).json({ error: 'Invalid signature format.' });
    }

    // Check duplicate
    const alreadyApproved = await RecoveryService.hasGuardianApproved(request.id, guardian.id);
    if (alreadyApproved) {
      return res.status(409).json({ error: 'You have already approved this request.' });
    }

    // Add approval
    await RecoveryService.addApproval({
      recoveryRequestId: request.id,
      guardianId: guardian.id,
      signature,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });

    await AuditService.log({
      userId: owner.id,
      eventType: 'recovery.approval_received',
      metadata: { requestId, guardianAddress: cleanGuardian },
    });

    const validCount = await RecoveryService.countValidApprovals(request.id);
    const thresholdMet = validCount >= request.threshold;

    return res.status(200).json({
      status: 'success',
      approvalsCollected: validCount,
      threshold: request.threshold,
      thresholdMet,
    });
  } catch (error) {
    console.error('Error in approveRecovery:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Cancel an active recovery request.
 * POST /api/recovery/cancel
 */
export async function cancelRecovery(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(404).json({ error: 'User not found.' });

    const result = await RecoveryService.cancelActiveRequests(dbUser.id);
    if (result.count === 0) {
      return res.status(404).json({ error: 'No active recovery request found.' });
    }

    await AuditService.log({
      userId: dbUser.id,
      eventType: 'recovery.request_cancelled',
      ipAddress: req.ip || undefined,
    });

    return res.status(200).json({ status: 'success', message: 'Recovery request cancelled.' });
  } catch (error) {
    console.error('Error in cancelRecovery:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Get recovery request status.
 * GET /api/recovery/status
 */
export async function getRecoveryStatus(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(200).json({ hasActiveRequest: false });

    const request = await RecoveryService.getActiveRequest(dbUser.id);
    if (!request) return res.status(200).json({ hasActiveRequest: false });

    // Check expiration
    if (new Date() > request.requestExpiresAt) {
      await RecoveryService.updateStatus(request.id, RecoveryStatus.EXPIRED);
      return res.status(200).json({ hasActiveRequest: false });
    }

    const validCount = await RecoveryService.countValidApprovals(request.id);

    return res.status(200).json({
      hasActiveRequest: true,
      request: {
        id: request.id,
        status: request.status,
        challengeNonce: request.challengeNonce,
        cooldownExpiresAt: request.cooldownExpiresAt.toISOString(),
        requestExpiresAt: request.requestExpiresAt.toISOString(),
        threshold: request.threshold,
        approvalsCollected: validCount,
        thresholdMet: validCount >= request.threshold,
        createdAt: request.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in getRecoveryStatus:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Complete recovery with new VEK envelope.
 * POST /api/recovery/complete
 */
export async function completeRecovery(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(404).json({ error: 'User not found.' });

    const request = await RecoveryService.getActiveRequest(dbUser.id);
    if (!request || request.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'No active recovery request.' });
    }

    const validCount = await RecoveryService.countValidApprovals(request.id);
    if (validCount < request.threshold) {
      return res.status(400).json({ error: 'Recovery threshold not yet met.' });
    }

    const { encryptedVEK, vekIv, vekTag } = req.body;
    if (!encryptedVEK || !vekIv || !vekTag) {
      return res.status(400).json({ error: 'New encrypted VEK envelope is required.' });
    }

    // Update VEK and mark recovery complete
    await VaultService.updateVek(dbUser.id, {
      encryptedVEK,
      iv: vekIv,
      tag: vekTag,
    });

    await RecoveryService.updateStatus(request.id, RecoveryStatus.COMPLETED);

    await AuditService.log({
      userId: dbUser.id,
      eventType: 'recovery.completed',
      metadata: { requestId: request.id },
      ipAddress: req.ip || undefined,
    });

    return res.status(200).json({ status: 'success', message: 'Recovery completed.' });
  } catch (error) {
    console.error('Error in completeRecovery:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Get encrypted recovery shares.
 * GET /api/recovery/shares
 */
export async function getRecoveryShares(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(404).json({ error: 'User not found.' });

    const request = await RecoveryService.getActiveRequest(dbUser.id);
    if (!request || request.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'No active recovery request.' });
    }

    const validCount = await RecoveryService.countValidApprovals(request.id);
    if (validCount < request.threshold) {
      return res.status(403).json({ error: 'Recovery threshold not yet met.' });
    }

    const shares = await GuardianService.getSharesForRecovery(dbUser.id);
    return res.status(200).json({ shares });
  } catch (error) {
    console.error('Error in getRecoveryShares:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Get audit trail.
 * GET /api/recovery/audit
 */
export async function getAuditTrail(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(200).json([]);

    const events = await AuditService.getTrail(dbUser.id);
    return res.status(200).json(events);
  } catch (error) {
    console.error('Error in getAuditTrail:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

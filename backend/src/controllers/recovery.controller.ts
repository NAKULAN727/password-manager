import { Request, Response } from 'express';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { guardianCircleStore } from './guardian.controller';

// ─── In-Memory Recovery Storage ──────────────────────────────────────────────

export interface RecoveryApproval {
  guardianAddress: string;
  signature: string;
  timestamp: string;
  expiresAt: string; // 48h from signing
}

export interface RecoveryRequest {
  id: string;
  ownerAddress: string;
  status: 'pending_cooldown' | 'active' | 'completed' | 'cancelled' | 'expired';
  challengeNonce: string;
  createdAt: string;
  cooldownExpiresAt: string;  // 24h cooldown
  requestExpiresAt: string;   // 7 days total
  approvals: RecoveryApproval[];
  threshold: number;
  completedAt?: string;
  cancelledAt?: string;
  // Blockchain extensibility
  txHash?: string | null;
  blockNumber?: number | null;
  contractAddress?: string | null;
}

// Key: ownerAddress (lowercase)
const recoveryRequestStore = new Map<string, RecoveryRequest>();

// Audit trail
export interface AuditEvent {
  id: string;
  ownerAddress: string;
  eventType: 'request_created' | 'request_cancelled' | 'approval_received' | 'recovery_completed' | 'guardian_added' | 'guardian_revoked';
  metadata: Record<string, any>;
  timestamp: string;
  // Blockchain extensibility
  txHash?: string | null;
  blockNumber?: number | null;
}

const auditTrailStore = new Map<string, AuditEvent[]>();

// Recovery cooldown tracking (last successful recovery per address)
const lastRecoveryStore = new Map<string, string>(); // address -> ISO timestamp

// Cancellation tracking for elevated security
const cancellationCountStore = new Map<string, { count: number; since: string }>();

// Rate limiting: recovery requests per 30 days
const recoveryRateStore = new Map<string, { count: number; windowStart: string }>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addAuditEvent(ownerAddress: string, eventType: AuditEvent['eventType'], metadata: Record<string, any>) {
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    ownerAddress,
    eventType,
    metadata,
    timestamp: new Date().toISOString(),
    txHash: null,
    blockNumber: null,
  };

  if (!auditTrailStore.has(ownerAddress)) {
    auditTrailStore.set(ownerAddress, []);
  }
  auditTrailStore.get(ownerAddress)!.push(event);
}

function checkRateLimit(ownerAddress: string): boolean {
  const record = recoveryRateStore.get(ownerAddress);
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  if (!record) {
    recoveryRateStore.set(ownerAddress, { count: 1, windowStart: new Date().toISOString() });
    return true;
  }

  const windowStart = new Date(record.windowStart).getTime();
  if (now - windowStart > thirtyDaysMs) {
    // Reset window
    recoveryRateStore.set(ownerAddress, { count: 1, windowStart: new Date().toISOString() });
    return true;
  }

  if (record.count >= 3) {
    return false; // Rate limited
  }

  record.count++;
  return true;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * Create a recovery request.
 * POST /api/recovery/request
 * Body: { signature } — SIWE signature proving wallet ownership
 */
export async function createRecoveryRequest(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const ownerAddress = user.address.toLowerCase();

    // Rate limit check
    if (!checkRateLimit(ownerAddress)) {
      return res.status(429).json({ error: 'Maximum 3 recovery requests per 30-day period exceeded.' });
    }

    // Check global cooldown (7 days between successful recoveries)
    const lastRecovery = lastRecoveryStore.get(ownerAddress);
    if (lastRecovery) {
      const daysSince = (Date.now() - new Date(lastRecovery).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        return res.status(429).json({
          error: `Recovery cooldown active. ${Math.ceil(7 - daysSince)} days remaining.`,
        });
      }
    }

    // Cancel any existing active request
    const existing = recoveryRequestStore.get(ownerAddress);
    if (existing && (existing.status === 'pending_cooldown' || existing.status === 'active')) {
      existing.status = 'cancelled';
      existing.cancelledAt = new Date().toISOString();
      addAuditEvent(ownerAddress, 'request_cancelled', { requestId: existing.id, reason: 'superseded' });
    }

    // Get guardian circle
    const circle = guardianCircleStore.get(ownerAddress);
    if (!circle || circle.threshold === 0) {
      return res.status(400).json({ error: 'No guardian circle configured. Set up guardians first.' });
    }

    const activeGuardians = circle.guardians.filter(g => g.status === 'accepted');
    if (activeGuardians.length < circle.threshold) {
      return res.status(400).json({ error: 'Insufficient active guardians to meet threshold.' });
    }

    // Check elevated security (2+ cancellations in 30 days)
    let effectiveThreshold = circle.threshold;
    const cancellations = cancellationCountStore.get(ownerAddress);
    if (cancellations && cancellations.count >= 2) {
      const daysSince = (Date.now() - new Date(cancellations.since).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 30) {
        effectiveThreshold = Math.min(circle.threshold + 1, activeGuardians.length);
      }
    }

    const challengeNonce = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const cooldownExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24h
    const requestExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const recoveryRequest: RecoveryRequest = {
      id: crypto.randomUUID(),
      ownerAddress,
      status: 'pending_cooldown',
      challengeNonce,
      createdAt: now.toISOString(),
      cooldownExpiresAt,
      requestExpiresAt,
      approvals: [],
      threshold: effectiveThreshold,
      txHash: null,
      blockNumber: null,
      contractAddress: null,
    };

    recoveryRequestStore.set(ownerAddress, recoveryRequest);
    addAuditEvent(ownerAddress, 'request_created', { requestId: recoveryRequest.id, threshold: effectiveThreshold });

    return res.status(201).json({
      status: 'success',
      request: {
        id: recoveryRequest.id,
        status: recoveryRequest.status,
        challengeNonce: recoveryRequest.challengeNonce,
        cooldownExpiresAt: recoveryRequest.cooldownExpiresAt,
        requestExpiresAt: recoveryRequest.requestExpiresAt,
        threshold: recoveryRequest.threshold,
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
 * Body: { ownerAddress, requestId, signature }
 * Auth: Verified via EIP-712 signature (not JWT)
 */
export async function approveRecovery(req: Request, res: Response) {
  try {
    const { ownerAddress, requestId, signature, guardianAddress } = req.body;

    if (!ownerAddress || !requestId || !signature || !guardianAddress) {
      return res.status(400).json({ error: 'ownerAddress, requestId, signature, and guardianAddress are required.' });
    }

    const cleanOwner = ownerAddress.toLowerCase();
    const cleanGuardian = guardianAddress.toLowerCase();

    // Get recovery request
    const request = recoveryRequestStore.get(cleanOwner);
    if (!request || request.id !== requestId) {
      return res.status(404).json({ error: 'Recovery request not found.' });
    }

    // Check request status
    if (request.status === 'completed' || request.status === 'cancelled' || request.status === 'expired') {
      return res.status(400).json({ error: `Recovery request is ${request.status}.` });
    }

    // Check expiration
    if (new Date() > new Date(request.requestExpiresAt)) {
      request.status = 'expired';
      return res.status(410).json({ error: 'Recovery request has expired.' });
    }

    // Check cooldown period
    if (request.status === 'pending_cooldown') {
      if (new Date() < new Date(request.cooldownExpiresAt)) {
        return res.status(400).json({
          error: 'Recovery is in cooldown period. Approvals cannot be processed yet.',
          cooldownExpiresAt: request.cooldownExpiresAt,
        });
      }
      // Cooldown passed, activate
      request.status = 'active';
    }

    // Verify guardian is in the circle
    const circle = guardianCircleStore.get(cleanOwner);
    if (!circle) {
      return res.status(404).json({ error: 'Guardian circle not found.' });
    }

    const guardian = circle.guardians.find(
      g => g.guardianAddress === cleanGuardian && g.status === 'accepted'
    );
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

    // Check duplicate approval
    const alreadyApproved = request.approvals.find(a => a.guardianAddress === cleanGuardian);
    if (alreadyApproved) {
      return res.status(409).json({ error: 'You have already approved this recovery request.' });
    }

    // Add approval
    const approval: RecoveryApproval = {
      guardianAddress: cleanGuardian,
      signature,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h
    };
    request.approvals.push(approval);

    addAuditEvent(cleanOwner, 'approval_received', {
      requestId,
      guardianAddress: cleanGuardian,
    });

    // Check if threshold is met (filter expired approvals)
    const validApprovals = request.approvals.filter(a => new Date() < new Date(a.expiresAt));
    const thresholdMet = validApprovals.length >= request.threshold;

    return res.status(200).json({
      status: 'success',
      message: 'Approval recorded.',
      approvalsCollected: validApprovals.length,
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

    const ownerAddress = user.address.toLowerCase();
    const request = recoveryRequestStore.get(ownerAddress);

    if (!request || (request.status !== 'pending_cooldown' && request.status !== 'active')) {
      return res.status(404).json({ error: 'No active recovery request found.' });
    }

    request.status = 'cancelled';
    request.cancelledAt = new Date().toISOString();
    request.approvals = []; // Invalidate all approvals

    // Track cancellations for elevated security
    const cancellations = cancellationCountStore.get(ownerAddress);
    if (cancellations) {
      const daysSince = (Date.now() - new Date(cancellations.since).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 30) {
        cancellations.count++;
      } else {
        cancellationCountStore.set(ownerAddress, { count: 1, since: new Date().toISOString() });
      }
    } else {
      cancellationCountStore.set(ownerAddress, { count: 1, since: new Date().toISOString() });
    }

    addAuditEvent(ownerAddress, 'request_cancelled', { requestId: request.id, reason: 'user_cancelled' });

    return res.status(200).json({
      status: 'success',
      message: 'Recovery request cancelled. All approvals invalidated.',
    });
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

    const ownerAddress = user.address.toLowerCase();
    const request = recoveryRequestStore.get(ownerAddress);

    if (!request) {
      return res.status(200).json({ hasActiveRequest: false });
    }

    // Check and update expiration
    if ((request.status === 'pending_cooldown' || request.status === 'active') &&
        new Date() > new Date(request.requestExpiresAt)) {
      request.status = 'expired';
    }

    // Update cooldown status
    if (request.status === 'pending_cooldown' && new Date() >= new Date(request.cooldownExpiresAt)) {
      request.status = 'active';
    }

    // Count valid approvals (not expired)
    const validApprovals = request.approvals.filter(a => new Date() < new Date(a.expiresAt));
    const thresholdMet = validApprovals.length >= request.threshold;

    return res.status(200).json({
      hasActiveRequest: request.status === 'pending_cooldown' || request.status === 'active',
      request: {
        id: request.id,
        status: request.status,
        challengeNonce: request.challengeNonce,
        cooldownExpiresAt: request.cooldownExpiresAt,
        requestExpiresAt: request.requestExpiresAt,
        threshold: request.threshold,
        approvalsCollected: validApprovals.length,
        thresholdMet,
        createdAt: request.createdAt,
      },
    });
  } catch (error) {
    console.error('Error in getRecoveryStatus:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Complete recovery — marks request as completed after VEK re-protection.
 * POST /api/recovery/complete
 * Body: { encryptedVEK, vekIv, vekTag } — new VEK envelope
 */
export async function completeRecovery(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const ownerAddress = user.address.toLowerCase();
    const request = recoveryRequestStore.get(ownerAddress);

    if (!request || request.status !== 'active') {
      return res.status(400).json({ error: 'No active recovery request found.' });
    }

    // Verify threshold is met
    const validApprovals = request.approvals.filter(a => new Date() < new Date(a.expiresAt));
    if (validApprovals.length < request.threshold) {
      return res.status(400).json({ error: 'Recovery threshold not yet met.' });
    }

    const { encryptedVEK, vekIv, vekTag } = req.body;
    if (!encryptedVEK || !vekIv || !vekTag) {
      return res.status(400).json({ error: 'New encrypted VEK envelope is required.' });
    }

    // Mark recovery as completed
    request.status = 'completed';
    request.completedAt = new Date().toISOString();

    // Record last recovery time for cooldown
    lastRecoveryStore.set(ownerAddress, new Date().toISOString());

    addAuditEvent(ownerAddress, 'recovery_completed', { requestId: request.id });

    return res.status(200).json({
      status: 'success',
      message: 'Recovery completed. New VEK envelope accepted.',
    });
  } catch (error) {
    console.error('Error in completeRecovery:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Get encrypted recovery shares for reconstruction.
 * GET /api/recovery/shares
 * Only available when threshold is met.
 */
export async function getRecoveryShares(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const ownerAddress = user.address.toLowerCase();
    const request = recoveryRequestStore.get(ownerAddress);

    if (!request || request.status !== 'active') {
      return res.status(400).json({ error: 'No active recovery request.' });
    }

    // Verify threshold
    const validApprovals = request.approvals.filter(a => new Date() < new Date(a.expiresAt));
    if (validApprovals.length < request.threshold) {
      return res.status(403).json({ error: 'Recovery threshold not yet met.' });
    }

    // Get guardian circle and return encrypted shares
    const circle = guardianCircleStore.get(ownerAddress);
    if (!circle) {
      return res.status(404).json({ error: 'Guardian circle not found.' });
    }

    const shares = circle.guardians
      .filter(g => g.status === 'accepted' && g.encryptedShare)
      .map(g => ({
        guardianAddress: g.guardianAddress,
        encryptedShare: g.encryptedShare,
        shareIndex: g.shareIndex,
      }));

    return res.status(200).json({ shares });
  } catch (error) {
    console.error('Error in getRecoveryShares:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Get audit trail for the authenticated user.
 * GET /api/recovery/audit
 */
export async function getAuditTrail(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const ownerAddress = user.address.toLowerCase();
    const events = auditTrailStore.get(ownerAddress) || [];

    return res.status(200).json(events);
  } catch (error) {
    console.error('Error in getAuditTrail:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Recovery Service — Database operations for recovery request lifecycle.
 */

import prisma from '../lib/prisma';
import { RecoveryStatus } from '@prisma/client';

export class RecoveryService {
  /**
   * Create a new recovery request.
   */
  static async createRequest(userId: string, data: {
    challengeNonce: string;
    threshold: number;
    cooldownExpiresAt: Date;
    requestExpiresAt: Date;
  }) {
    return prisma.recoveryRequest.create({
      data: {
        userId,
        challengeNonce: data.challengeNonce,
        threshold: data.threshold,
        cooldownExpiresAt: data.cooldownExpiresAt,
        requestExpiresAt: data.requestExpiresAt,
        status: RecoveryStatus.PENDING_COOLDOWN,
      },
    });
  }

  /**
   * Get the active recovery request for a user.
   */
  static async getActiveRequest(userId: string) {
    return prisma.recoveryRequest.findFirst({
      where: {
        userId,
        status: { in: [RecoveryStatus.PENDING_COOLDOWN, RecoveryStatus.ACTIVE] },
      },
      include: {
        approvals: true,
      },
    });
  }

  /**
   * Cancel all active recovery requests for a user.
   */
  static async cancelActiveRequests(userId: string) {
    return prisma.recoveryRequest.updateMany({
      where: {
        userId,
        status: { in: [RecoveryStatus.PENDING_COOLDOWN, RecoveryStatus.ACTIVE] },
      },
      data: {
        status: RecoveryStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }

  /**
   * Update recovery request status.
   */
  static async updateStatus(requestId: string, status: RecoveryStatus) {
    return prisma.recoveryRequest.update({
      where: { id: requestId },
      data: {
        status,
        ...(status === RecoveryStatus.COMPLETED ? { completedAt: new Date() } : {}),
        ...(status === RecoveryStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
      },
    });
  }

  /**
   * Add a guardian approval to a recovery request.
   */
  static async addApproval(data: {
    recoveryRequestId: string;
    guardianId: string;
    signature: string;
    expiresAt: Date;
  }) {
    return prisma.recoveryApproval.create({
      data: {
        recoveryRequestId: data.recoveryRequestId,
        guardianId: data.guardianId,
        signature: data.signature,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Count valid (non-expired) approvals for a request.
   */
  static async countValidApprovals(recoveryRequestId: string): Promise<number> {
    return prisma.recoveryApproval.count({
      where: {
        recoveryRequestId,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Check if a guardian has already approved a request.
   */
  static async hasGuardianApproved(recoveryRequestId: string, guardianId: string): Promise<boolean> {
    const approval = await prisma.recoveryApproval.findUnique({
      where: {
        recoveryRequestId_guardianId: {
          recoveryRequestId,
          guardianId,
        },
      },
    });
    return !!approval;
  }

  /**
   * Count recovery requests in the last N days for rate limiting.
   */
  static async countRecentRequests(userId: string, days: number): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return prisma.recoveryRequest.count({
      where: {
        userId,
        createdAt: { gte: since },
      },
    });
  }

  /**
   * Get the last completed recovery timestamp.
   */
  static async getLastCompletedRecovery(userId: string) {
    return prisma.recoveryRequest.findFirst({
      where: {
        userId,
        status: RecoveryStatus.COMPLETED,
      },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });
  }

  /**
   * Count cancelled requests in the last N days.
   */
  static async countRecentCancellations(userId: string, days: number): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return prisma.recoveryRequest.count({
      where: {
        userId,
        status: RecoveryStatus.CANCELLED,
        cancelledAt: { gte: since },
      },
    });
  }
}

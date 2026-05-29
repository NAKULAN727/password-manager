/**
 * Guardian Service — Database operations for guardian circle management.
 */

import prisma from '../lib/prisma';
import { GuardianStatus } from '@prisma/client';

export class GuardianService {
  /**
   * Create a guardian invitation.
   */
  static async createInvitation(ownerId: string, data: {
    guardianAddress: string;
    invitationNonce: string;
    threshold: number;
    expiresAt: Date;
  }) {
    return prisma.guardian.create({
      data: {
        ownerId,
        guardianAddress: data.guardianAddress.toLowerCase(),
        invitationNonce: data.invitationNonce,
        threshold: data.threshold,
        expiresAt: data.expiresAt,
        status: GuardianStatus.PENDING,
      },
    });
  }

  /**
   * Accept a guardian invitation.
   */
  static async acceptInvitation(ownerId: string, guardianAddress: string, invitationNonce: string) {
    return prisma.guardian.updateMany({
      where: {
        ownerId,
        guardianAddress: guardianAddress.toLowerCase(),
        invitationNonce,
        status: GuardianStatus.PENDING,
      },
      data: {
        status: GuardianStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });
  }

  /**
   * Revoke a guardian.
   */
  static async revokeGuardian(ownerId: string, guardianId: string) {
    return prisma.guardian.updateMany({
      where: { id: guardianId, ownerId, status: { not: GuardianStatus.REVOKED } },
      data: {
        status: GuardianStatus.REVOKED,
        revokedAt: new Date(),
        encryptedShare: null,
        shareIndex: null,
      },
    });
  }

  /**
   * Get all active (non-revoked) guardians for an owner.
   */
  static async getCircle(ownerId: string) {
    return prisma.guardian.findMany({
      where: { ownerId, status: { not: GuardianStatus.REVOKED } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get accepted guardians count for an owner.
   */
  static async getAcceptedCount(ownerId: string): Promise<number> {
    return prisma.guardian.count({
      where: { ownerId, status: GuardianStatus.ACCEPTED },
    });
  }

  /**
   * Get the configured threshold for an owner.
   */
  static async getThreshold(ownerId: string): Promise<number> {
    const guardian = await prisma.guardian.findFirst({
      where: { ownerId, status: { not: GuardianStatus.REVOKED } },
      select: { threshold: true },
    });
    return guardian?.threshold || 0;
  }

  /**
   * Distribute encrypted recovery shares to guardians.
   */
  static async distributeShares(shares: Array<{ guardianId: string; encryptedShare: string; shareIndex: number }>) {
    const operations = shares.map(share =>
      prisma.guardian.update({
        where: { id: share.guardianId },
        data: {
          encryptedShare: share.encryptedShare,
          shareIndex: share.shareIndex,
        },
      })
    );
    return prisma.$transaction(operations);
  }

  /**
   * Get pending invitations for a guardian wallet address.
   */
  static async getPendingInvitations(guardianAddress: string) {
    return prisma.guardian.findMany({
      where: {
        guardianAddress: guardianAddress.toLowerCase(),
        status: GuardianStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: {
        owner: { select: { walletAddress: true } },
      },
    });
  }

  /**
   * Find a specific guardian by owner and address.
   */
  static async findByOwnerAndAddress(ownerId: string, guardianAddress: string) {
    return prisma.guardian.findFirst({
      where: {
        ownerId,
        guardianAddress: guardianAddress.toLowerCase(),
        status: GuardianStatus.ACCEPTED,
      },
    });
  }

  /**
   * Get guardians with encrypted shares for recovery.
   */
  static async getSharesForRecovery(ownerId: string) {
    return prisma.guardian.findMany({
      where: {
        ownerId,
        status: GuardianStatus.ACCEPTED,
        encryptedShare: { not: null },
      },
      select: {
        id: true,
        guardianAddress: true,
        encryptedShare: true,
        shareIndex: true,
      },
    });
  }
}

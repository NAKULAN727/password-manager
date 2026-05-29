/**
 * Audit Service — Immutable security event logging.
 * Records are NEVER updated or deleted.
 */

import prisma from '../lib/prisma';

export type AuditEventType =
  | 'auth.login'
  | 'auth.logout'
  | 'vault.entry_created'
  | 'vault.entry_updated'
  | 'vault.entry_deleted'
  | 'vault.vek_created'
  | 'vault.vek_updated'
  | 'guardian.invited'
  | 'guardian.accepted'
  | 'guardian.revoked'
  | 'guardian.shares_distributed'
  | 'recovery.request_created'
  | 'recovery.request_cancelled'
  | 'recovery.approval_received'
  | 'recovery.completed'
  | 'device.registered'
  | 'device.revoked';

export class AuditService {
  /**
   * Create an immutable audit log entry.
   */
  static async log(data: {
    userId: string;
    eventType: AuditEventType;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        userId: data.userId,
        eventType: data.eventType,
        metadata: data.metadata || {},
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  }

  /**
   * Get audit trail for a user (paginated).
   */
  static async getTrail(userId: string, options?: { limit?: number; offset?: number }) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /**
   * Count total audit events for a user.
   */
  static async count(userId: string): Promise<number> {
    return prisma.auditLog.count({ where: { userId } });
  }
}

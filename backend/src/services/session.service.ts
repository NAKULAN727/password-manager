/**
 * Session Service — Persistent refresh token management.
 * 
 * Security: Refresh tokens are hashed with SHA-256 before storage.
 * The server never stores raw tokens — only their hashes.
 */

import crypto from 'crypto';
import prisma from '../lib/prisma';

export class SessionService {
  /**
   * Hash a refresh token using SHA-256.
   * Only the hash is stored in the database.
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a cryptographically secure refresh token.
   */
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new session with a hashed refresh token.
   * Returns the raw token (to send to client) — never stored.
   */
  static async create(data: {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    expiresInDays?: number;
  }): Promise<{ rawToken: string; session: any }> {
    const rawToken = SessionService.generateToken();
    const tokenHash = SessionService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + (data.expiresInDays || 7) * 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        userId: data.userId,
        tokenHash,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent?.slice(0, 512) || null,
        expiresAt,
      },
    });

    return { rawToken, session };
  }

  /**
   * Validate a refresh token and return the associated session.
   * Returns null if token is invalid, expired, or revoked.
   */
  static async validate(rawToken: string) {
    const tokenHash = SessionService.hashToken(rawToken);

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) return null;
    if (session.revokedAt) return null;
    if (new Date() > session.expiresAt) return null;

    return session;
  }

  /**
   * Rotate a refresh token: revoke old, create new.
   * Implements refresh token rotation for security.
   */
  static async rotate(oldRawToken: string, data: {
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ rawToken: string; session: any } | null> {
    const oldHash = SessionService.hashToken(oldRawToken);

    const oldSession = await prisma.session.findUnique({
      where: { tokenHash: oldHash },
    });

    if (!oldSession || oldSession.revokedAt || new Date() > oldSession.expiresAt) {
      return null;
    }

    // Revoke old session and create new one in a transaction
    const newRawToken = SessionService.generateToken();
    const newHash = SessionService.hashToken(newRawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [, newSession] = await prisma.$transaction([
      prisma.session.update({
        where: { id: oldSession.id },
        data: { revokedAt: new Date() },
      }),
      prisma.session.create({
        data: {
          userId: oldSession.userId,
          tokenHash: newHash,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent?.slice(0, 512) || null,
          expiresAt,
        },
      }),
    ]);

    return { rawToken: newRawToken, session: newSession };
  }

  /**
   * Revoke a specific session by raw token.
   */
  static async revoke(rawToken: string): Promise<boolean> {
    const tokenHash = SessionService.hashToken(rawToken);

    try {
      await prisma.session.update({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Revoke all sessions for a user (logout everywhere).
   */
  static async revokeAllForUser(userId: string): Promise<number> {
    const result = await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  /**
   * Get all active sessions for a user.
   */
  static async getActiveSessions(userId: string) {
    return prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        deviceLabel: true,
        lastRefreshedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { lastRefreshedAt: 'desc' },
    });
  }

  /**
   * Cleanup expired and revoked sessions older than N days.
   * Should be called periodically (cron job).
   */
  static async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: cutoff } },
          { revokedAt: { lt: cutoff } },
        ],
      },
    });
    return result.count;
  }
}

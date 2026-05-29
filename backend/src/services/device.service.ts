/**
 * Trusted Device Service — Device registration and verification.
 * 
 * Manages device-assisted recovery tokens bound to browser fingerprints.
 * Maximum 3 trusted devices per user.
 */

import prisma from '../lib/prisma';

export class DeviceService {
  /**
   * Register a new trusted device.
   * Fails if user already has 3 active devices.
   */
  static async register(userId: string, data: {
    deviceFingerprint: string;
    label: string;
    encryptedRecoveryData?: string;
  }) {
    // Check device limit (max 3)
    const activeCount = await prisma.trustedDevice.count({
      where: { userId, revokedAt: null },
    });

    if (activeCount >= 3) {
      throw new Error('Maximum of 3 trusted devices allowed. Revoke an existing device first.');
    }

    return prisma.trustedDevice.upsert({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint: data.deviceFingerprint,
        },
      },
      update: {
        label: data.label,
        encryptedRecoveryData: data.encryptedRecoveryData || null,
        lastUsedAt: new Date(),
        revokedAt: null, // Re-activate if previously revoked
      },
      create: {
        userId,
        deviceFingerprint: data.deviceFingerprint,
        label: data.label,
        encryptedRecoveryData: data.encryptedRecoveryData || null,
      },
    });
  }

  /**
   * List all active (non-revoked) trusted devices for a user.
   */
  static async listActive(userId: string) {
    return prisma.trustedDevice.findMany({
      where: { userId, revokedAt: null },
      select: {
        id: true,
        deviceFingerprint: true,
        label: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  /**
   * Revoke a trusted device by ID.
   */
  static async revoke(userId: string, deviceId: string): Promise<boolean> {
    const result = await prisma.trustedDevice.updateMany({
      where: { id: deviceId, userId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        encryptedRecoveryData: null, // Clear recovery material
      },
    });
    return result.count > 0;
  }

  /**
   * Verify device ownership by fingerprint.
   * Updates lastUsedAt on successful verification.
   */
  static async verify(userId: string, deviceFingerprint: string) {
    const device = await prisma.trustedDevice.findUnique({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint,
        },
      },
    });

    if (!device || device.revokedAt) return null;

    // Update last used timestamp
    await prisma.trustedDevice.update({
      where: { id: device.id },
      data: { lastUsedAt: new Date() },
    });

    return device;
  }

  /**
   * Get encrypted recovery data for a verified device.
   */
  static async getRecoveryData(userId: string, deviceFingerprint: string) {
    const device = await prisma.trustedDevice.findUnique({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint,
        },
      },
      select: {
        id: true,
        encryptedRecoveryData: true,
        revokedAt: true,
      },
    });

    if (!device || device.revokedAt || !device.encryptedRecoveryData) return null;
    return device.encryptedRecoveryData;
  }
}

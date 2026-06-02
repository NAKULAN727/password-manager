/**
 * Vault Service — Database operations for encrypted vault entries and VEK.
 */

import prisma from '../lib/prisma';

export class VaultService {
  // ─── VEK Operations ──────────────────────────────────────────────────

  /**
   * Check if an encrypted VEK exists for a user.
   */
  static async hasVek(userId: string): Promise<boolean> {
    const vek = await prisma.encryptedVEK.findUnique({
      where: { userId },
    });
    return !!vek;
  }

  /**
   * Save encrypted VEK envelope. Fails if one already exists.
   */
  static async saveVek(userId: string, data: {
    encryptedVEK: string;
    iv: string;
    tag: string;
    kdfSalt: string;
  }) {
    return prisma.encryptedVEK.create({
      data: {
        userId,
        encryptedVEK: data.encryptedVEK,
        iv: data.iv,
        tag: data.tag,
        kdfSalt: data.kdfSalt,
      },
    });
  }

  /**
   * Get encrypted VEK envelope for a user.
   */
  static async getVek(userId: string) {
    return prisma.encryptedVEK.findUnique({
      where: { userId },
    });
  }

  /**
   * Update encrypted VEK (used during recovery re-protection).
   */
  static async updateVek(userId: string, data: {
    encryptedVEK: string;
    iv: string;
    tag: string;
  }) {
    return prisma.encryptedVEK.update({
      where: { userId },
      data: {
        encryptedVEK: data.encryptedVEK,
        iv: data.iv,
        tag: data.tag,
        updatedAt: new Date(),
      },
    });
  }

  // ─── Vault Entry Operations ──────────────────────────────────────────

  /**
   * Add an encrypted vault entry.
   */
  static async addEntry(userId: string, data: {
    label: string;
    username: string;
    ciphertext: string;
    iv: string;
    tag: string;
    checksum?: string;
  }) {
    return prisma.vaultEntry.create({
      data: {
        userId,
        label: data.label,
        username: data.username || '',
        ciphertext: data.ciphertext,
        iv: data.iv,
        tag: data.tag,
        checksum: data.checksum || null,
      },
    });
  }

  /**
   * List all encrypted vault entries for a user.
   */
  static async listEntries(userId: string) {
    return prisma.vaultEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update an encrypted vault entry.
   */
  static async updateEntry(userId: string, entryId: string, data: {
    label: string;
    username: string;
    ciphertext: string;
    iv: string;
    tag: string;
    checksum?: string;
  }) {
    return prisma.vaultEntry.updateMany({
      where: { id: entryId, userId },
      data: {
        label: data.label,
        username: data.username || '',
        ciphertext: data.ciphertext,
        iv: data.iv,
        tag: data.tag,
        checksum: data.checksum || null,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete a vault entry.
   */
  static async deleteEntry(userId: string, entryId: string) {
    return prisma.vaultEntry.deleteMany({
      where: { id: entryId, userId },
    });
  }
}

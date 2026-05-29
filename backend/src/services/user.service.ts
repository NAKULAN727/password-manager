/**
 * User Service — Database operations for user management.
 */

import prisma from '../lib/prisma';

export class UserService {
  /**
   * Find or create a user by wallet address.
   * Called during SIWE authentication.
   */
  static async findOrCreate(walletAddress: string) {
    const cleanAddress = walletAddress.toLowerCase();

    return prisma.user.upsert({
      where: { walletAddress: cleanAddress },
      update: { updatedAt: new Date() },
      create: { walletAddress: cleanAddress },
    });
  }

  /**
   * Find a user by wallet address.
   */
  static async findByAddress(walletAddress: string) {
    return prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });
  }

  /**
   * Find a user by ID.
   */
  static async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }
}

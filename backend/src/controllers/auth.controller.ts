import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { generateNonce, parseSiweMessage, verifySignature } from '../utils/crypto';

// In-memory cache to manage pending SIWE nonces securely
interface NonceSession {
  nonce: string;
  expiresAt: number; // millisecond timestamp
}

// Key is lowercase ethereum address, value is the session nonce metadata
const nonceStore = new Map<string, NonceSession>();

// Periodic garbage collection to clear expired nonces and prevent memory exhaustion
setInterval(() => {
  const now = Date.now();
  for (const [address, session] of nonceStore.entries()) {
    if (session.expiresAt < now) {
      nonceStore.delete(address);
    }
  }
}, 60 * 1000); // Run cleanup every 60 seconds

/**
 * Handles Requesting a single-use cryptographically secure nonce.
 * POST /api/auth/nonce
 */
export async function getNonce(req: Request, res: Response) {
  try {
    const { address } = req.body;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'A valid Ethereum address is required.' });
    }

    const cleanAddress = address.toLowerCase();
    const nonce = generateNonce();
    const expiresAt = Date.now() + 90 * 1000; // 90 seconds lifetime (production default)

    nonceStore.set(cleanAddress, { nonce, expiresAt });

    return res.status(200).json({
      nonce,
      expiresAt: new Date(expiresAt).toISOString()
    });
  } catch (error: any) {
    console.error('Error in getNonce:', error);
    return res.status(500).json({ error: 'Internal server error while generating nonce.' });
  }
}

/**
 * Handles SIWE Message signature validation and JWT issuance.
 * POST /api/auth/verify
 */
export async function verifySiwe(req: Request, res: Response) {
  try {
    const { address, message, signature } = req.body;

    if (!address || !message || !signature) {
      return res.status(400).json({ error: 'Missing required parameters: address, message, and signature are required.' });
    }

    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address format.' });
    }

    const cleanAddress = address.toLowerCase();

    // 1. Retrieve the nonce active session
    const activeSession = nonceStore.get(cleanAddress);
    if (!activeSession) {
      return res.status(400).json({ error: 'No active nonce session found for this wallet. Request a new nonce.' });
    }

    // 2. Assert Nonce Expiration
    if (Date.now() > activeSession.expiresAt) {
      nonceStore.delete(cleanAddress); // Clean up expired session
      return res.status(400).json({ error: 'Nonce session has expired. Please try signing in again.' });
    }

    // 3. Parse SIWE Message
    const siweData = parseSiweMessage(message);
    if (!siweData) {
      return res.status(400).json({ error: 'Malformed EIP-4361 SIWE message.' });
    }

    // 4. Assert Address Matching
    if (siweData.address.toLowerCase() !== cleanAddress) {
      return res.status(400).json({ error: 'Wallet address in the message does not match the requester.' });
    }

    // 5. Assert Nonce Matching
    if (siweData.nonce !== activeSession.nonce) {
      return res.status(400).json({ error: 'Cryptographic nonce does not match the session nonce.' });
    }

    // 6. Cryptographically Verify Signature
    const isSignatureValid = verifySignature(message, signature, cleanAddress);
    if (!isSignatureValid) {
      return res.status(401).json({ error: 'Cryptographic signature verification failed.' });
    }

    // 7. Atomic Invalidation (Strict single-use policy to protect against replay attacks)
    nonceStore.delete(cleanAddress);

    // 8. Generate short-lived JWT session
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';
    const token = jwt.sign(
      { address: cleanAddress },
      jwtSecret,
      { expiresIn: '1h' } // Short-lived (1 hour) session
    );

    return res.status(200).json({
      token,
      user: {
        address: cleanAddress
      }
    });
  } catch (error: any) {
    console.error('Error in verifySiwe:', error);
    return res.status(500).json({ error: 'Internal server error during signature verification.' });
  }
}

/**
 * Endpoint for testing token status and returning profile info.
 * GET /api/auth/profile
 */
export async function getProfile(req: Request, res: Response) {
  // The address is added by the authenticateToken middleware to req.user
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  return res.status(200).json({ user });
}

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { generateNonce, parseSiweMessage, verifySignature } from '../utils/crypto';

// In-memory cache to manage pending SIWE nonces securely
interface NonceSession {
  nonce: string;
  expiresAt: number; // millisecond timestamp
}

// Key is lowercase ethereum address, value is the session nonce metadata
const nonceStore = new Map<string, NonceSession>();

// In-memory cache to manage secure refresh tokens
interface RefreshSession {
  address: string;
  expiresAt: number;
}
const refreshTokenStore = new Map<string, RefreshSession>();

// Helper to parse specific cookie values from the Raw Cookie Header string
function parseCookie(cookieString: string | undefined, name: string): string | null {
  if (!cookieString) return null;
  const pairs = cookieString.split(';');
  for (let pair of pairs) {
    const splitIndex = pair.indexOf('=');
    if (splitIndex === -1) continue;
    const key = pair.substring(0, splitIndex).trim();
    const value = pair.substring(splitIndex + 1).trim();
    if (key === name) return decodeURIComponent(value);
  }
  return null;
}

// Periodic garbage collection to clear expired nonces and prevent memory exhaustion
setInterval(() => {
  const now = Date.now();
  for (const [address, session] of nonceStore.entries()) {
    if (session.expiresAt < now) {
      nonceStore.delete(address);
    }
  }
  for (const [token, session] of refreshTokenStore.entries()) {
    if (session.expiresAt < now) {
      refreshTokenStore.delete(token);
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

    // 7.5. Ensure user exists in database (upsert on successful auth)
    const { UserService, AuditService } = await import('../services');
    const dbUser = await UserService.findOrCreate(cleanAddress);
    await AuditService.log({
      userId: dbUser.id,
      eventType: 'auth.login',
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    // 8. Generate short-lived JWT accessToken session (15 minutes)
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';
    const accessToken = jwt.sign(
      { address: cleanAddress },
      jwtSecret,
      { expiresIn: '15m' }
    );

    // 9. Generate high-entropy Refresh Token (7 days)
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    refreshTokenStore.set(refreshToken, { address: cleanAddress, expiresAt: refreshExpiresAt });

    // 10. Set cookies on response
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(200).json({
      token: accessToken, // Hybrid fallback for environments where cross-origin cookies are blocked
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
 * Refresh access token session using the refresh token cookie.
 * POST /api/auth/refresh
 */
export async function refreshSession(req: Request, res: Response) {
  try {
    const cookies = req.headers.cookie;
    const token = parseCookie(cookies, 'refreshToken');

    if (!token) {
      return res.status(401).json({ error: 'Refresh token is missing. Please log in again.' });
    }

    const session = refreshTokenStore.get(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired refresh token. Please log in again.' });
    }

    if (Date.now() > session.expiresAt) {
      refreshTokenStore.delete(token);
      return res.status(401).json({ error: 'Refresh token has expired. Please log in again.' });
    }

    // Refresh access token
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';
    const newAccessToken = jwt.sign(
      { address: session.address },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    return res.status(200).json({
      token: newAccessToken, // Hybrid fallback
      user: {
        address: session.address
      }
    });
  } catch (error) {
    console.error('Error in refreshSession:', error);
    return res.status(500).json({ error: 'Internal server error during session refresh.' });
  }
}

/**
 * Terminate secure session and invalidate cookies.
 * POST /api/auth/logout
 */
export async function logoutSession(req: Request, res: Response) {
  try {
    const cookies = req.headers.cookie;
    const token = parseCookie(cookies, 'refreshToken');

    if (token) {
      refreshTokenStore.delete(token);
    }

    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('accessToken', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 0,
      expires: new Date(0)
    });

    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 0,
      expires: new Date(0)
    });

    return res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Error in logoutSession:', error);
    return res.status(500).json({ error: 'Internal server error during logout.' });
  }
}

/**
 * Endpoint for testing token status and returning profile info.
 * GET /api/auth/profile
 */
export async function getProfile(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  return res.status(200).json({ user });
}

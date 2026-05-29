import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { generateNonce, parseSiweMessage, verifySignature } from '../utils/crypto';
import { UserService, AuditService, SessionService } from '../services';

// ─── Nonce Store ─────────────────────────────────────────────────────────────
// Nonces are ephemeral (90s TTL) and intentionally kept in-memory.
// They are single-use, short-lived, and don't need persistence.
// For multi-instance deployments, replace with Redis.

interface NonceSession {
  nonce: string;
  expiresAt: number;
}

const nonceStore = new Map<string, NonceSession>();

// Periodic garbage collection for expired nonces
setInterval(() => {
  const now = Date.now();
  for (const [address, session] of nonceStore.entries()) {
    if (session.expiresAt < now) {
      nonceStore.delete(address);
    }
  }
}, 60 * 1000);

// Helper to parse cookie values
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

/**
 * Request a single-use cryptographically secure nonce.
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
    const expiresAt = Date.now() + 90 * 1000;

    nonceStore.set(cleanAddress, { nonce, expiresAt });

    return res.status(200).json({
      nonce,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error: any) {
    console.error('Error in getNonce:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * SIWE signature validation, JWT issuance, and persistent session creation.
 * POST /api/auth/verify
 */
export async function verifySiwe(req: Request, res: Response) {
  try {
    const { address, message, signature } = req.body;

    if (!address || !message || !signature) {
      return res.status(400).json({ error: 'address, message, and signature are required.' });
    }

    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address format.' });
    }

    const cleanAddress = address.toLowerCase();

    // 1. Retrieve nonce session
    const activeSession = nonceStore.get(cleanAddress);
    if (!activeSession) {
      return res.status(400).json({ error: 'No active nonce session. Request a new nonce.' });
    }

    // 2. Check expiration
    if (Date.now() > activeSession.expiresAt) {
      nonceStore.delete(cleanAddress);
      return res.status(400).json({ error: 'Nonce session has expired.' });
    }

    // 3. Parse SIWE message
    const siweData = parseSiweMessage(message);
    if (!siweData) {
      return res.status(400).json({ error: 'Malformed EIP-4361 SIWE message.' });
    }

    // 4. Validate address match
    if (siweData.address.toLowerCase() !== cleanAddress) {
      return res.status(400).json({ error: 'Address mismatch in SIWE message.' });
    }

    // 5. Validate nonce match
    if (siweData.nonce !== activeSession.nonce) {
      return res.status(400).json({ error: 'Nonce mismatch.' });
    }

    // 6. Verify cryptographic signature
    const isSignatureValid = verifySignature(message, signature, cleanAddress);
    if (!isSignatureValid) {
      return res.status(401).json({ error: 'Signature verification failed.' });
    }

    // 7. Invalidate nonce (single-use)
    nonceStore.delete(cleanAddress);

    // 8. Ensure user exists in PostgreSQL
    const dbUser = await UserService.findOrCreate(cleanAddress);

    // 9. Create persistent session in PostgreSQL (replaces in-memory refreshTokenStore)
    const { rawToken: refreshToken } = await SessionService.create({
      userId: dbUser.id,
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    // 10. Generate short-lived JWT access token (15 minutes)
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';
    const accessToken = jwt.sign(
      { address: cleanAddress },
      jwtSecret,
      { expiresIn: '15m' }
    );

    // 11. Audit log
    await AuditService.log({
      userId: dbUser.id,
      eventType: 'auth.login',
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    // 12. Set secure cookies
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      token: accessToken,
      user: { address: cleanAddress },
    });
  } catch (error: any) {
    console.error('Error in verifySiwe:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Refresh access token using persistent session.
 * Implements refresh token rotation — old token is revoked, new one issued.
 * POST /api/auth/refresh
 */
export async function refreshSession(req: Request, res: Response) {
  try {
    const cookies = req.headers.cookie;
    const rawToken = parseCookie(cookies, 'refreshToken');

    if (!rawToken) {
      return res.status(401).json({ error: 'Refresh token is missing.' });
    }

    // Validate and rotate the refresh token (revoke old, create new)
    const result = await SessionService.rotate(rawToken, {
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    if (!result) {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    // Look up user for the new session
    const session = await SessionService.validate(result.rawToken);
    if (!session) {
      return res.status(401).json({ error: 'Session validation failed.' });
    }

    // Generate new access token
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';
    const newAccessToken = jwt.sign(
      { address: session.user.walletAddress },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', result.rawToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      token: newAccessToken,
      user: { address: session.user.walletAddress },
    });
  } catch (error) {
    console.error('Error in refreshSession:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Terminate session — revokes refresh token in PostgreSQL.
 * POST /api/auth/logout
 */
export async function logoutSession(req: Request, res: Response) {
  try {
    const cookies = req.headers.cookie;
    const rawToken = parseCookie(cookies, 'refreshToken');

    if (rawToken) {
      await SessionService.revoke(rawToken);
    }

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 0,
      expires: new Date(0),
    });

    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 0,
      expires: new Date(0),
    });

    return res.status(200).json({ status: 'success', message: 'Logged out.' });
  } catch (error) {
    console.error('Error in logoutSession:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Get authenticated user profile.
 * GET /api/auth/profile
 */
export async function getProfile(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  return res.status(200).json({ user });
}

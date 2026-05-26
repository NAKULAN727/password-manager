import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    address: string;
  };
}

/**
 * Helper to parse specific cookie values from the Raw Cookie Header string.
 * This is zero-dependency and avoids adding cookie-parser as a dependency.
 */
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
 * Express middleware to validate JWT tokens and protect backend routes.
 * Supports parsing tokens from HttpOnly cookies (primary) and Authorization headers (fallback).
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  
  // Parse accessToken from HTTP Cookies
  const cookieToken = parseCookie(req.headers.cookie, 'accessToken');
  
  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({ error: 'Access token is required. Secure session has expired.' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      console.warn('JWT Verification failed:', err.message);
      return res.status(403).json({ error: 'Session token has expired or is invalid.' });
    }

    // Attach decoded user payload to request
    (req as AuthenticatedRequest).user = decoded as { address: string };
    next();
  });
}

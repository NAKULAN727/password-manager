import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    address: string;
  };
}

/**
 * Express middleware to validate JWT tokens and protect backend routes.
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  
  // Format expected: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token is required. Authorization header is missing.' });
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

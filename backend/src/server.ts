import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import vaultRoutes from './routes/vault.routes';
import guardianRoutes from './routes/guardian.routes';
import recoveryRoutes from './routes/recovery.routes';
import deviceRoutes from './routes/device.routes';
import contactRoutes from './routes/contact.routes';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());

// Configure CORS for web client integration
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsing Middleware
app.use(express.json());

// Memory store for IP-based rate limiting
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimiterCache = new Map<string, RateLimitRecord>();

/**
 * Robust, zero-dependency in-memory rate limiting middleware.
 * Binds requests to source IP, preventing brute-force and resource exhaustion.
 */
function rateLimiter(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!rateLimiterCache.has(ip)) {
      rateLimiterCache.set(ip, {
        count: 1,
        resetAt: now + windowMs
      });
      return next();
    }

    const record = rateLimiterCache.get(ip)!;

    // Reset window if elapsed
    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + windowMs;
      return next();
    }

    record.count++;
    if (record.count > maxRequests) {
      console.warn(`[RateLimit] Blocked request from IP: ${ip} (Limit: ${maxRequests} req/window)`);
      return res.status(429).json({
        error: 'Too many requests. API rate limit exceeded. Please try again later.'
      });
    }

    next();
  };
}

// Garbage collection to clean up old rate limiter records and prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimiterCache.entries()) {
    if (now > record.resetAt) {
      rateLimiterCache.delete(ip);
    }
  }
}, 5 * 60 * 1000); // GC every 5 minutes

// Apply Rate Limiter: Max 100 requests per 15 minutes window
const apiLimiter = rateLimiter(100, 15 * 60 * 1000);

// Routes Bindings
app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/vault', apiLimiter, vaultRoutes);
app.use('/api/guardians', apiLimiter, guardianRoutes);
app.use('/api/recovery', apiLimiter, recoveryRoutes);
app.use('/api/devices', apiLimiter, deviceRoutes);
app.use('/api/contact', apiLimiter, contactRoutes);

// Health Check Endpoint (with database connectivity verification)
app.get('/health', async (req, res) => {
  try {
    const { default: prisma } = await import('./lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    
    const [userCount, entryCount, sessionCount] = await Promise.all([
      prisma.user.count(),
      prisma.vaultEntry.count(),
      prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    ]);

    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      stats: {
        users: userCount,
        vaultEntries: entryCount,
        activeSessions: sessionCount,
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Database verification endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/db-verify', async (req, res) => {
    try {
      const { default: prisma } = await import('./lib/prisma');

      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;

      const counts: Record<string, number> = {};
      for (const { tablename } of tables) {
        const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*) as count FROM "${tablename}"`
        );
        counts[tablename] = Number(result[0].count);
      }

      res.status(200).json({
        status: 'verified',
        tables: tables.map(t => t.tablename),
        rowCounts: counts,
        prismaModels: ['User', 'EncryptedVEK', 'VaultEntry', 'Guardian', 'RecoveryRequest', 'RecoveryApproval', 'AuditLog', 'TrustedDevice', 'Session'],
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}

// Global 404 Route handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'An unexpected internal error occurred.' });
});

// Start listening for connections
app.listen(port, () => {
  console.log(`===============================================`);
  console.log(`🛡️  ZK Password Manager Auth API is running  🛡️`);
  console.log(`🔗 URL: http://localhost:${port}`);
  console.log(`🌟 Allowed Client Origin: ${allowedOrigin}`);
  console.log(`===============================================`);
});

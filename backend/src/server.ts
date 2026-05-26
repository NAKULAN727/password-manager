import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import vaultRoutes from './routes/vault.routes';

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

// Routes Bindings
app.use('/api/auth', authRoutes);
app.use('/api/vault', vaultRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

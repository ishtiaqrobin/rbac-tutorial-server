/**
 * app.ts — Express application factory
 *
 * EDUCATIONAL OVERVIEW
 * --------------------
 * This file sets up the Express application:
 *   1. Security middleware (helmet, cors)
 *   2. Body parser (express.json)
 *   3. Route mounting
 *   4. Central error handler
 *
 * It exports an `app` instance that `server.ts` (the HTTP server)
 * and the seed script can both import, allowing reuse in tests.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './app/routes/auth.routes';
import userRoutes from './app/routes/user.routes';
import roleRoutes from './app/routes/role.routes';
import permissionRoutes from './app/routes/permission.routes';

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────
app.use(helmet());                    // security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());              // parse JSON request bodies

// ─── Routes ──────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ message: 'RBAC API is running. Use /api/auth/login to get started.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─── Central error handler ───────────────────────────────────────────────
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[error]', err);
  res.status(500).json({ message: 'Internal server error' });
});

export default app;

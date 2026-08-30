/**
 * server.ts — HTTP server bootstrap
 *
 * Loads environment variables, connects to PostgreSQL, and starts
 * listening for incoming requests.
 */

import http from 'http';
import dotenv from 'dotenv';
import app from './app';
import pool from './config/database';

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

server.listen(PORT, async () => {
  console.log(`[server] Express listening on http://localhost:${PORT}`);

  // Verify the database connection on startup.
  try {
    await pool.query('SELECT 1');
    console.log('[server] Database connection verified');
  } catch (err) {
    console.error('[server] ERROR: Could not connect to PostgreSQL', err);
    process.exit(1);
  }
});

/**
 * database.ts — PostgreSQL connection pool
 *
 * EDUCATIONAL NOTE
 * ----------------
 * A connection pool keeps a set of open database connections so that
 * incoming HTTP requests don't have to pay the (expensive) cost of
 * opening — and closing — a TCP connection on every query.
 * `pg.Pool` reuses connections, improving throughput under load.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     Number(process.env.DB_PORT || 5432),
  user:     process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rbac_tutorial',
  max:      20,             // max connections kept open
  idleTimeoutMillis: 30000 // close idle connections after 30 s
});

// Emit a log when the pool establishes its first real connection.
pool.on('connect', () => {
  console.log('[database] PostgreSQL connection pool established');
});

pool.on('error', (err: Error) => {
  console.error('[database] Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;

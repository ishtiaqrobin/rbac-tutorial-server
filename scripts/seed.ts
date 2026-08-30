/**
 * scripts/seed.ts — Database seeding script
 *
 * EDUCATIONAL OVERVIEW
 * --------------------
 * This script populates a fresh database with:
 *   1. Roles          (Admin, Editor, Viewer)
 *   2. Permissions    (manage_users, view_reports, create_content, etc.)
 *   3. role_permissions (which permissions each role gets)
 *   4. Users          (one per role, with known passwords)
 *
 * RUN:
 *   npm run seed          (or: npx ts-node-dev scripts/seed.ts)
 *
 * Dummy credentials (DO NOT use in production!):
 *   Admin  → admin@example.com  / Admin123!
 *   Editor → editor@example.com / Editor123!
 *   Viewer → viewer@example.com / Viewer123!
 */

import dotenv from 'dotenv';
import pool from '../src/config/database';
import { hashPassword } from '../src/utils/hash';

dotenv.config();

// ─── Role & permission definitions ────────────────────────────────────────
const ROLES = [
  { name: 'admin',  description: 'Full access — can manage users, roles, and content' },
  { name: 'editor', description: 'Can create and edit content' },
  { name: 'viewer', description: 'Read-only access — can view reports and content' }
];

const PERMISSIONS = [
  { name: 'manage_users',      description: 'Create, read, update, and delete users' },
  { name: 'manage_roles',      description: 'Assign and modify roles' },
  { name: 'manage_permissions', description: 'Grant or revoke permissions from roles' },
  { name: 'view_reports',      description: 'View analytics and reports' },
  { name: 'create_content',    description: 'Create new content items' },
  { name: 'edit_content',      description: 'Modify existing content items' },
  { name: 'delete_content',    description: 'Remove content items' }
];

// Which permissions each role receives.  The key is the role name.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin:  ['manage_users', 'manage_roles', 'manage_permissions', 'view_reports',
            'create_content', 'edit_content', 'delete_content'],
  editor: ['view_reports', 'create_content', 'edit_content'],
  viewer: ['view_reports']
};

// ─── User definitions (passwords are hashed before insertion) ─────────────
const USERS = [
  { username: 'admin_user',  email: 'admin@example.com',  password: 'Admin123!',  role: 'admin'  },
  { username: 'editor_user', email: 'editor@example.com', password: 'Editor123!', role: 'editor' },
  { username: 'viewer_user', email: 'viewer@example.com', password: 'Viewer123!', role: 'viewer' },
  // Extra demo users
  { username: 'alice', email: 'alice@example.com', password: 'Alice123!', role: 'viewer' },
  { username: 'bob',   email: 'bob@example.com',   password: 'Bob123!',   role: 'editor' }
];

async function runSeed() {
  try {
    await pool.connect();
    await pool.query('BEGIN');

    // ── 1. Clean tables (idempotent re-runs) ────────────────────────────
    console.log('[seed] Clearing existing data...');
    await pool.query('TRUNCATE users, role_permissions, roles, permissions RESTART IDENTITY CASCADE');

    // ── 2. Insert roles ──────────────────────────────────────────────────
    console.log('[seed] Inserting roles...');
    const roleIdMap = new Map<string, number>();
    for (const role of ROLES) {
      const result = await pool.query(
        'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id',
        [role.name, role.description]
      );
      roleIdMap.set(role.name, result.rows[0].id);
    }

    // ── 3. Insert permissions ────────────────────────────────────────────
    console.log('[seed] Inserting permissions...');
    const permIdMap = new Map<string, number>();
    for (const perm of PERMISSIONS) {
      const result = await pool.query(
        'INSERT INTO permissions (name, description) VALUES ($1, $2) RETURNING id',
        [perm.name, perm.description]
      );
      permIdMap.set(perm.name, result.rows[0].id);
    }

    // ── 4. Link roles ↔ permissions ──────────────────────────────────────
    console.log('[seed] Mapping role_permissions...');
    for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS)) {
      const roleId = roleIdMap.get(roleName);
      if (!roleId) continue;
      for (const permName of permNames) {
        const permId = permIdMap.get(permName);
        if (!permId) continue;
        await pool.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
          [roleId, permId]
        );
      }
    }

    // ── 5. Insert users with hashed passwords ────────────────────────────
    console.log('[seed] Inserting users...');
    for (const user of USERS) {
      const roleId = roleIdMap.get(user.role);
      if (!roleId) {
        throw new Error(`Unknown role "${user.role}" for user ${user.username}`);
      }
      const password_hash = await hashPassword(user.password);
      await pool.query(
        'INSERT INTO users (username, email, password_hash, role_id) VALUES ($1, $2, $3, $4)',
        [user.username, user.email, password_hash, roleId]
      );
      console.log(`  → created user: ${user.username} (${user.role})`);
    }

    await pool.query('COMMIT');
    console.log('[seed] ✅ Seed complete!');
    console.log('\nDummy credentials:');
    USERS.forEach((u) =>
      console.log(`  ${u.email}  /  ${u.password}  (${u.role})`)
    );
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('[seed] ❌ Seed failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run when invoked directly.
runSeed().catch((e) => {
  console.error(e);
  process.exit(1);
});

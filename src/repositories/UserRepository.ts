/**
 * UserRepository — data-access layer for the `users` table.
 *
 * EDUCATIONAL NOTE
 * ----------------
 * A Repository is an abstraction over the database.  It hides raw SQL
 * behind meaningful method names so that the rest of the application
 * (services, controllers) does not need to know about `pg` or query
 * syntax.  This makes the code:
 *   - Easier to unit-test (swap the pool for a mock).
 *   - Easier to maintain (SQL lives in one place).
 *   - Decoupled from the persistence technology.
 */

import pool from '../config/database';
import { User as UserEntity } from '../entities/User';
import { User as UserType, UserWithPassword, UserCreateData } from '../types';

class UserRepository {
  /**
   * Find a single user by their primary key.
   * Used by the authentication middleware to re-hydrate the user
   * from the JWT `userId` claim.
   */
  async findById(id: number): Promise<UserEntity | null> {
    const result = await pool.query<UserType>(
      `SELECT u.id, u.username, u.email, u.role_id, u.is_active,
              u.created_at, u.updated_at, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return new UserEntity({
      ...row,
      role_name: row.role_name  // attach role name for convenience
    } as any);
  }

  /**
   * Find a user by email — used during login.
   * Includes the password_hash so the service can compare it.
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    const result = await pool.query<UserWithPassword & { role_name: string }>(
      `SELECT u.*, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );
    if (result.rows.length === 0) return null;
    return new UserEntity(result.rows[0]);
  }

  /**
   * Retrieve ALL users (with their role name) for the admin panel.
   */
  async findAll(): Promise<UserType[]> {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.is_active,
              u.created_at, u.updated_at, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  }

  /**
   * Insert a new user.  Password should already be hashed before calling.
   */
  async create(data: UserCreateData): Promise<UserEntity> {
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, role_id, is_active, created_at, updated_at`,
      [data.username, data.email, data.password_hash, data.role_id]
    );
    return new UserEntity(result.rows[0]);
  }

  /**
   * Update a user's role_id and/or active status.
   */
  async updateRole(id: number, role_id: number): Promise<UserEntity | null> {
    const result = await pool.query(
      `UPDATE users SET role_id = $1 WHERE id = $2
       RETURNING id, username, email, role_id, is_active, created_at, updated_at`,
      [role_id, id]
    );
    if (result.rows.length === 0) return null;
    return new UserEntity(result.rows[0]);
  }

  /**
   * Deactivate (soft-delete) a user.
   */
  async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE users SET is_active = false WHERE id = $1', [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export const userRepository = new UserRepository();
export default userRepository;

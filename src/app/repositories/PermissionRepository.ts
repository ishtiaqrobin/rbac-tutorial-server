/**
 * PermissionRepository — data-access layer for the `permissions` table.
 *
 * On a real project these queries might live inside RoleRepository
 * (they are small), but we keep them separate for clarity in the
 * tutorial so each entity has its own repository.
 */

import pool from '../config/database';
import { Permission as PermissionType } from '../types';

class PermissionRepository {
  async findAll(): Promise<PermissionType[]> {
    const result = await pool.query(
      'SELECT id, name, description FROM permissions ORDER BY id'
    );
    return result.rows;
  }

  async findByName(name: string): Promise<PermissionType | null> {
    const result = await pool.query<PermissionType>(
      'SELECT id, name, description FROM permissions WHERE name = $1',
      [name]
    );
    return result.rows[0] || null;
  }

  async findById(id: number): Promise<PermissionType | null> {
    const result = await pool.query<PermissionType>(
      'SELECT id, name, description FROM permissions WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: { name: string; description: string }): Promise<PermissionType> {
    const result = await pool.query(
      'INSERT INTO permissions (name, description) VALUES ($1, $2) RETURNING id, name, description',
      [data.name, data.description]
    );
    return result.rows[0];
  }
}

export const permissionRepository = new PermissionRepository();
export default permissionRepository;

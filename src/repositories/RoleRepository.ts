/**
 * RoleRepository — data-access layer for the `roles` and `role_permissions` tables.
 */

import pool from '../config/database';
import { Role as RoleEntity } from '../entities/Role';
import { Role as RoleType, Permission as PermissionType } from '../types';

class RoleRepository {
  /**
   * List all roles with their associated permissions.
   * This is the query the frontend uses to display the permission matrix.
   */
  async findAllWithPermissions(): Promise<RoleEntity[]> {
    // Step 1: fetch all roles.
    const rolesResult = await pool.query<RoleType>(
      'SELECT id, name, description FROM roles ORDER BY id'
    );
    const roles = rolesResult.rows;

    // Step 2: for each role, fetch its permissions in a single batch
    //         using `ANY` so we avoid the N+1 query problem.
    if (roles.length === 0) return [];

    const roleIds = roles.map((r) => r.id);
    const permResult = await pool.query(
      `SELECT r.id          AS role_id,
              p.id          AS permission_id,
              p.name        AS permission_name,
              p.description AS permission_description
       FROM role_permissions rp
       JOIN roles r          ON rp.role_id = r.id
       JOIN permissions p    ON rp.permission_id = p.id
       WHERE r.id = ANY($1::int[])`,
      [roleIds]
    );

    // Step 3: group permissions back into their parent role.
    const permissionsByRole = new Map<number, PermissionType[]>();
    for (const row of permResult.rows) {
      const arr = permissionsByRole.get(row.role_id) || [];
      arr.push({
        id: row.permission_id,
        name: row.permission_name,
        description: row.permission_description
      });
      permissionsByRole.set(row.role_id, arr);
    }

    return roles.map(
      (r) =>
        new RoleEntity({
          ...r,
          permissions: permissionsByRole.get(r.id) || []
        })
    );
  }

  /**
   * Find a single role by its name (e.g. "admin").
   */
  async findByName(name: string): Promise<RoleType | null> {
    const result = await pool.query<RoleType>(
      'SELECT id, name, description FROM roles WHERE name = $1',
      [name]
    );
    return result.rows[0] || null;
  }

  /**
   * Find a single role by its primary key.
   */
  async findById(id: number): Promise<RoleType | null> {
    const result = await pool.query<RoleType>(
      'SELECT id, name, description FROM roles WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Return every permission name that belongs to a given role id,
   * as a flat string array.  This is the key query for RBAC checks:
   *   role → [ "manage_users", "create_content", ... ]
   */
  async findPermissionsByRoleId(roleId: number): Promise<string[]> {
    const result = await pool.query(
      `SELECT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [roleId]
    );
    return result.rows.map((row) => row.name);
  }

  /**
   * Replace ALL permissions for a role (delete + re-insert).
   * Useful for the admin "edit role" UI.
   */
  async updatePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    await pool.query('BEGIN');
    try {
      await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
      for (const permId of permissionIds) {
        await pool.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
          [roleId, permId]
        );
      }
      await pool.query('COMMIT');
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  }

  /**
   * List ALL permissions in the system (for the permission picker).
   */
  async findAllPermissions(): Promise<PermissionType[]> {
    const result = await pool.query(
      'SELECT id, name, description FROM permissions ORDER BY id'
    );
    return result.rows;
  }

  /**
   * Insert a brand-new role.
   */
  async create(data: { name: string; description: string }): Promise<RoleType> {
    const result = await pool.query(
      'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id, name, description',
      [data.name, data.description]
    );
    return result.rows[0];
  }
}

export const roleRepository = new RoleRepository();
export default roleRepository;

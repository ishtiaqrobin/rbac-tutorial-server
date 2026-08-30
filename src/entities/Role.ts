/**
 * Role entity — domain model for the `roles` table.
 *
 * In RBAC, a Role is the bridge between Users and Permissions:
 *   User →(has one)→ Role →(has many)→ Permissions
 */

import { Permission as PermissionType } from '../types';

export class Role {
  public id!: number;
  public name!: string;
  public description!: string;
  public created_at?: Date;
  // Populated only when joined with role_permissions + permissions
  public permissions?: PermissionType[];

  constructor(data: Partial<Role>) {
    Object.assign(this, data);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      permissions: this.permissions,
      created_at: this.created_at
    };
  }
}

export default Role;

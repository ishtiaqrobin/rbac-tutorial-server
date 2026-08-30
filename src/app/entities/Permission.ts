/**
 * Permission entity — domain model for the `permissions` table.
 *
 * A Permission is the smallest unit of access in RBAC.
 * Examples: "manage_users", "create_content", "view_reports".
 */

import { Permission as PermissionType } from '../types';

export class Permission {
  public id!: number;
  public name!: string;
  public description!: string;
  public created_at?: Date;

  constructor(data: Partial<PermissionType>) {
    Object.assign(this, data);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      created_at: this.created_at
    };
  }
}

export default Permission;

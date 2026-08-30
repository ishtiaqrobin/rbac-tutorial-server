/**
 * User entity — domain model for the `users` table.
 *
 * EDUCATIONAL NOTE
 * ----------------
 * In a Domain-Driven Design the "entity" is aware ONLY of its own
 * invariants (business rules).  Persistence (SQL queries) is delegated
 * to a Repository (see UserRepository).  This separation keeps the
 * domain logic testable and framework-agnostic.
 */

import bcrypt from 'bcryptjs';

export class User {
  public id!: number;
  public username!: string;
  public email!: string;
  public password_hash!: string;
  public role_id!: number;
  public is_active!: boolean;
  public created_at!: Date;
  public updated_at!: Date;

  constructor(data: Partial<User>) {
    Object.assign(this, data);
  }

  // ─── Business rule: never expose the password hash ──────────────────────
  /**
   * Returns a plain object suitable for sending over the API.
   * The `password_hash` field is stripped so it can never leak.
   */
  toSafeJSON() {
    const { password_hash, ...safe } = this;
    void password_hash; // intentionally excluded — suppress unused-var warning
    return safe;
  }

  // ─── Business rule: constant-time password comparison ───────────────────
  async comparePassword(plain: string): Promise<boolean> {
    return bcrypt.compare(plain, this.password_hash);
  }
}

export default User;

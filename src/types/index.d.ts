/**
 * Shared TypeScript type definitions for the RBAC backend.
 *
 * These interfaces mirror the PostgreSQL tables so that query results
 * are properly typed — preventing `any`-driven bugs at compile time.
 */

/**
 * A role groups a set of permissions together.
 * Maps to the `roles` table.
 */
export interface Role {
  id: number;
  name: string;            // e.g. "admin", "editor", "viewer"
  description: string;
  permissions?: Permission[];
}

/**
 * A permission is the most granular access unit.
 * Maps to the `permissions` table.
 */
export interface Permission {
  id: number;
  name: string;            // e.g. "manage_users", "create_content"
  description: string;
}

/**
 * A user record.
 * Maps to the `users` table.
 * `password_hash` is intentionally excluded from this public type
 * to reduce the risk of accidentally leaking it in API responses.
 */
export interface User {
  id: number;
  username: string;
  email: string;
  role_id: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  // Joined fields (populated when needed):
  role?: Role;
  role_name?: string;      // convenience: role name from a JOIN
}

/**
 * Internal type used by UserRepository.findByEmail to include
 * the password_hash column in query results (without polluting
 * the public User interface above).
 */
export interface UserWithPassword extends User {
  password_hash: string;
}

/**
 * JWT payload shape.
 * This object is *encoded* into every token issued on login.
 * The middleware `authenticate` re-hydrates the request from it.
 */
export interface JwtPayload {
  userId: number;
  email: string;
  role: string;            // role NAME (e.g. "admin"), resolved at login
  permissions: string[];   // array of permission names (e.g. ["manage_users"])
  iat?: number;
  exp?: number;
}

/**
 * Request body for login endpoint.
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Request body for user registration.
 * The password is hashed before it reaches the repository.
 */
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role_id: number;
}

/**
 * Shape passed to UserRepository.create — identical to CreateUserRequest
 * but with `password` replaced by the pre-hashed `password_hash`.
 */
export interface UserCreateData {
  username: string;
  email: string;
  password_hash: string;
  role_id: number;
}

/**
 * MODULE AUGMENTATION
 * -------------------
 * We augment Express's built-in `Request` type so that `req.user`
 * is available on every request after the `authenticate` middleware
 * runs.  This avoids the need for a custom `AuthenticatedRequest`
 * wrapper and keeps route handlers clean:
 *
 *   router.get('/me', authenticate, (req, res) => {
 *     res.json(req.user);  // ✅ typed automatically
 *   });
 */
declare module 'express' {
  interface Request {
    user?: {
      id: number;
      email: string;
      role: string;
      permissions: string[];
    };
  }
}

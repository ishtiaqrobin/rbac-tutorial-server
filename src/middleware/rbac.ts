/**
 * rbac.ts — Role-Based Access Control middleware factories
 *
 * EDUCATIONAL OVERVIEW
 * --------------------
 * After `authenticate` has run (and set `req.user`), the RBAC
 * middleware answers a SECOND question:
 *
 *   "Is the caller ALLOWED to access this resource?"
 *
 * Two helper functions are exported:
 *
 *   1. `requireRole(...roles)`         — allow only users whose role
 *      matches one of the given role names OR who have `manage_roles`.
 *
 *   2. `requirePermission(...perms)`   — allow only users whose
 *      `permissions` array (loaded from the JWT at login) contains
 *      at least one of the given permission strings.
 *
 * Both return Express middleware so they can be composed with `authenticate`
 * like any other middleware.
 *
 * DESIGN DECISION: We use role-name string comparison rather than
 * numeric role IDs so that the middleware is decoupled from the
 * database.  The role name is resolved at login time and embedded in
 * the JWT.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware factory: `requireRole('admin', 'editor')`
 *
 * Allows the request through if the caller's role matches ANY of the
 * listed roles.  Otherwise responds with 403 Forbidden.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      // `authenticate` should have run first; if it didn't, fail safely.
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (allowedRoles.includes(req.user.role)) {
      return next(); // Role is on the allow-list → proceed.
    }

    // Role not permitted → 403 Forbidden (NOT 401 — they ARE authenticated).
    return res.status(403).json({
      message: `Access denied — required role: ${allowedRoles.join(' or ')}`
    });
  };
}

/**
 * Middleware factory: `requirePermission('manage_users', 'delete_content')`
 *
 * Checks the `permissions` array that was embedded in the JWT at login.
 * The user must have at least ONE of the listed permissions.
 */
export function requirePermission(...allowedPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userPermissions = req.user.permissions || [];

    // Does the user have at least one of the required permissions?
    const hasPermission = allowedPermissions.some((perm) =>
      userPermissions.includes(perm)
    );

    if (hasPermission) {
      return next(); // Permission granted → proceed.
    }

    return res.status(403).json({
      message: `Access denied — required permission: ${allowedPermissions.join(' or ')}`
    });
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// middlewares/rbac.ts — Role-Based Access Control guards
//
// EDUCATIONAL NOTE
// ─────────────────
// Two independent guards protect API routes:
//
//   requireRole('admin', 'editor')
//     → checks req.user.role against a whitelist of allowed role names.
//     → Use for coarse-grained access (e.g. "only admins can manage users").
//
//   requirePermission('create_content', 'edit_content')
//     → checks req.user.permissions[] for ALL listed permissions.
//     → Use for fine-grained access (e.g. "editor can create but not delete").
//
// Both guards must be placed AFTER the `authenticate` middleware.
// ─────────────────────────────────────────────────────────────────────────────

import { NextFunction, Request, Response } from "express";
import AppError from "../errorHelpers/AppError";
import status from "http-status";

/**
 * requireRole(...roles)
 *
 * Allows access only if req.user.role matches one of the provided roles.
 *
 * @example
 *   router.delete('/:id', authenticate, requireRole('admin'), userController.deleteUser)
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(status.UNAUTHORIZED, "Authentication required."));
    }

    const userRole = req.user.role.toLowerCase();
    const hasRole = allowedRoles.map((r) => r.toLowerCase()).includes(userRole);

    if (!hasRole) {
      return next(
        new AppError(
          status.FORBIDDEN,
          `Access denied. Role '${req.user.role}' is not authorized to perform this action.`,
        ),
      );
    }

    next();
  };
};

/**
 * requirePermission(...permissions)
 *
 * Allows access only if req.user.permissions contains ALL listed permissions.
 *
 * @example
 *   router.post('/', authenticate, requirePermission('create_content'), contentController.create)
 */
export const requirePermission = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(status.UNAUTHORIZED, "Authentication required."));
    }

    const userPermissions = req.user.permissions ?? [];
    const missing = requiredPermissions.filter(
      (perm) => !userPermissions.includes(perm),
    );

    if (missing.length > 0) {
      return next(
        new AppError(
          status.FORBIDDEN,
          `Forbidden. Missing required permission(s): ${missing.join(", ")}`,
        ),
      );
    }

    next();
  };
};

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

/**
 * Require specific role(s) to access a route.
 * Example: requireRole('admin') or requireRole('admin', 'editor')
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required.'));
    }

    const hasRole = allowedRoles.includes(req.user.role.toLowerCase());
    if (!hasRole) {
      return next(
        new AppError(
          403,
          `Access forbidden. Role '${req.user.role}' is not authorized for this resource.`
        )
      );
    }

    next();
  };
};

/**
 * Require specific permission(s) to access a route.
 * Example: requirePermission('create_content') or requirePermission('manage_users')
 */
export const requirePermission = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required.'));
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasPermission) {
      return next(
        new AppError(
          403,
          `Forbidden. Missing required permission: ${requiredPermissions.join(', ')}`
        )
      );
    }

    next();
  };
};

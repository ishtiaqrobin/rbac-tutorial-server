/**
 * role.routes.ts — Role & permission management endpoints (Admin-only)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { roleRepository } from '../repositories/RoleRepository';

const router = Router();

/**
 * GET /api/roles
 * Returns all roles with their associated permissions.
 * Requires: admin
 */
router.get(
  '/',
  authenticate,
  requireRole('admin'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const roles = await roleRepository.findAllWithPermissions();
      res.json({ roles });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/roles/:id
 * Returns a single role with its permissions.
 * Requires: admin
 */
router.get(
  '/:id',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const role = await roleRepository.findById(id);
      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }
      const permissions = await roleRepository.findPermissionsByRoleId(id);
      res.json({ ...role, permissions });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/roles/:id/permissions
 * Replaces all permissions for a role.
 * Requires: admin
 */
router.put(
  '/:id/permissions',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roleId = parseInt(req.params.id, 10);
      const { permissionIds }: { permissionIds: number[] } = req.body;

      await roleRepository.updatePermissions(roleId, permissionIds);
      res.json({ message: 'Permissions updated successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

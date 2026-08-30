/**
 * permission.routes.ts — Permission listing endpoint (Admin-only)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { permissionRepository } from '../repositories/PermissionRepository';

const router = Router();

/**
 * GET /api/permissions
 * Returns all available permissions in the system.
 * Requires: admin
 */
router.get(
  '/',
  authenticate,
  requireRole('admin'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const permissions = await permissionRepository.findAll();
      res.json({ permissions });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

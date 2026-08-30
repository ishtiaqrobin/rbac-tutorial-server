/**
 * user.routes.ts — User management endpoints (Admin-only)
 *
 * EDUCATIONAL NOTE
 * ----------------
 * Notice the middleware composition on each route:
 *
 *   authenticate  →  verifies the JWT and sets req.user
 *   requireRole   →  checks req.user.role against an allow-list
 *
 * Order matters: `requireRole` depends on `req.user` existing,
 * so it must come AFTER `authenticate`.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole, requirePermission } from '../middleware/rbac';
import userService from '../services/user.service';

const router = Router();

/**
 * GET /api/users
 * Requires: role = admin  (or the "manage_users" permission)
 *
 * We demonstrate BOTH `requireRole` and `requirePermission`.
 * The permission check is shown as an alternative — in practice you'd
 * use one OR the other, not both.  Here `requirePermission` would
 * already be sufficient because only Admin has "manage_users".
 */
router.get(
  '/',
  authenticate,
  requirePermission('manage_users'),
   async (req: Request, res: Response) => {
     try {
       const users = await userService.listUsers();
       res.json({ users });
     } catch (err) {
       res.status(500).json({ message: 'Internal server error' });
     }
   }
 );

/**
 * PATCH /api/users/:id/role
 * Requires: role = admin
 *
 * Reassigns a user to a different role.  This is THE core RBAC
 * administrative operation.
 */
router.patch(
  '/:id/role',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const { role_id } = req.body;
      const result = await userService.assignRole(userId, role_id);
      res.json({ user: result });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }
);

/**
 * DELETE /api/users/:id
 * Requires: role = admin
 *
 * Soft-deletes (deactivates) a user.
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
   async (req: Request, res: Response) => {
     try {
       const userId = parseInt(req.params.id, 10);
       const result = await userService.deactivateUser(userId);
       res.json(result);
     } catch (err: any) {
       res.status(400).json({ message: err.message });
     }
   }
 );

export default router;

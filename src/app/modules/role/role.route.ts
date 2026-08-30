import { Router } from 'express';
import { roleController } from './role.controller';
import { authenticate } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/rbac';

const router = Router();

router.get(
  '/',
  authenticate,
  roleController.getAllRoles
);

router.put(
  '/:id/permissions',
  authenticate,
  requireRole('admin'),
  roleController.updateRolePermissions
);

export const roleRoutes = router;

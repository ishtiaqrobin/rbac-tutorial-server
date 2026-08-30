import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate } from '../../middlewares/auth';
import { requireRole, requirePermission } from '../../middlewares/rbac';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('manage_users'),
  userController.getAllUsers
);

router.patch(
  '/:id/role',
  authenticate,
  requireRole('admin'),
  userController.updateUserRole
);

router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  userController.deactivateUser
);

export const userRoutes = router;

import { Router } from 'express';
import { permissionController } from './permission.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.get(
  '/',
  authenticate,
  permissionController.getAllPermissions
);

export const permissionRoutes = router;

import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.route';
import { userRoutes } from '../modules/user/user.route';
import { roleRoutes } from '../modules/role/role.route';
import { permissionRoutes } from '../modules/permission/permission.route';
import { contentRoutes } from '../modules/content/content.route';

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/roles", roleRoutes);
router.use("/permissions", permissionRoutes);
router.use("/contents", contentRoutes);

export const IndexRoutes = router;

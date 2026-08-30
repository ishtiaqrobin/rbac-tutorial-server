import { Router } from "express";
import { userController } from "./user.controller";
import { authenticate } from "../../middlewares/auth";
import { requireRole, requirePermission } from "../../middlewares/rbac";

const router = Router();

// GET /api/v1/users → list all users (requires manage_users permission)
router.get(
  "/",
  authenticate,
  requirePermission("manage_users"),
  userController.getAllUsers,
);

// PATCH /api/v1/users/:id/role → change user role (admin only)
router.patch(
  "/:id/role",
  authenticate,
  requireRole("admin"),
  userController.updateUserRole,
);

// PATCH /api/v1/users/:id/status → activate/deactivate user (admin only)
router.patch(
  "/:id/status",
  authenticate,
  requireRole("admin"),
  userController.toggleUserStatus,
);

export const userRoutes = router;

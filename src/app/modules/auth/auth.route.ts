import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticate } from "../../middlewares/auth";
import { toNodeHandler } from "better-auth/node";
import { auth as betterAuth } from "../../lib/auth";

const router = Router();

// ── Better-Auth native routes (mounted at /api/v1/auth/better-auth/*) ────────
// Handles: sign-up, sign-in (via Better-Auth SDK), email verification, etc.
// These are Better-Auth's built-in API endpoints.
router.all("/better-auth/*splat", toNodeHandler(betterAuth));

// ── Custom auth routes ────────────────────────────────────────────────────────
// POST /api/v1/auth/sign-in  → signIn via our controller (issues JWT cookies)
router.post("/sign-in", authController.signIn);

// POST /api/v1/auth/sign-out → clear session + JWT cookies
router.post("/sign-out", authController.signOut);

// GET  /api/v1/auth/me       → get current user profile (JWT protected)
router.get("/me", authenticate, authController.getMe);

export const authRoutes = router;

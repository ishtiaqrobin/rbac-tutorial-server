import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticate } from "../../middlewares/auth";
import { toNodeHandler } from "better-auth/node";
import { auth as betterAuth } from "../../lib/auth";

const router = Router();

// ── Better-Auth native routes ────────────────────────────────────────────────
router.all("/better-auth/*splat", toNodeHandler(betterAuth));

// ── Custom auth routes ────────────────────────────────────────────────────────
router.post("/sign-in", authController.signIn);
router.post("/login", authController.signIn); // Legacy alias

router.post("/sign-out", authController.signOut);
router.post("/logout", authController.signOut); // Legacy alias

router.get("/me", authenticate, authController.getMe);

export const authRoutes = router;

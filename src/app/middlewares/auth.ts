// ─────────────────────────────────────────────────────────────────────────────
// middlewares/auth.ts — Authentication middleware
//
// EDUCATIONAL NOTE — Hybrid Auth Strategy
// ─────────────────────────────────────────
// We use TWO complementary methods to verify identity:
//
//   Method A — Better-Auth Session Cookie (`better-auth.session_token`)
//     • Set automatically by Better-Auth on sign-in.
//     • Validated by calling `betterAuth.api.getSession()` which checks
//       the `sessions` table in PostgreSQL.
//     • Advantages: server-side revocable, always fresh.
//     • Used for browser clients (Next.js frontend).
//
//   Method B — JWT Access Token (Cookie `accessToken` or Bearer header)
//     • Signed by us on sign-in using jwtUtils.createToken().
//     • Validated locally without a DB call — fast and stateless.
//     • Contains: { userId, roleId, role, permissions }.
//     • Advantages: no DB roundtrip, works great for API/mobile clients.
//
// Strategy:
//   1. Try JWT first (fastest path).
//   2. If no JWT, fall back to Better-Auth session cookie.
//   3. If neither → 401 Unauthorized.
//
// In both cases, `req.user` is populated with the same IJwtUser shape so
// downstream controllers don't care which method was used.
// ─────────────────────────────────────────────────────────────────────────────

import { NextFunction, Request, Response } from "express";
import { auth as betterAuth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { jwtUtils } from "../utils/jwt";
import { cookieUtils } from "../utils/cookie";
import { env } from "../config/env";
import AppError from "../errorHelpers/AppError";
import status from "http-status";
import { IJwtUser } from "../interfaces";

// ── Helper: build IJwtUser from a DB-fetched user record ─────────────────────
async function buildUserFromDb(userId: string): Promise<IJwtUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  if (!user || !user.isActive || user.isDeleted || user.isBanned) {
    return null;
  }

  const permissions = user.role.rolePermissions.map(
    (rp: any) => rp.permission.name,
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleId: user.roleId,
    role: user.role.name,
    permissions,
    isActive: user.isActive,
  };
}

// ── Main middleware ───────────────────────────────────────────────────────────
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // ── Strategy A: JWT verification (cookie or Bearer header) ─────────────
    const jwtToken =
      cookieUtils.getCookie(req, "accessToken") ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : undefined);

    if (jwtToken) {
      const verified = jwtUtils.verifyToken(jwtToken, env.ACCESS_TOKEN_SECRET);

      if (verified.success && verified.data) {
        const payload = verified.data as {
          userId: string;
          roleId: number;
          role: string;
          permissions: string[];
        };

        // JWT payload already has permissions embedded — no DB call needed
        req.user = {
          id: payload.userId,
          email: verified.data.email as string ?? "",
          name: verified.data.name as string ?? "",
          roleId: payload.roleId,
          role: payload.role,
          permissions: payload.permissions,
          isActive: true,
        };
        return next();
      }
      // JWT failed (expired / tampered) — fall through to Better-Auth session
    }

    // ── Strategy B: Better-Auth session cookie validation ──────────────────
    const session = await betterAuth.api.getSession({
      headers: req.headers as any,
    });

    if (!session?.user) {
      return next(
        new AppError(
          status.UNAUTHORIZED,
          "Unauthorized. Please sign in to access this resource.",
        ),
      );
    }

    // Session is valid — load full user data including RBAC permissions
    const authUser = await buildUserFromDb(session.user.id);

    if (!authUser) {
      return next(
        new AppError(
          status.UNAUTHORIZED,
          "User account is inactive, banned, or deleted.",
        ),
      );
    }

    req.user = authUser;
    next();
  } catch (error) {
    next(
      new AppError(
        status.UNAUTHORIZED,
        "Authentication failed. Session expired or token is invalid.",
      ),
    );
  }
};

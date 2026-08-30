// ─────────────────────────────────────────────────────────────────────────────
// modules/auth/auth.service.ts — Authentication business logic
//
// EDUCATIONAL NOTE
// ─────────────────
// This service orchestrates the complete sign-in flow:
//
//   1. Delegate email+password verification to Better-Auth
//      (Better-Auth internally checks the `accounts` table's hashed password)
//   2. Load the user's RBAC Role + Permissions from Prisma
//   3. Issue our own JWT access token (short-lived, 1d) and refresh token (7d)
//      via tokenUtils — these are set as HTTP-Only cookies
//   4. Return user profile + tokens to the controller
//
// Why both Better-Auth sessions AND our own JWTs?
//   - Better-Auth session  → used for browser navigation (SSR / Next.js pages)
//   - Our JWT access token → used for API calls (fast, stateless, no DB hit)
// ─────────────────────────────────────────────────────────────────────────────

import { Response } from "express";
import { prisma } from "../../lib/prisma";
import { auth as betterAuth } from "../../lib/auth";
import { tokenUtils } from "../../utils/token";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";

// ── Shared helper: load user with role + permissions ─────────────────────────
const loadUserWithPermissions = async (userId: string) => {
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

  if (!user) throw new AppError(status.NOT_FOUND, "User not found.");
  if (!user.isActive || user.isDeleted || user.isBanned) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Account is inactive, deleted, or banned. Contact an administrator.",
    );
  }

  const permissions: string[] = user.role.rolePermissions.map(
    (rp: any) => rp.permission.name,
  );

  return { user, permissions };
};

class AuthService {
  /**
   * signIn — validate credentials via Better-Auth, then issue JWTs
   *
   * Better-Auth handles password verification internally.
   * We then load RBAC data from Prisma and issue our own JWT pair.
   */
  async signIn(
    email: string,
    password: string,
    res: Response,
    headers: Record<string, string | string[] | undefined>,
  ) {
    // Step 1: Verify credentials via Better-Auth API
    // Better-Auth checks the accounts table for a hashed password match.
    const baResult = await betterAuth.api.signInEmailPassword({
      body: { email, password },
      headers: headers as any,
    });

    if (!baResult?.user) {
      throw new AppError(status.UNAUTHORIZED, "Invalid email or password.");
    }

    // Step 2: Load RBAC role + permissions from our custom tables
    const { user, permissions } = await loadUserWithPermissions(baResult.user.id);

    // Step 3: Build JWT payload
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      role: user.role.name,
      permissions,
    };

    // Step 4: Issue access token + refresh token → set as HTTP-Only cookies
    const accessToken = tokenUtils.getAccessToken(jwtPayload);
    const refreshToken = tokenUtils.getRefreshToken({ userId: user.id });

    tokenUtils.setAccessTokenCookie(res, accessToken);
    tokenUtils.setRefreshTokenCookie(res, refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        role: user.role.name,
        permissions,
        isActive: user.isActive,
      },
      accessToken,
    };
  }

  /**
   * signOut — clear Better-Auth session + JWT cookies
   */
  async signOut(res: Response, headers: Record<string, string | string[] | undefined>) {
    // Tell Better-Auth to invalidate the server-side session
    try {
      await betterAuth.api.signOut({ headers: headers as any });
    } catch {
      // Session may already be expired — still clear cookies
    }

    // Clear our JWT cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
  }

  /**
   * getMe — fetch the currently authenticated user's profile
   */
  async getMe(userId: string) {
    const { user, permissions } = await loadUserWithPermissions(userId);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      role: user.role.name,
      permissions,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
export default authService;

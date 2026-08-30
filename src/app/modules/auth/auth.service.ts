// ─────────────────────────────────────────────────────────────────────────────
// modules/auth/auth.service.ts — Authentication business logic
//
// EDUCATIONAL NOTE
// ─────────────────
// This service orchestrates the complete sign-in flow:
//
//   1. Find user by email in PostgreSQL via Prisma ORM
//   2. Compare password hash against the credential account (stored in `accounts`)
//   3. Load the user's RBAC Role + Granted Permissions
//   4. Issue JWT access token (1d) and refresh token (7d) via tokenUtils
//   5. Set HTTP-Only cookies and return user profile
// ─────────────────────────────────────────────────────────────────────────────

import { Response } from "express";
import bcrypt from "bcrypt";
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
   * signIn — validate credentials, then issue JWTs & cookies
   */
  async signIn(
    email: string,
    password: string,
    res: Response,
    _headers?: Record<string, string | string[] | undefined>,
  ) {
    // 1. Find user by email with role, permissions, and credential account
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
        accounts: true,
      },
    });

    if (!user || !user.isActive || user.isDeleted || user.isBanned) {
      throw new AppError(status.UNAUTHORIZED, "Invalid email or password.");
    }

    // 2. Compare password against credential account
    const credentialAccount = user.accounts.find(
      (acc) => acc.providerId === "credential",
    );

    if (!credentialAccount || !credentialAccount.password) {
      throw new AppError(status.UNAUTHORIZED, "Invalid email or password.");
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      credentialAccount.password,
    );

    if (!isPasswordValid) {
      throw new AppError(status.UNAUTHORIZED, "Invalid email or password.");
    }

    // 3. Extract permissions list
    const permissions: string[] = user.role.rolePermissions.map(
      (rp: any) => rp.permission.name,
    );

    // 4. Build JWT payload
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      role: user.role.name,
      permissions, 
    };

    // 5. Issue access token + refresh token → set as HTTP-Only cookies
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
    try {
      await betterAuth.api.signOut({ headers: headers as any });
    } catch {
      // Session may already be expired — still clear cookies
    }

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

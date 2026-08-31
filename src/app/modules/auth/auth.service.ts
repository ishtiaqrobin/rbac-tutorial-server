// ─────────────────────────────────────────────────────────────────────────────
// modules/auth/auth.service.ts — Authentication business logic
//
// EDUCATIONAL NOTE
// ─────────────────
// This service orchestrates the complete sign-in flow:
//
//   1. Delegate credential verification to Better-Auth (auth.api.signInEmail)
//      — Better-Auth validates the password against the `accounts` table,
//        creates a `Session` row, and returns a `Set-Cookie` header for the
//        `better-auth.session_token` cookie.
//   2. Forward that `Set-Cookie` header onto the Express response so the
//      browser actually stores the HTTP-Only session cookie.
//   3. Load the user's RBAC Role + Granted Permissions from Prisma.
//   4. Issue JWT access token (1d) and refresh token (7d) via tokenUtils.
//   5. Set HTTP-Only cookies and return user profile.
// ─────────────────────────────────────────────────────────────────────────────

import { Response as ExpressResponse } from "express";
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

// ── Helper: forward Better-Auth Set-Cookie headers to the Express response ──
// When we call auth.api.signInEmail({ asResponse: true }) programmatically,
// Better-Auth returns a WHATWG `Response` whose `headers` contain the
// `Set-Cookie` for the `better-auth.session_token` cookie. We must copy those
// onto `res` so the browser actually stores the HTTP-Only session cookie.
const forwardSetCookieHeaders = (
  res: ExpressResponse,
  headers?: Headers | Record<string, string>,
) => {
  if (!headers) return;

  if (headers instanceof Headers) {
    const setCookies = headers.getSetCookie?.() ?? [];
    for (const cookie of setCookies) {
      res.append("Set-Cookie", cookie);
    }
    return;
  }

  // Fallback for plain-object headers
  const setCookie = (headers as Record<string, string>)["set-cookie"];
  if (setCookie) {
    res.append("Set-Cookie", setCookie);
  }
};

class AuthService {
  /**
   * signIn — validate credentials via Better-Auth, then issue JWTs & cookies
   */
  async signIn(
    email: string,
    password: string,
    res: ExpressResponse,
    headers?: Record<string, string | string[] | undefined>,
  ) {
    // 1. Let Better-Auth verify credentials + create the session.
    //    Using `asResponse: true` returns a WHATWG Response whose headers
    //    contain the Set-Cookie for the HTTP-Only session cookie.
    let betterAuthResponse: globalThis.Response;
    try {
      betterAuthResponse = await betterAuth.api.signInEmail({
        body: { email, password },
        headers: headers as any,
        asResponse: true,
      });
    } catch (err: any) {
      // Better-Auth throws APIError with a status + message on bad credentials
      const statusCode = err?.status ?? status.UNAUTHORIZED;
      const message =
        err?.message === "Invalid email or password"
          ? "Invalid email or password."
          : err?.message || "Authentication failed.";
      throw new AppError(statusCode, message);
    }

    // 2. Forward the Better-Auth session cookie to the browser.
    forwardSetCookieHeaders(res, betterAuthResponse.headers);

    // 3. Parse the user from the Better-Auth response body.
    let betterAuthBody: { user?: { id: string } };
    try {
      betterAuthBody = await betterAuthResponse.json();
    } catch {
      betterAuthBody = {};
    }

    const betterAuthUserId = betterAuthBody?.user?.id;
    if (!betterAuthUserId) {
      throw new AppError(status.UNAUTHORIZED, "Authentication failed.");
    }

    // 4. Load the user's RBAC role + permissions from the database.
    const { user, permissions } =
      await loadUserWithPermissions(betterAuthUserId);

    // 5. Build JWT payload
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      role: user.role.name,
      permissions,
    };

    // 6. Issue access token + refresh token → set as HTTP-Only cookies
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
  async signOut(
    res: ExpressResponse,
    headers: Record<string, string | string[] | undefined>,
  ) {
    try {
      const result = await betterAuth.api.signOut({
        headers: headers as any,
        asResponse: true,
      });
      // Forward the Set-Cookie that clears the Better-Auth session cookie
      forwardSetCookieHeaders(res, result.headers);
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

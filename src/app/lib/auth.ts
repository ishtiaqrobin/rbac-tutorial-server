// ─────────────────────────────────────────────────────────────────────────────
// lib/auth.ts — Better-Auth instance configuration
//
// EDUCATIONAL NOTE
// ─────────────────
// Better-Auth handles the heavy lifting of:
//   - Email + Password sign-up / sign-in
//   - Session management (HTTP-Only cookie: "better-auth.session_token")
//   - Account storage (credentials are hashed + stored in `accounts` table)
//   - Email-verification OTP (via emailOTP plugin)
//   - Bearer token support (for mobile / API clients, via bearer plugin)
//
// Our JWT (from utils/token.ts) is issued ALONGSIDE the Better-Auth session.
// It is used in the `authenticate` middleware for fast, stateless permission
// checks on protected routes — without hitting the database every time.
//
// Flow:
//   1. Client calls POST /api/v1/auth/sign-in
//   2. auth.service.ts → calls betterAuth.api.signInEmailPassword()
//   3. Better-Auth creates a Session row + sets the session cookie
//   4. We also generate an accessToken (JWT) + refreshToken and set their cookies
//   5. On subsequent requests → authenticate middleware reads the JWT from cookie
//      or Authorization header, verifies it, loads permissions from Prisma → req.user
// ─────────────────────────────────────────────────────────────────────────────

import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { env } from "../config/env";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  // ── Trusted origins for CORS / cookie validation ────────────────────────
  trustedOrigins: Array.from(
    new Set(
      [
        env.FRONTEND_URL,
        env.BETTER_AUTH_URL,
        "http://localhost:3000",
        "http://localhost:5000",
      ].filter(Boolean) as string[],
    ),
  ),

  // ── Prisma adapter — uses our existing Prisma client ────────────────────
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // ── Email + Password authentication ─────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    // For this learning app, email verification is DISABLED so we can test
    // quickly without an email server. Enable in production!
    requireEmailVerification: false,
  },

  // ── Custom user fields (must match columns in prisma/schema/auth.prisma) ─
  user: {
    additionalFields: {
      roleId: {
        type: "number",
        required: true,
        defaultValue: 2, // default to "viewer" role
      },
      isActive: {
        type: "boolean",
        required: true,
        defaultValue: true,
      },
      needPasswordChange: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
      isDeleted: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
      isBanned: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
    },
  },

  // ── Plugins ───────────────────────────────────────────────────────────────
  // `bearer` allows sending the Better-Auth session token via Authorization
  // header (Bearer <token>) in addition to the HTTP-Only cookie.
  // This is useful for API clients (Postman, mobile apps, etc.)
  plugins: [bearer()],

  // ── Session configuration ─────────────────────────────────────────────────
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // refresh session if older than 1 day
    cookieCache: {
      enabled: false,
    },
  },

  // ── Cookie settings ────────────────────────────────────────────────────────
  advanced: {
    useSecureCookies: false, // Set true in production (HTTPS)
    cookies: {
      sessionToken: {
        attributes: {
          sameSite: "lax",
          secure: false, // Set true in production
          httpOnly: true,
          path: "/",
        },
      },
    },
  },
});

import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { env } from "../config/env";
import { bearer } from "better-auth/plugins";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  trustedOrigins: Array.from(
    new Set(
      [
        env.FRONTEND_URL,
        env.BETTER_AUTH_URL,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5000",
      ].filter(Boolean) as string[],
    ),
  ),

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "USER",
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
      deletedAt: {
        type: "date",
        required: false,
        defaultValue: null,
      },
      isActive: {
        type: "boolean",
        required: true,
        defaultValue: true,
      },
      isBanned: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
      isReviewed: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
      reviewId: {
        type: "string",
        required: false,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  plugins: [bearer()],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: false,
    },
  },

  advanced: {
    // Since the frontend proxies /api/auth/* via Next.js rewrites,
    // auth requests arrive as same-origin from the frontend domain.
    // SameSite=Lax is sufficient and avoids the cross-site cookie warning.
    // SameSite=None is only needed for true cross-origin direct requests.

    // Disable CSRF check because the frontend is proxying the requests
    // disableCSRFCheck: true,
    useSecureCookies: false,
    cookies: {
      sessionToken: {
        attributes: {
          sameSite: "lax",
          secure: true,
          httpOnly: true,
          path: "/",
        },
      },
      state: {
        attributes: {
          sameSite: "lax",
          secure: true,
          httpOnly: true,
          path: "/",
        },
      },
      idToken: {
        attributes: {
          sameSite: "lax",
          secure: true,
          httpOnly: true,
          path: "/",
        },
      },
    },
  },
});

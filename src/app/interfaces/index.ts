// ─────────────────────────────────────────────────────────────────────────────
// interfaces/index.ts — Shared TypeScript interfaces for the RBAC backend
//
// IJwtUser is populated by the authenticate middleware and attached to
// req.user so every downstream controller/service has a fully typed user.
// ─────────────────────────────────────────────────────────────────────────────

export interface IJwtUser {
  id: string;        // Better-Auth uses UUID strings
  email: string;
  name: string;
  roleId: number;
  role: string;      // role name: "admin" | "editor" | "viewer"
  permissions: string[]; // e.g. ["create_content", "manage_users", ...]
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: IJwtUser;
    }
  }
}

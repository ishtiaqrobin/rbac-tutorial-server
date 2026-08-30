/**
 * auth.ts — Authentication middleware
 *
 * EDUCATIONAL OVERVIEW
 * --------------------
 * The authentication middleware runs on every protected route.  Its
 * sole job is to answer ONE question:
 *
 *   "Who is the caller?"
 *
 * It does this by:
 *   1. Reading the JWT from the `Authorization: Bearer <token>` header.
 *   2. Verifying the token's signature using the server's JWT_SECRET.
 *      If verification fails → 401 Unauthorized.
 *   3. (Optionally) re-hydrating the user record from the database to
 *      confirm the account still exists and is active.
 *   4. Attaching `{ id, email, role, permissions }` to `req.user`.
 *
 * NOTE: The token already carries `role` and `permissions` inside it,
 * so the middleware does NOT re-query the database for them on every
 * request.  This is a deliberate design choice for performance (the
 * token is the source of truth between login and logout).  In a
 * production system you might prefer to re-fetch from the DB to pick
 * up role changes instantly — a classic security/performance tradeoff.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

/**
 * `authenticate` — verifies the JWT and populates `req.user`.
 * Attach to any route that requires a logged-in user.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 1. Extract token from the Authorization header.
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required — no token provided' });
  }

  const token = authHeader.split(' ')[1];

  // 2. Verify the token signature and decode its payload.
  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  // 3. Attach the decoded identity to the request object.
  //    Downstream handlers (RBAC middleware, route handlers) read from here.
  req.user = {
    id: payload.userId,
    email: payload.email,
    role: payload.role,
    permissions: payload.permissions
  };

  next();
}

/**
 * `optionalAuth` — like `authenticate` but does NOT reject unauthenticated
 * requests.  Useful for endpoints that return different data depending on
 * whether the caller is logged in.
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token — just move on without setting req.user.
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions
    };
  } catch {
    // Invalid token — ignore silently (treat as guest).
  }
  next();
}

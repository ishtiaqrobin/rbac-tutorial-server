/**
 * auth.routes.ts — Authentication endpoints
 *
 * Flow:
 *   POST /api/auth/login    → verify credentials → return JWT
 *   POST /api/auth/register → create a new user → return sanitized user
 *   GET  /api/auth/me       → return the currently-logged-in user
 */

import { Router, Request, Response } from 'express';
import authService from '../services/auth.service';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/login
 *
 * Accepts { email, password } in the body.
 * On success returns { token, user } where `token` is a signed JWT.
 */
router.post(
  '/login',
   async (req: Request, res: Response) => {
     try {
       const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const result = await authService.login(email, password);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ message: err.message });
    }
  }
);

/**
 * POST /api/auth/register
 *
 * Accepts { username, email, password, role_id }.
 * In this tutorial, registration is open (no password for "first admin"
 * bootstrap).  In production you would gate this behind an admin invite
 * or a secret registration key.
 */
router.post(
  '/register',
   async (req: Request, res: Response) => {
     try {
       const { username, email, password, role_id } = req.body;
      if (!username || !email || !password || !role_id) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      const user = await authService.register({ username, email, password, role_id });
      res.status(201).json({ user });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }
);

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's profile.
 * Protected by `authenticate` — without a valid JWT, returns 401.
 */
router.get(
  '/me',
  authenticate,
  (req: Request, res: Response) => {
    // `req.user` was populated by the `authenticate` middleware.
    res.json({ user: req.user });
  }
);

export default router;

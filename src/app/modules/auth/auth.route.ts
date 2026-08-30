import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.post('/login', authController.login);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authController.logout);

export const authRoutes = router;

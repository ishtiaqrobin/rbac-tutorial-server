import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { authService } from './auth.service';

const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.loginUser(email, password);

  // Set HTTP-Only Cookie
  res.cookie('auth_token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User logged in successfully',
    data: result,
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await authService.getMe(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Current authenticated user profile fetched successfully',
    data: { user: result },
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  res.clearCookie('auth_token');

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Logged out successfully',
  });
});

export const authController = {
  login,
  getMe,
  logout,
};

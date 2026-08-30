import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { authService } from "./auth.service";
import status from "http-status";

const signIn = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await authService.signIn(
    email,
    password,
    res,
    req.headers as any,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Signed in successfully",
    data: result,
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.getMe(req.user!.id);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Authenticated user profile fetched successfully",
    data: { user: result },
  });
});

const signOut = catchAsync(async (req: Request, res: Response) => {
  await authService.signOut(res, req.headers as any);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Signed out successfully",
  });
});

export const authController = {
  signIn,
  getMe,
  signOut,
};

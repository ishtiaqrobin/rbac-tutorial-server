import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { userService } from "./user.service";
import status from "http-status";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await userService.getAllUsers();
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User list retrieved successfully",
    data: { users },
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const { roleId } = req.body;
  const user = await userService.assignUserRole(userId, Number(roleId));

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User role updated successfully",
    data: { user },
  });
});

const toggleUserStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const { isActive } = req.body;
  const result = await userService.toggleUserStatus(userId, Boolean(isActive));

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
  });
});

export const userController = {
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
};

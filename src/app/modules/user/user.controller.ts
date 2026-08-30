import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { userService } from './user.service';

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await userService.getAllUsers();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User list retrieved successfully',
    data: { users },
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  const { role_id } = req.body;
  const user = await userService.assignUserRole(userId, role_id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User role updated successfully',
    data: { user },
  });
});

const deactivateUser = catchAsync(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  const result = await userService.deactivateUser(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
  });
});

export const userController = {
  getAllUsers,
  updateUserRole,
  deactivateUser,
};

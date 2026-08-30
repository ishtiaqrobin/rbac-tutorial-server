import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { permissionService } from './permission.service';

const getAllPermissions = catchAsync(async (req: Request, res: Response) => {
  const permissions = await permissionService.getAllPermissions();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'System permissions list fetched successfully',
    data: { permissions },
  });
});

export const permissionController = {
  getAllPermissions,
};

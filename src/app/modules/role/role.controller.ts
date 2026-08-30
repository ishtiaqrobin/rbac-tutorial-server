import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { roleService } from "./role.service";
import status from "http-status";

const getAllRoles = catchAsync(async (req: Request, res: Response) => {
  const roles = await roleService.getAllRoles();
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Roles and permission matrix fetched successfully",
    data: { roles },
  });
});

const updateRolePermissions = catchAsync(async (req: Request, res: Response) => {
  const roleId = parseInt(req.params.id as string, 10);
  const { permissionIds } = req.body;
  const roles = await roleService.updateRolePermissions(roleId, permissionIds || []);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Role permissions updated successfully",
    data: { roles },
  });
});

export const roleController = {
  getAllRoles,
  updateRolePermissions,
};

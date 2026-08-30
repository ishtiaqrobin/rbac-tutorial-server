import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";

class UserService {
  async getAllUsers() {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      where: { isDeleted: false },
      include: {
        role: {
          select: { id: true, name: true, description: true },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      roleId: u.roleId,
      role: u.role.name,
      isActive: u.isActive,
      isBanned: u.isBanned,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  async assignUserRole(userId: string, roleId: number) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new AppError(
        status.BAD_REQUEST,
        `Role with ID ${roleId} does not exist.`,
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { roleId },
      include: { role: true },
    });

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      roleId: updatedUser.roleId,
      role: updatedUser.role.name,
      isActive: updatedUser.isActive,
    };
  }

  async toggleUserStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(status.NOT_FOUND, `User with ID ${userId} not found.`);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    return {
      message: `User '${updated.name}' has been ${isActive ? "activated" : "deactivated"} successfully.`,
    };
  }
}

export const userService = new UserService();
export default userService;

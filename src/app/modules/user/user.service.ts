import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';

class UserService {
  async getAllUsers() {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role_id: u.roleId,
      roleId: u.roleId,
      role: u.role.name,
      role_name: u.role.name,
      is_active: u.isActive,
      isActive: u.isActive,
      created_at: u.createdAt,
      updated_at: u.updatedAt,
    }));
  }

  async assignUserRole(userId: number, roleId: number) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new AppError(400, `Target role with ID ${roleId} does not exist`);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { roleId },
      include: { role: true },
    });

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role_id: updatedUser.roleId,
      roleId: updatedUser.roleId,
      role: updatedUser.role.name,
      role_name: updatedUser.role.name,
      is_active: updatedUser.isActive,
    };
  }

  async deactivateUser(userId: number) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return { message: `User ${updated.username} has been deactivated successfully` };
  }
}

export const userService = new UserService();
export default userService;

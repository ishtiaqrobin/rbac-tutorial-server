import { prisma } from '../../lib/prisma';

class PermissionService {
  async getAllPermissions() {
    return prisma.permission.findMany({
      orderBy: { id: 'asc' },
    });
  }
}

export const permissionService = new PermissionService();
export default permissionService;

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';

class AuthService {
  async loginUser(email: string, passwordPlain: string) {
    // 1. Find user by email with role and permissions
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid email or password.');
    }

    // 2. Compare password hash
    const isPasswordValid = await bcrypt.compare(passwordPlain, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password.');
    }

    // 3. Extract permissions list
    const permissions = user.role.rolePermissions.map((rp) => rp.permission.name);

    // 4. Sign JWT Token
    const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key_rbac_tutorial_2026';
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role.name,
      },
      jwtSecret,
      { expiresIn: '1d' }
    );

    // 5. Optionally create Session record in database
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
      },
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roleId: user.roleId,
        role: user.role.name,
        permissions,
      },
    };
  }

  async getMe(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    const permissions = user.role.rolePermissions.map((rp) => rp.permission.name);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      role: user.role.name,
      permissions,
    };
  }
}

export const authService = new AuthService();
export default authService;

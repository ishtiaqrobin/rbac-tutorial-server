import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { IJwtUser } from '../interfaces';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError(401, 'Authentication token missing. Please log in.'));
    }

    // 2. Verify JWT token
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_rbac_tutorial_2026';
    const decoded = jwt.verify(token, secret) as { userId: number };

    if (!decoded || !decoded.userId) {
      return next(new AppError(401, 'Invalid authentication token.'));
    }

    // 3. Fetch user from Prisma with Role and Permissions
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
      return next(new AppError(401, 'User account not found or deactivated.'));
    }

    // 4. Extract permission names
    const permissions = user.role.rolePermissions.map((rp: any) => rp.permission.name);

    // 5. Populate req.user
    const authUser: IJwtUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      roleId: user.roleId,
      role: user.role.name,
      permissions,
    };

    req.user = authUser;
    next();
  } catch (error) {
    return next(new AppError(401, 'Session expired or invalid authentication token.'));
  }
};

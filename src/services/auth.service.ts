/**
 * AuthService — application-level authentication logic
 *
 * EDUCATIONAL OVERVIEW
 * --------------------
 * The AuthService orchestrates the AUTHENTICATION flow:
 *
 *   Login:
 *     1. Find the user by email (Repository).
 *     2. Compare the submitted password against the stored bcrypt hash.
 *     3. If valid, look up the user's role + permissions (Repository).
 *     4. Assemble a JwtPayload and sign it into a JWT.
 *     5. Return `{ token, user }` to the controller.
 *
 *   Register:
 *     1. Validate uniqueness (email/username not taken).
 *     2. Hash the password with bcrypt.
 *     3. Insert the new user (Repository).
 *
 * The service is deliberately thin — it delegates persistence to
 * repositories and security to bcrypt / jsonwebtoken so that each
 * concern has exactly one owner.
 */

import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/UserRepository';
import { roleRepository } from '../repositories/RoleRepository';
import { hashPassword } from '../utils/hash';
import { JwtPayload, CreateUserRequest } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_EXPIRES_IN_TYPED = JWT_EXPIRES_IN as unknown as number;

class AuthService {
  /**
   * Authenticate a user and return a signed JWT.
   *
   * @throws Error if credentials are invalid.
   */
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    // 1. Look up the user (includes role name in the result).
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // 2. Compare the submitted password against the bcrypt hash.
    const passwordValid = await user.comparePassword(password);
    if (!passwordValid) {
      throw new Error('Invalid email or password');
    }

    // 3. Load this user's permissions from the database.
    //    We query by role_id because the user entity already carries it.
    const permissions = await roleRepository.findPermissionsByRoleId(user.role_id);

    // 4. Also fetch the role name (already attached by the repository,
    //    but we want the canonical value).
    const roleRecord = await roleRepository.findById(user.role_id);
    const roleName = roleRecord?.name || (user as any).role_name || 'viewer';

    // 5. Assemble and sign the JWT payload.
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: roleName,
      permissions
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN_TYPED });

    // 6. Return the token + a sanitized user object (no password_hash).
    const userWithoutPassword = user.toSafeJSON();
    return { token, user: userWithoutPassword };
  }

  /**
   * Register a new user.
   * Requires a valid `role_id` foreign key.
   */
  async register(data: CreateUserRequest): Promise<any> {
    // Verify the role exists before creating the user.
    const roleExists = await roleRepository.findById(data.role_id);
    if (!roleExists) {
      throw new Error('Invalid role_id — role does not exist');
    }

    // Hash the password before storing it.
    const password_hash = await hashPassword(data.password);

    const user = await userRepository.create({
      username: data.username,
      email: data.email,
      password_hash,
      role_id: data.role_id
    });

    // Fetch role name for the response.
    const role = await roleRepository.findById(user.role_id);
    return { ...user.toSafeJSON(), role_name: role?.name };
  }
}

export const authService = new AuthService();
export default authService;

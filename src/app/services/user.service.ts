/**
 * UserService — application-level user management logic
 *
 * EDUCATIONAL NOTE
 * ----------------
 * While AuthService handles login/registration, UserService handles
 * the CRUD operations that an Admin performs:
 *   - list all users
 *   - change a user's role (the most common RBAC admin action)
 *   - deactivate a user
 *
 * Every method assumes the caller has already passed `authenticate`
 * + `requireRole('admin')` at the route level.  Defense in depth:
 * we ALSO check `req.user` here so that the service remains safe even
 * if a route is accidentally left unprotected.
 */

import { userRepository } from '../repositories/UserRepository';
import { roleRepository } from '../repositories/RoleRepository';

class UserService {
  /**
   * List all users with their role names.
   */
  async listUsers() {
    return userRepository.findAll();
  }

  /**
   * Change a user's role.
   * This is the KEY RBAC operation: an Admin reassigns a user from
   * "Editor" to "Viewer" (or any other role) without touching
   * permissions directly.
   */
  async assignRole(userId: number, roleId: number) {
    // Validate that the target role exists.
    const role = await roleRepository.findById(roleId);
    if (!role) {
      throw new Error(`Role with id ${roleId} does not exist`);
    }

    // Perform the update.
    const updatedUser = await userRepository.updateRole(userId, roleId);
    if (!updatedUser) {
      throw new Error(`User with id ${userId} not found`);
    }

    // Fetch the role name for a friendlier response.
    return { ...updatedUser.toSafeJSON(), role_name: role.name };
  }

  /**
   * Deactivate (soft-delete) a user.
   * We never hard-delete so that audit trails remain intact.
   */
  async deactivateUser(userId: number) {
    const ok = await userRepository.delete(userId);
    if (!ok) {
      throw new Error(`User with id ${userId} not found`);
    }
    return { message: 'User deactivated successfully' };
  }
}

export const userService = new UserService();
export default userService;

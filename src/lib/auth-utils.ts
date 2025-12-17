import { Session } from 'next-auth';

/**
 * Checks if a user has the required permission to perform an action.
 * This is the central function for Role-Based Access Control (RBAC).
 * It reads the permissions array directly from the user's session object.
 *
 * @param session The NextAuth session object, which should contain the user's permissions.
 * @param requiredPermission The name of the permission required for the action.
 * @returns `true` if the user is authorized.
 * @throws {Error} if the user is not authenticated or lacks the required permission.
 */
import { Permission, Role } from '@/types/auth'; // Adjust import path

export function authorize(
  session: Session | null,
  requiredPermission: Permission
): true {
  if (!session || !session.user) {
    throw new Error('Not authenticated or user session is missing.');
  }

  const { user } = session;

  // Admins have all permissions
  if (user.role?.name === Role.ADMINISTRATOR) {
    return true;
  }

  const userPermissions = user.permissions;

  if (!userPermissions) {
    throw new Error('User permissions are missing.');
  }

  if (!userPermissions.includes(requiredPermission)) {
    throw new Error(
      `Not authorized. Missing required permission: ${requiredPermission}`
    );
  }

  return true;
}

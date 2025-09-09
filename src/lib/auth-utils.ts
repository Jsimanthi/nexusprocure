import { Session } from 'next-auth';
import { Role } from '@prisma/client';

// Define a role hierarchy for authorization checks.
// Higher number means more permissions.
const roleHierarchy = {
  [Role.USER]: 1,
  [Role.MANAGER]: 2,
  [Role.ADMIN]: 3,
};

/**
 * Checks if a user is authorized based on their role.
 * An ADMIN is authorized for any role.
 * A MANAGER is authorized for MANAGER and USER roles.
 * A USER is only authorized for the USER role.
 *
 * @param userRole The role of the current user.
 * @param requiredRole The minimum role required for the action.
 * @returns `true` if the user is authorized, `false` otherwise.
 */
export function isAuthorized(userRole: Role, requiredRole: Role): boolean {
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * A convenience wrapper to check authorization directly from a session object.
 * Throws an error if the session or user is missing.
 *
 * @param session The NextAuth session object.
 * @param requiredRole The minimum role required for the action.
 * @returns `true` if the user is authorized.
 * @throws {Error} if the user is not authenticated or not authorized.
 */
export function authorize(session: Session | null, requiredRole: Role): true {
  if (!session?.user?.role) {
    throw new Error('Not authenticated or user role is missing.');
  }

  const userRole = session.user.role as Role; // The role from next-auth should be one of our Roles

  if (!isAuthorized(userRole, requiredRole)) {
    throw new Error('Not authorized to perform this action.');
  }

  return true;
}

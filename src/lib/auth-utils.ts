import { Session } from 'next-auth';
import { prisma } from './prisma';

/**
 * Checks if a user has the required permission to perform an action.
 * This is the central function for Role-Based Access Control (RBAC).
 *
 * @param session The NextAuth session object, which should contain the user's roleId.
 * @param requiredPermission The name of the permission required for the action.
 * @returns `true` if the user is authorized.
 * @throws {Error} if the user is not authenticated, has no role, or lacks the required permission.
 */
export async function authorize(
  session: Session | null,
  requiredPermission: string
): Promise<true> {
  if (!session?.user?.id || !(session.user as any).roleId) {
    throw new Error('Not authenticated or user role is missing.');
  }

  const userRoleId = (session.user as any).roleId;

  // TODO: Optimize this by caching permissions or including them in the session token
  // during the signIn callback in `auth-options.ts`. This avoids a DB call on every check.
  const userRoleWithPermissions = await prisma.role.findUnique({
    where: { id: userRoleId },
    include: {
      permissions: {
        include: {
          permission: true, // Include the actual Permission object
        },
      },
    },
  });

  if (!userRoleWithPermissions) {
    throw new Error('User role not found.');
  }

  const hasPermission = userRoleWithPermissions.permissions.some(
    (p) => p.permission.name === requiredPermission
  );

  if (!hasPermission) {
    throw new Error(
      `Not authorized. Missing required permission: ${requiredPermission}`
    );
  }

  return true;
}

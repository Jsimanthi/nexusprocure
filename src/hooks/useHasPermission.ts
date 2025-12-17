import { Permission, Role } from '@/types/auth'; // Import Enums
import { useSession } from 'next-auth/react';

/**
 * A custom React hook to check if the current user has a specific permission.
 *
 * @param permission The permission to check for (e.g., Permission.CREATE_IOM).
 * @returns `true` if the user has the permission, `false` otherwise.
 */
export function useHasPermission(permission: Permission): boolean {
  const { data: session, status } = useSession();

  if (status !== 'authenticated' || !session?.user) {
    return false;
  }

  // Explicitly grant all permissions to the Administrator role on the frontend
  if (session.user.role?.name === Role.ADMINISTRATOR) {
    return true;
  }

  const userPermissions = session.user.permissions || [];

  return userPermissions.includes(permission);
}

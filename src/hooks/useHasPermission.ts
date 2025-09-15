import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';

/**
 * A custom React hook to check if the current user has a specific permission.
 *
 * @param permission The permission string to check for (e.g., 'CREATE_IOM').
 * @returns `true` if the user has the permission, `false` otherwise.
 */
export function useHasPermission(permission: string): boolean {
  const { data: session } = useSession();
  const userPermissions = (session as Session)?.user?.permissions || [];

  return userPermissions.includes(permission);
}

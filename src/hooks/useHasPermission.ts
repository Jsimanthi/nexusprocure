import { useSession } from 'next-auth/react';

/**
 * A custom React hook to check if the current user has a specific permission.
 *
 * @param permission The permission string to check for (e.g., 'CREATE_IOM').
 * @returns `true` if the user has the permission, `false` otherwise.
 */
export function useHasPermission(permission: string): boolean {
  const { data: session } = useSession();
  const userPermissions = session?.user?.permissions || [];

  return userPermissions.includes(permission);
}

// Re-export the Role enum from Prisma to be used in the application
// This avoids having to import from the generated client in many places.
import { Role as PrismaRole } from '@prisma/client';

export const Role = PrismaRole;
export type Role = PrismaRole;

// Define a role hierarchy for authorization checks.
// Higher number means more permissions.
export const roleHierarchy = {
  [Role.USER]: 1,
  [Role.MANAGER]: 2,
  [Role.ADMIN]: 3,
};

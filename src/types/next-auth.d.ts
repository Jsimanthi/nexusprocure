import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

// Augment the default types to include our custom properties
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: {
        id: string;
        name: string;
      };
      department?: {
        id: string;
        name: string;
      } | null;
      permissions: string[];
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: {
      id: string;
      name: string;
    };
    department?: {
      id: string;
      name: string;
    } | null;
    permissions: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    roleId?: string;
    roleName?: string;
    departmentId?: string;
    departmentName?: string;
    permissions?: string[];
  }
}
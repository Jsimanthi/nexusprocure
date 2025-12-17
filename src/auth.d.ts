import { type DefaultSession } from 'next-auth';
import { type Permission, type Role } from './types/auth'; // Adjust import path if needed

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getServerSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user?: {
      id: string;
      role: {
        id: string;
        name: Role;
      };
      permissions: Permission[];
    } & DefaultSession['user'];
  }

  interface User {
    role?: {
      id: string;
      name: Role;
    };
    permissions?: Permission[];
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    roleId?: string;
    roleName?: Role;
    permissions?: Permission[];
  }
}
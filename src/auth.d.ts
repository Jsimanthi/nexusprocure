import { type DefaultSession } from 'next-auth';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getServerSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user?: {
      id: string;
      role: {
        id: string;
        name: string;
      };
      permissions: string[];
    } & DefaultSession['user'];
  }

  interface User {
    role?: {
      id: string;
      name: string;
    };
    permissions?: string[];
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    roleId?: string;
    roleName?: string;
    permissions?: string[];
  }
}
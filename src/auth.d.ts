interface UserRole {
  id: string;
  name: string;
}

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roleId?: string | null;
      permissions?: string[];
      role?: UserRole | null;
    };
  }

  /**
   * The shape of the user object returned by the providers
   */
  interface User {
    id: string;
    email: string;
    name?: string | null;
    roleId?: string | null;
    permissions?: string[];
    role?: UserRole | null;
  }
}

declare module 'next-auth/jwt' {
  /**
   * The shape of the JWT object.
   */
  interface JWT {
    roleId?: string | null;
    permissions?: string[];
    role?: UserRole | null;
  }
}

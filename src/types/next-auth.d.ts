import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roleId?: string | null; // Corrected type
      permissions?: string[];
    };
  }

  /**
   * The shape of the user object returned by the providers
   */
  interface User {
    id: string;
    email: string;
    name?: string | null;
    roleId?: string | null; // Corrected type
    permissions?: string[];
  }
}

declare module 'next-auth/jwt' {
  /**
   * The shape of the JWT object.
   */
  interface JWT {
    roleId?: string | null; // Corrected type
    permissions?: string[];
  }
}
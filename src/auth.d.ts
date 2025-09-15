import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

interface UserRole {
  id: string;
  name: string;
}

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      roleId?: string | null;
      permissions?: string[];
      role?: UserRole | null;
    } & DefaultSession["user"];
  }

  /**
   * The shape of the user object returned by the providers
   */
  interface User extends DefaultUser {
    id: string;
    roleId?: string | null;
    permissions?: string[];
    role?: UserRole | null;
  }
}

declare module "next-auth/jwt" {
  /**
   * The shape of the JWT object.
   */
  interface JWT {
    id: string;
    roleId?: string | null;
    permissions?: string[];
    role?: UserRole | null;
  }
}
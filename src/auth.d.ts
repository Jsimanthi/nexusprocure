import { DefaultSession, DefaultUser } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      roleId?: string | null;
      permissions?: string[];
      role?: Role | null;
    } & DefaultSession["user"];
  }

  /**
   * The shape of the user object returned by the providers
   */
  interface User extends DefaultUser {
    id: string;
    roleId?: string | null;
    permissions?: string[];
    role?: Role | null;
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
    role?: Role | null;
  }
}
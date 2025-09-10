// src/types/next-auth.d.ts
import NextAuth from "next-auth";

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roleId?: string;
      permissions?: string[]; // Add permissions to the session user
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    roleId?: string;
    permissions?: string[]; // Add permissions to the User model for the callback
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    roleId?: string;
    permissions?: string[]; // Add permissions to the JWT
  }
}
// src/types/next-auth.d.ts
import NextAuth from "next-auth";

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roleId?: string; // Add roleId to the session user
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    roleId?: string; // Add roleId to the User model
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    roleId?: string; // Add roleId to the JWT
  }
}
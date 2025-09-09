// src/lib/auth-server.ts
import NextAuth from "next-auth";
import { authOptions } from "./auth-options";

// This is where you generate the auth function
const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

export { handlers, auth, signIn, signOut };
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Use the shared authOptions
const { handlers: { GET, POST }, auth } = NextAuth(authOptions);

export { GET, POST, auth };
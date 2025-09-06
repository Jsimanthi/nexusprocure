// src/lib/auth.ts
// For server-side auth, we need to import from next-auth/next
// For client-side, we'll import from next-auth/react

// Export client-side functions
export { signIn, signOut } from "next-auth/react";

// For server-side session handling, we'll create a separate utility
// or import directly where needed
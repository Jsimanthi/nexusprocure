import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@prisma/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const { email, password } = credentialsSchema.parse(credentials);

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        const passwordValid = await bcrypt.compare(
          password,
          user.password || ""
        );

        if (!passwordValid) {
          return null;
        }

        // Return a basic user object with only the ID.
        // The jwt callback will fetch the rest of the data.
        return {
          id: user.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // If user object exists, this is a new sign-in
      if (user?.id) {
        token.id = user.id;
      }

      // This is the key change: Fetch the user's data on every JWT check,
      // not just on sign-in. This ensures the session is always fresh.
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      });

      if (dbUser) {
        token.name = dbUser.name;
        token.email = dbUser.email;
        // Store only the role NAME in the token, not the whole complex object
        token.roleName = dbUser.role?.name;
        token.permissions = dbUser.role?.permissions.map(
          (p) => p.permission.name
        );
      }

      return token;
    },
    async session({ session, token }) {
      // Populate the session object with the flattened data from the JWT token.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        // Reconstruct a minimal role object for the session
        session.user.role = { name: token.roleName as string };
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
// src/lib/auth-options.ts
import type { NextAuthConfig, User, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

// Define a custom user type that includes the 'role' field
interface ExtendedUser extends User {
  role?: string;
}

const DEMO_PASSWORD = "password123";

export const authOptions: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Look for user
        let user = await prisma.user.findUnique({
          where: { email },
        });

        // Create demo user if not exists
        if (!user) {
          const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
          user = await prisma.user.create({
            data: {
              email: email,
              name: "Demo User",
              password: hashedPassword,
              role: "ADMIN",
            },
          });
        }

        // Verify password - handle null password
        if (!user.password) {
          const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
          user = await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
          });
        }

        const passwordValid = await bcrypt.compare(
          password,
          user.password || ""
        );

        if (!passwordValid) {
          return null;
        }

        // Return user with role
        return {
          id: user.id,
          email: user.email,
          name: user.name || "User",
          role: user.role || "USER",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: ExtendedUser | undefined }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
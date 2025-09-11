// src/lib/auth-options.ts
import type { NextAuthConfig, User, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

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
        if (!user && credentials.email === 'demo@nexusprocure.com') {
          const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
          const adminRole = await prisma.role.findUnique({
            where: { name: 'ADMIN' },
          });
          if (!adminRole) {
            throw new Error('ADMIN role not found. Please seed the database.');
          }
          user = await prisma.user.create({
            data: {
              email: email,
              name: "Demo User",
              password: hashedPassword,
              roleId: adminRole.id,
            },
          });
        } else if (user && user.email === 'demo@nexusprocure.com') {
          // Ensure demo user is always an admin
          const adminRole = await prisma.role.findUnique({
            where: { name: 'ADMIN' },
          });
          if (adminRole && user.roleId !== adminRole.id) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { roleId: adminRole.id },
            });
          }
        }

        if (!user) {
          return null;
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

        // Fetch permissions for the role
        let permissions: string[] = [];
        if (user.roleId) {
          const roleWithPermissions = await prisma.role.findUnique({
            where: { id: user.roleId },
            include: {
              permissions: { include: { permission: true } },
            },
          });
          if (roleWithPermissions) {
            permissions = roleWithPermissions.permissions.map(
              (p) => p.permission.name
            );
          }
        }

        // Return user with roleId and permissions
        return {
          id: user.id,
          email: user.email,
          name: user.name || "User",
          roleId: user.roleId || undefined,
          permissions,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roleId = user.roleId;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.roleId = token.roleId;
        session.user.permissions = token.permissions;
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
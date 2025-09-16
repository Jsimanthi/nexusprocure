import NextAuth, { type NextAuthConfig, type User } from "next-auth";
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
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          role: user.role,
          permissions: user.role?.permissions.map(
            (p) => p.permission.name
          ),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const userWithRoleAndPermissions = user as User & {
          role: Role;
          permissions: string[];
        };
        token.id = userWithRoleAndPermissions.id;
        token.role = userWithRoleAndPermissions.role;
        token.permissions = userWithRoleAndPermissions.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
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
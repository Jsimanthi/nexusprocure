import { type AuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import crypto from "crypto";
import { Permission } from "@prisma/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  jwt: {
    maxAge: 15 * 60, // 15 minutes
  },
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

        return {
          id: user.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }

      if (account && account.type === 'credentials') {
        // Generate refresh token
        const refreshToken = crypto.randomBytes(32).toString('hex');
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await prisma.refreshToken.create({
          data: {
            token: hashedRefreshToken,
            userId: token.id as string,
            expiresAt,
          },
        });

        token.refreshToken = refreshToken;
      }

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
        token.roleId = dbUser.role?.id;
        token.roleName = dbUser.role?.name;
        token.permissions = dbUser.role?.permissions.map(
          (p: { permission: Permission }) => p.permission.name
        );
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = {
          id: token.roleId as string,
          name: token.roleName as string
        };
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
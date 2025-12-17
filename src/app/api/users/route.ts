import { authOptions } from '@/lib/auth';
import { authorize } from '@/lib/auth-utils';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { createUserSchema } from '@/lib/schemas';
import { Permission, Role } from '@/types/auth';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    authorize(session, Permission.MANAGE_USERS);

    const body = await req.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: fromZodError(validation.error).message },
        { status: 400 }
      );
    }

    const { name, email, password, roleId } = validation.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: fromZodError(error).message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error({ error }, 'Error creating user');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roleName = searchParams.get('role');
    const permissionName = searchParams.get('permission');

    // Authorization logic
    if (permissionName) {
      // Any authenticated user can fetch users by permission for now.
      // This is used for populating dropdowns for approvers/reviewers.
      // The pages that use this endpoint should already have permission checks.
    } else if (roleName) {
      const permissions = session.user.permissions || [];
      const canFetchManagers =
        permissions.includes(Permission.REVIEW_IOM) ||
        permissions.includes(Permission.REVIEW_PO) ||
        permissions.includes(Permission.CREATE_PR);

      if (roleName === Role.MANAGER && canFetchManagers) {
        // Allow users with specific permissions to fetch managers
      } else {
        authorize(session, Permission.MANAGE_USERS);
      }
    } else {
      authorize(session, Permission.MANAGE_USERS);
    }

    const whereClause: Prisma.UserWhereInput = {};
    const roleClause: Prisma.RoleWhereInput = {};

    if (roleName) {
      roleClause.name = roleName;
    }
    if (permissionName) {
      roleClause.permissions = {
        some: {
          permission: {
            name: permissionName,
          },
        },
      };
    }
    if (roleName || permissionName) {
      whereClause.role = roleClause;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error({ error }, 'Error fetching users');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

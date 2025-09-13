import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { authorize } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createUserSchema } from '@/lib/schemas';
import bcrypt from 'bcryptjs';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    authorize(session, 'MANAGE_USERS');

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
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roleName = searchParams.get('role');

    const permissions = session.user.permissions || [];
    const canFetchManagers =
        permissions.includes('REVIEW_IOM') ||
        permissions.includes('REVIEW_PO') ||
        permissions.includes('CREATE_PR');

    if (roleName === 'MANAGER' && canFetchManagers) {
      // Allow users with specific permissions to fetch managers
    } else {
      authorize(session, 'MANAGE_USERS');
    }

    const users = await prisma.user.findMany({
      where: roleName ? { role: { name: roleName } } : {},
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
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

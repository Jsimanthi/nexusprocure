// src/app/api/departments/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { createDepartmentSchema } from '@/lib/schemas';
import { authorize } from '@/lib/auth-utils';
import { fromZodError } from 'zod-validation-error';
import { ZodError } from 'zod';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    authorize(session, 'MANAGE_DEPARTMENTS');
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(departments);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    console.error('Error fetching departments:', error);
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    authorize(session, 'MANAGE_DEPARTMENTS');
    const body = await req.json();
    const validation = createDepartmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: fromZodError(validation.error).message },
        { status: 400 }
      );
    }

    const { name } = validation.data;

    const existingDepartment = await prisma.department.findUnique({
      where: { name },
    });

    if (existingDepartment) {
      return NextResponse.json(
        { message: 'Department with this name already exists' },
        { status: 409 }
      );
    }

    const newDepartment = await prisma.department.create({
      data: { name },
    });

    return NextResponse.json(newDepartment, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: fromZodError(error).message },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    console.error('Error creating department:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
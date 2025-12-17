import { authOptions } from "@/lib/auth";
import { authorize } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { Permission } from '@/types/auth';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    authorize(session, Permission.MANAGE_ROLES);

    const permissions = await prisma.permission.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(permissions);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

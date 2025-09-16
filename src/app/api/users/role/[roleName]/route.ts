import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth-config";
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/auth-utils';

export async function GET(
  _request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ roleName: string }> }
) {
  try {
    const params = await paramsPromise;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    authorize(session, 'MANAGE_USERS');

    const { roleName } = params;

    const users = await prisma.user.findMany({
      where: {
        role: {
          name: roleName,
        },
      },
      select: {
        id: true,
        name: true,
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
    console.error(`Error fetching users by role:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

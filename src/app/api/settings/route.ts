import { authOptions } from '@/lib/auth';
import { authorize } from '@/lib/auth-utils';
import logger from '@/lib/logger'; // Import logger
import { prisma } from '@/lib/prisma';
import { Permission } from '@/types/auth'; // Import Permission
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    authorize(session, Permission.MANAGE_SETTINGS); // Use Enum

    const settings = await prisma.setting.findMany({
      orderBy: {
        key: 'asc',
      },
    });
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    logger.error({ error }, 'Error fetching settings'); // Use logger
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
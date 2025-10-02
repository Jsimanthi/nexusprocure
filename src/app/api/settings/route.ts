import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth-config';
import { authorize } from '@/lib/auth-utils';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    authorize(session, 'MANAGE_SETTINGS');

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
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
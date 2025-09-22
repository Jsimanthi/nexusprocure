import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth-config';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key } = await context.params;

  if (!key) {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 });
  }

  try {
    const setting = await prisma.setting.findUnique({
      where: { key },
    });

    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error(`Error fetching setting with key ${key}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

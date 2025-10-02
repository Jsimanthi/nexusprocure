import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth-config';
import { authorize } from '@/lib/auth-utils';

export async function GET(
  request: NextRequest,
  context: { params: { key: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    authorize(session, 'MANAGE_SETTINGS');

    const { key } = context.params;

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const setting = await prisma.setting.findUnique({
      where: { key },
    });

    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    return NextResponse.json(setting);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not authorized')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error(`Error fetching setting:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { key: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    authorize(session, 'MANAGE_SETTINGS');

    const { key } = context.params;
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const body = await request.json();
    const { value } = body;

    if (typeof value !== 'string') {
      return NextResponse.json({ error: 'Value must be a string' }, { status: 400 });
    }

    const updatedSetting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json(updatedSetting);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error(`Error updating setting:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
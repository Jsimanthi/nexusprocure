import { authOptions } from '@/lib/auth';
import { authorize } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { Permission } from '@/types/auth';
import { promises as fs } from 'fs';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import path from 'path';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only administrators should be able to see system info
    authorize(session, Permission.MANAGE_SETTINGS);

    // 1. Get App Version from package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    const appVersion = packageJson.version;

    // 2. Check Database Status
    let dbStatus: 'ok' | 'error' = 'ok';
    try {
      // Use a simple query to check if the database is responsive
      await prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      console.error('Database connection check failed:', e);
      dbStatus = 'error';
    }

    // 3. Get Node.js version
    const nodeVersion = process.version;

    return NextResponse.json({
      appVersion,
      dbStatus,
      nodeVersion,
    });
  } catch (error) {
    console.error('Error fetching system info:', error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
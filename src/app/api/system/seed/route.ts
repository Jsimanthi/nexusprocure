import { authOptions } from '@/lib/auth';
import { authorize } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { Permission } from '@/types/auth';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { main as seedDatabase } from '../../../../../prisma/seed';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    authorize(session, Permission.MANAGE_SETTINGS);

    console.log('Database seeding initiated by user:', session.user.email);

    // Asynchronously run the seed function and ensure the prisma client is disconnected
    seedDatabase()
      .then(async () => {
        console.log('Database seeding completed successfully.');
        await prisma.$disconnect();
      })
      .catch(async (error) => {
        console.error('Database seeding failed:', error);
        await prisma.$disconnect();
      });

    return NextResponse.json({
      message: 'Database seeding process has been initiated.',
    });

  } catch (error) {
    console.error('Error initiating database seed:', error);
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
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth-config';
import { ReportType, ReportFrequency } from '@prisma/client';

// GET: Check subscription status
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await prisma.reportSubscription.findFirst({
      where: {
        userId: session.user.id,
        reportType: ReportType.WEEKLY_SPEND_SUMMARY,
      },
    });

    return NextResponse.json({ isSubscribed: !!subscription });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new subscription
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingSubscription = await prisma.reportSubscription.findFirst({
        where: {
            userId: session.user.id,
            reportType: ReportType.WEEKLY_SPEND_SUMMARY,
        },
    });

    if (existingSubscription) {
        return NextResponse.json({ message: 'Already subscribed' }, { status: 200 });
    }

    const subscription = await prisma.reportSubscription.create({
      data: {
        userId: session.user.id,
        reportType: ReportType.WEEKLY_SPEND_SUMMARY,
        frequency: ReportFrequency.WEEKLY,
      },
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove a subscription
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.reportSubscription.deleteMany({
      where: {
        userId: session.user.id,
        reportType: ReportType.WEEKLY_SPEND_SUMMARY,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
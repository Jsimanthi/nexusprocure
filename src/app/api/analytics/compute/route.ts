import { NextRequest, NextResponse } from 'next/server';
import { addAnalyticsJob } from '@/lib/queue';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { type, date } = await request.json();

    if (!type || !date) {
      return new NextResponse('Type and date are required', { status: 400 });
    }

    if (!['daily', 'weekly', 'monthly'].includes(type)) {
      return new NextResponse('Invalid type', { status: 400 });
    }

    logger.info(`Triggering analytics computation for ${type} on ${date}`);
    const job = await addAnalyticsJob({ type, date });

    return NextResponse.json({
      message: 'Analytics job queued',
      jobId: job.id,
    });

  } catch (error) {
    logger.error(`Failed to queue analytics job: ${error}`);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
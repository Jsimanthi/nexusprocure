import { NextRequest, NextResponse } from 'next/server';
import { sendWeeklySpendSummary } from '@/lib/report-service';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', {
      status: 401,
    });
  }

  try {
    const result = await sendWeeklySpendSummary();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
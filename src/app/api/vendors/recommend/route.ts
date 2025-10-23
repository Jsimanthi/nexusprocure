import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { authorize } from '@/lib/auth-utils';
import { getTopVendors } from '@/lib/vendor';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    authorize(session, 'READ_ALL_VENDORS');

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    logger.info(`Getting top vendors with limit ${limit}`);
    const vendors = await getTopVendors(limit);

    return NextResponse.json({
      vendors: vendors.map(vendor => ({
        id: vendor.id,
        name: vendor.name,
        onTimeDeliveryRate: vendor.onTimeDeliveryRate,
        averageQualityScore: vendor.averageQualityScore,
        score: vendor.score,
      })),
    });

  } catch (error) {
    logger.error(`Error getting vendor recommendations: ${String(error)}`);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
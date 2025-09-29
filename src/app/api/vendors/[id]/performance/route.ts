import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth-config';
import { authorize } from '@/lib/auth-utils';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: vendorId } = await context.params;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Assuming a permission like 'READ_VENDOR' is required to see performance
    authorize(session, 'READ_VENDOR');

    const deliveredPOs = await prisma.purchaseOrder.findMany({
      where: {
        vendorId: vendorId,
        status: 'DELIVERED',
        fulfilledAt: { not: null },
        expectedDeliveryDate: { not: null },
      },
      select: {
        fulfilledAt: true,
        expectedDeliveryDate: true,
        qualityScore: true,
        items: {
          select: {
            unitPrice: true,
            iomItem: {
              select: {
                unitPrice: true,
              },
            },
          },
        },
      },
    });

    if (deliveredPOs.length === 0) {
      return NextResponse.json({
        onTimeDeliveryRate: 100, // Default to 100% if no orders
        averageQualityScore: null, // No score if no orders
        averagePriceVariance: 0,
        totalDeliveredOrders: 0,
      });
    }

    const onTimeDeliveries = deliveredPOs.filter(
      (po) => po.fulfilledAt! <= po.expectedDeliveryDate!
    ).length;

    const onTimeDeliveryRate = (onTimeDeliveries / deliveredPOs.length) * 100;

    const scoredPOs = deliveredPOs.filter((po) => po.qualityScore !== null);
    const averageQualityScore =
      scoredPOs.length > 0
        ? scoredPOs.reduce((sum, po) => sum + po.qualityScore!, 0) / scoredPOs.length
        : null;

    const priceVariances = deliveredPOs
      .flatMap((po) => po.items)
      .map((item) => {
        if (item.iomItem && item.iomItem.unitPrice > 0) {
          return ((item.unitPrice - item.iomItem.unitPrice) / item.iomItem.unitPrice) * 100;
        }
        return null;
      })
      .filter((variance) => variance !== null) as number[];

    const averagePriceVariance =
      priceVariances.length > 0
        ? priceVariances.reduce((sum, v) => sum + v, 0) / priceVariances.length
        : 0;

    return NextResponse.json({
      onTimeDeliveryRate: parseFloat(onTimeDeliveryRate.toFixed(2)),
      averageQualityScore: averageQualityScore ? parseFloat(averageQualityScore.toFixed(2)) : null,
      averagePriceVariance: parseFloat(averagePriceVariance.toFixed(2)),
      totalDeliveredOrders: deliveredPOs.length,
    });

  } catch (error) {
    console.error('Error fetching vendor performance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
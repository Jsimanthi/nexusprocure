import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth-config';
import { authorize } from '@/lib/auth-utils';
import { z } from 'zod';

const checkAnomalySchema = z.object({
  vendorId: z.string().cuid(),
  items: z.array(
    z.object({
      itemName: z.string(),
      unitPrice: z.number(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    authorize(session, 'CREATE_PO');

    const body = await request.json();
    const validation = checkAnomalySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { vendorId, items } = validation.data;
    const ANOMALY_THRESHOLD = 1.5; // 50% higher than average

    const historicalItems = await prisma.pOItem.findMany({
      where: {
        po: {
          vendorId: vendorId,
          status: { in: ['ORDERED', 'DELIVERED', 'COMPLETED'] },
        },
      },
      select: {
        itemName: true,
        unitPrice: true,
      },
    });

    const averagePrices: { [key: string]: { total: number; count: number } } = {};
    for (const item of historicalItems) {
      if (!averagePrices[item.itemName]) {
        averagePrices[item.itemName] = { total: 0, count: 0 };
      }
      averagePrices[item.itemName].total += item.unitPrice;
      averagePrices[item.itemName].count += 1;
    }

    const anomalies = items
      .map(item => {
        const avgPriceData = averagePrices[item.itemName];
        if (avgPriceData && avgPriceData.count > 0) {
          const historicalAvg = avgPriceData.total / avgPriceData.count;
          if (item.unitPrice > historicalAvg * ANOMALY_THRESHOLD) {
            return {
              itemName: item.itemName,
              currentPrice: item.unitPrice,
              historicalAverage: parseFloat(historicalAvg.toFixed(2)),
              percentageIncrease: parseFloat(
                (((item.unitPrice - historicalAvg) / historicalAvg) * 100).toFixed(2)
              ),
            };
          }
        }
        return null;
      })
      .filter(Boolean);

    return NextResponse.json({ anomalies });

  } catch (error) {
    console.error('Error checking for anomalies:', error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
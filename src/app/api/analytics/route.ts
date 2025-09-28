import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

import { authorize } from '@/lib/auth-utils';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    authorize(session, 'VIEW_ANALYTICS');

    // --- Spend Over Time Calculation ---
    // Using a raw query is most efficient for date grouping and aggregation.
    const spendOverTime = await prisma.$queryRaw<
      { month: string; total: number }[]
    >`
      SELECT
        strftime('%Y-%m', createdAt) as month,
        SUM(grandTotal) as total
      FROM PurchaseOrder
      WHERE status IN ('ORDERED', 'DELIVERED', 'COMPLETED', 'PROCESSED')
      GROUP BY month
      ORDER BY month ASC
    `;

    // Format the data for the recharts library
    const formattedSpendData = spendOverTime.map(item => ({
        name: item.month,
        Total: item.total,
    }));

    return NextResponse.json({
        spendOverTime: formattedSpendData,
    });
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
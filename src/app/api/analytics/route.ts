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

    const spendOverTimePromise = prisma.$queryRaw<
      { month: string; total: number }[]
    >`
      SELECT
        strftime('%Y-%m', "createdAt") as month,
        SUM(grandTotal) as total
      FROM PurchaseOrder
      WHERE status IN ('ORDERED', 'DELIVERED', 'COMPLETED')
      GROUP BY month
      ORDER BY month ASC
    `;

    const spendByCategoryPromise = prisma.pOItem.groupBy({
      by: ['category'],
      _sum: {
        totalPrice: true,
      },
      where: {
        po: {
          status: {
            in: ['ORDERED', 'DELIVERED', 'COMPLETED'],
          },
        },
        category: {
          not: null,
        },
      },
    });

    const [spendOverTime, spendByCategory] = await Promise.all([
      spendOverTimePromise,
      spendByCategoryPromise,
    ]);

    const formattedSpendData = spendOverTime.map((item) => ({
      name: item.month,
      Total: item.total,
    }));

    const formattedCategoryData = spendByCategory.map((item) => ({
      name: item.category!,
      value: item._sum.totalPrice || 0,
    }));

    return NextResponse.json({
      spendOverTime: formattedSpendData,
      spendByCategory: formattedCategoryData,
    });
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
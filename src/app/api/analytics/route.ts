import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/auth-utils';
import logger from '@/lib/logger';

type SpendOverTimeItem = { month: string; total: number };
type SpendByCategoryItem = { category: string | null; _sum: { totalPrice: number | null } };
type SpendByDepartmentItem = { department: string; total: number };
type TopVendorsItem = { vendorName: string | null; _sum: { grandTotal: number | null } };

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
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

    const spendByDepartmentPromise = prisma.$queryRaw<
      { department: string; total: number }[]
    >`
      SELECT
        i."from" as department,
        SUM(po.grandTotal) as total
      FROM PurchaseOrder po
      INNER JOIN IOM i ON po.iomId = i.id
      WHERE po.status IN ('ORDERED', 'DELIVERED', 'COMPLETED')
      GROUP BY department
      ORDER BY total DESC
    `;

    const topVendorsPromise = prisma.purchaseOrder.groupBy({
      by: ['vendorName'],
      _sum: {
        grandTotal: true,
      },
      where: {
        status: { in: ['ORDERED', 'DELIVERED', 'COMPLETED'] },
      },
      orderBy: {
        _sum: {
          grandTotal: 'desc',
        },
      },
      take: 5,
    });

    const [spendOverTime, spendByCategory, spendByDepartment, topVendors] = await Promise.all([
      spendOverTimePromise,
      spendByCategoryPromise,
      spendByDepartmentPromise,
      topVendorsPromise,
    ]);

    const formattedSpendData = spendOverTime.map((item: SpendOverTimeItem) => ({
      name: item.month,
      Total: item.total,
    }));

    const formattedCategoryData = spendByCategory.map((item: SpendByCategoryItem) => ({
      name: item.category!,
      value: item._sum.totalPrice || 0,
    }));

    const formattedDepartmentData = spendByDepartment.map((item: SpendByDepartmentItem) => ({
        name: item.department,
        Total: item.total,
    }));

    const formattedTopVendors = topVendors.map((item: TopVendorsItem) => ({
      name: item.vendorName!,
      Total: item._sum.grandTotal || 0,
    }));

    const topCategories = [...formattedCategoryData]
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 5)
      .map(item => ({ name: item.name, Total: item.value }));

    return NextResponse.json({
      spendOverTime: formattedSpendData,
      spendByCategory: formattedCategoryData,
      spendByDepartment: formattedDepartmentData,
      topVendors: formattedTopVendors,
      topCategories: topCategories,
    });
  } catch (error) {
    logger.error(`Error fetching analytics data: ${error}`);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
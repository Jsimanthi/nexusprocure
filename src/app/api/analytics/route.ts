import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/auth-utils';

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

    const [spendOverTime, spendByCategory, spendByDepartment] = await Promise.all([
      spendOverTimePromise,
      spendByCategoryPromise,
      spendByDepartmentPromise,
    ]);

    const formattedSpendData = spendOverTime.map((item) => ({
      name: item.month,
      Total: item.total,
    }));

    const formattedCategoryData = spendByCategory.map((item) => ({
      name: item.category!,
      value: item._sum.totalPrice || 0,
    }));

    const formattedDepartmentData = spendByDepartment.map((item) => ({
        name: item.department,
        Total: item.total,
    }));

    return NextResponse.json({
      spendOverTime: formattedSpendData,
      spendByCategory: formattedCategoryData,
      spendByDepartment: formattedDepartmentData,
    });
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
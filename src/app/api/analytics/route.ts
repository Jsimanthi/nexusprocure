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

    const spendByDepartmentPromise = prisma.purchaseOrder.groupBy({
      by: ['department'],
      _sum: {
        grandTotal: true,
      },
      where: {
        status: {
          in: ['ORDERED', 'DELIVERED', 'COMPLETED'],
        },
        department: {
          gt: '',
        },
      },
      orderBy: {
        _sum: {
          grandTotal: 'desc',
        },
      },
    });

    const topVendorsPromise = prisma.purchaseOrder.groupBy({
      by: ['vendorId', 'vendorName'],
      _sum: {
        grandTotal: true,
      },
      where: {
        status: {
          in: ['ORDERED', 'DELIVERED', 'COMPLETED'],
        },
        vendorId: {
          not: null,
        },
      },
      orderBy: {
        _sum: {
          grandTotal: 'desc',
        },
      },
      take: 5,
    });

    const topDepartmentsPromise = prisma.purchaseOrder.groupBy({
      by: ['department'],
      _sum: {
        grandTotal: true,
      },
      where: {
        status: { in: ['ORDERED', 'DELIVERED', 'COMPLETED'] },
        department: { gt: '' },
      },
      orderBy: { _sum: { grandTotal: 'desc' } },
      take: 5,
    });

    const topCategoriesPromise = prisma.pOItem.groupBy({
      by: ['category'],
      _sum: {
        totalPrice: true,
      },
      where: {
        po: {
          status: { in: ['ORDERED', 'DELIVERED', 'COMPLETED'] },
        },
        category: { gt: '' },
      },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: 5,
    });

    const [
      spendOverTime,
      spendByCategory,
      spendByDepartment,
      topVendors,
      topDepartments,
      topCategories,
    ] = await Promise.all([
      spendOverTimePromise,
      spendByCategoryPromise,
      spendByDepartmentPromise,
      topVendorsPromise,
      topDepartmentsPromise,
      topCategoriesPromise,
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
      name: item.department!,
      Total: item._sum.grandTotal || 0,
    }));

    const formattedTopVendors = topVendors.map((item) => ({
      id: item.vendorId!,
      name: item.vendorName,
      Total: item._sum.grandTotal || 0,
    }));

    const formattedTopDepartments = topDepartments.map((item) => ({
      name: item.department!,
      Total: item._sum.grandTotal || 0,
    }));

    const formattedTopCategories = topCategories.map((item) => ({
      name: item.category!,
      Total: item._sum.totalPrice || 0,
    }));

    return NextResponse.json({
      spendOverTime: formattedSpendData,
      spendByCategory: formattedCategoryData,
      spendByDepartment: formattedDepartmentData,
      topVendors: formattedTopVendors,
      topDepartments: formattedTopDepartments,
      topCategories: formattedTopCategories,
    });
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
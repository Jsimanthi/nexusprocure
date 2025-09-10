import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { POStatus } from "@/types/po";
import { authorize } from "@/lib/auth-utils";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    // Use the new permission-based authorization
    authorize(session, 'VIEW_ANALYTICS');

    // 1. Document Counts
    const poCount = await prisma.purchaseOrder.count();
    const iomCount = await prisma.iOM.count();
    const crCount = await prisma.checkRequest.count();

    // 2. POs by Status
    const poStatusCounts = await prisma.purchaseOrder.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    // 3. Spending over the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlySpending = await prisma.purchaseOrder.groupBy({
      by: ['createdAt'],
      where: {
        status: POStatus.APPROVED, // Only count approved POs
        createdAt: {
          gte: twelveMonthsAgo,
        },
      },
      _sum: {
        grandTotal: true,
      },
      orderBy: {
        createdAt: 'asc',
      }
    });

    // Process monthly spending data to group by month
    const spendingByMonth = monthlySpending.reduce((acc, curr) => {
        const month = curr.createdAt.toISOString().slice(0, 7); // YYYY-MM
        if (!acc[month]) {
            acc[month] = 0;
        }
        acc[month] += curr._sum.grandTotal || 0;
        return acc;
    }, {} as Record<string, number>);


    const analyticsData = {
      documentCounts: {
        purchaseOrders: poCount,
        ioms: iomCount,
        checkRequests: crCount,
      },
      poStatusCounts: poStatusCounts.map(item => ({
        status: item.status,
        count: item._count.status,
      })),
      spendingByMonth: Object.entries(spendingByMonth).map(([month, total]) => ({
        month,
        total,
      })),
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

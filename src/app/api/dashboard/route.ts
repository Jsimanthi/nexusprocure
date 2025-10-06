import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IOM, PurchaseOrder, PaymentRequest } from "@prisma/client";
import { Kpi } from "@/types/dashboard";

// Define a type for recent activity items for better type safety
type RecentActivityItem = (IOM | PurchaseOrder | PaymentRequest) & {
  type: "IOM" | "PO" | "PR";
  date: Date;
};

// Helper function to format recent activity
const formatRecentActivity = (
  items: (IOM | PurchaseOrder | PaymentRequest)[],
  type: "IOM" | "PO" | "PR"
): RecentActivityItem[] => {
  return items.slice(0, 5).map((item) => ({
    ...item,
    type,
    date: item.createdAt,
  }));
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Explicitly check for role object and name property.
    // If a user has no role, return a default empty dashboard state.
    if (!session.user.role || typeof session.user.role.name !== 'string') {
      return NextResponse.json({
        iomCount: 0,
        poCount: 0,
        prCount: 0,
        pendingApprovals: 0,
        recentActivity: [],
        kpis: {},
      });
    }

    const userId = session.user.id;
    const userRole = session.user.role.name;

    let ioms: IOM[] = [];
    let pos: PurchaseOrder[] = [];
    let prs: PaymentRequest[] = [];
    let pendingApprovals = 0;

    const baseInclude = {
      preparedBy: true,
      reviewedBy: true,
      approvedBy: true,
    };

    let kpis: Kpi = {};

    switch (userRole) {
      case "Administrator":
        const [iomsData, posData, prsData, fulfilledPOs, monthlySpendResult] = await Promise.all([
          prisma.iOM.findMany({
            orderBy: { createdAt: "desc" },
            include: baseInclude,
          }),
          prisma.purchaseOrder.findMany({
            orderBy: { createdAt: "desc" },
            include: baseInclude,
          }),
          prisma.paymentRequest.findMany({
            orderBy: { createdAt: "desc" },
            include: baseInclude,
          }),
          prisma.purchaseOrder.findMany({
            where: { fulfilledAt: { not: null }, iomId: { not: null } },
            include: { iom: { select: { createdAt: true } } },
          }),
          // Correctly calculate spend from PROCESSED Payment Requests
          prisma.paymentRequest.aggregate({
            _sum: { grandTotal: true },
            where: {
              status: 'PROCESSED',
              createdAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              },
            },
          }),
        ]);
        ioms = iomsData;
        pos = posData;
        prs = prsData;

        // KPI Calculations
        const calculateAverageApprovalTime = (docs: { createdAt: Date; updatedAt: Date; status: string }[], status: string) => {
          const approvedDocs = docs.filter(doc => doc.status === status);
          if (approvedDocs.length === 0) return 0;
          const totalTime = approvedDocs.reduce((acc, doc) => {
            return acc + (doc.updatedAt.getTime() - doc.createdAt.getTime());
          }, 0);
          return totalTime / approvedDocs.length / (1000 * 60 * 60 * 24); // Return in days
        };

        const calculateProcurementCycleTime = (
          fulfilledPos: (PurchaseOrder & { iom: { createdAt: Date } | null })[]
        ) => {
          const validPos = fulfilledPos.filter(po => po.iom && po.fulfilledAt);
          if (validPos.length === 0) return 0;
          const totalCycleTime = validPos.reduce((acc, po) => {
            return acc + (po.fulfilledAt!.getTime() - po.iom!.createdAt.getTime());
          }, 0);
          return totalCycleTime / validPos.length / (1000 * 60 * 60 * 24); // Return in days
        };

        const calculateEmergencyPurchaseRate = (allIoms: IOM[]) => {
          if (allIoms.length === 0) return 0;
          const urgentCount = allIoms.filter(iom => iom.isUrgent).length;
          return (urgentCount / allIoms.length) * 100;
        };

        kpis = {
          avgIomApprovalTime: calculateAverageApprovalTime(ioms, 'APPROVED'),
          avgPoApprovalTime: calculateAverageApprovalTime(pos, 'APPROVED'),
          avgPrApprovalTime: calculateAverageApprovalTime(prs, 'PROCESSED'), // Also changed this to PROCESSED
          avgProcurementCycleTime: calculateProcurementCycleTime(fulfilledPOs),
          emergencyPurchaseRate: calculateEmergencyPurchaseRate(ioms),
          totalSpendThisMonth: monthlySpendResult._sum.grandTotal || 0,
        };

        break;

      case "Manager":
      case "Approver":
        // For these roles, we need ALL documents they are involved in, not just pending ones.
        [ioms, pos, prs] = await Promise.all([
          prisma.iOM.findMany({
            where: {
              OR: [{ reviewedById: userId }, { approvedById: userId }],
            },
            orderBy: { createdAt: "desc" },
            include: baseInclude,
          }),
          prisma.purchaseOrder.findMany({
            where: {
              OR: [{ reviewedById: userId }, { approvedById: userId }],
            },
            orderBy: { createdAt: "desc" },
            include: baseInclude,
          }),
          prisma.paymentRequest.findMany({
            where: {
              OR: [{ reviewedById: userId }, { approvedById: userId }],
            },
            orderBy: { createdAt: "desc" },
            include: baseInclude,
          }),
        ]);
        break;

      case "Procurement Officer":
        [ioms, pos, prs] = await Promise.all([
          prisma.iOM.findMany({
            where: { preparedById: userId },
            orderBy: { createdAt: "desc" },
            include: baseInclude,
          }),
          prisma.purchaseOrder.findMany({
            where: { preparedById: userId },
            orderBy: { createdAt: "desc" },
            include: baseInclude,
          }),
          prisma.paymentRequest.findMany({
            where: { preparedById: userId },
            orderBy: { createdAt: "desc" },
            include: baseInclude,
          }),
        ]);
        break;

      case "Finance Officer":
        prs = await prisma.paymentRequest.findMany({
          where: { status: "APPROVED" },
          orderBy: { createdAt: "desc" },
          include: baseInclude,
        });
        // Finance officers might not see IOMs/POs unless they are involved
        ioms = [];
        pos = [];
        break;

      default:
        // Default to no data for unknown roles
        break;
    }

    // Calculate pending approvals based on the role.
    if (userRole === "Administrator") {
        const [iomPending, poPending, prPending] = await Promise.all([
            prisma.iOM.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
            prisma.purchaseOrder.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
            prisma.paymentRequest.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
        ]);
        pendingApprovals = iomPending + poPending + prPending;
    } else if (userRole === "Manager" || userRole === "Approver") {
        // For Managers/Approvers, filter the already-fetched documents for actionable statuses.
        const actionableStatuses = ["SUBMITTED", "UNDER_REVIEW", "PENDING_APPROVAL"];
        pendingApprovals =
            ioms.filter(iom => actionableStatuses.includes(iom.status)).length +
            pos.filter(po => actionableStatuses.includes(po.status)).length +
            prs.filter(pr => actionableStatuses.includes(pr.status)).length;
    } else {
        // Other roles do not have a "pending approvals" count on their dashboard.
        pendingApprovals = 0;
    }


    const recentIoms = formatRecentActivity(ioms, "IOM");
    const recentPos = formatRecentActivity(pos, "PO");
    const recentPrs = formatRecentActivity(prs, "PR");

    const recentActivity = [...recentIoms, ...recentPos, ...recentPrs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return NextResponse.json({
      iomCount: ioms.length,
      poCount: pos.length,
      prCount: prs.length,
      pendingApprovals,
      recentActivity,
      kpis,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { IOM, PurchaseOrder, PaymentRequest } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [ioms, pos, prs] = await Promise.all([
      prisma.iOM.findMany({
        orderBy: { createdAt: "desc" },
        include: { preparedBy: true },
      }),
      prisma.purchaseOrder.findMany({
        orderBy: { createdAt: "desc" },
        include: { preparedBy: true },
      }),
      prisma.paymentRequest.findMany({
        orderBy: { createdAt: "desc" },
        include: { preparedBy: true },
      }),
    ]);

    const pendingApprovals =
      ioms.filter(
        (iom) =>
          iom.status === "SUBMITTED" || iom.status === "UNDER_REVIEW"
      ).length +
      pos.filter(
        (po) =>
          po.status === "SUBMITTED" || po.status === "UNDER_REVIEW"
      ).length +
      prs.filter(
        (pr) =>
          pr.status === "SUBMITTED" || pr.status === "UNDER_REVIEW"
      ).length;

    const recentIoms = ioms.slice(0, 5).map((iom) => ({
      ...iom,
      type: "IOM",
      date: iom.createdAt,
    }));

    const recentPos = pos.slice(0, 5).map((po) => ({
      ...po,
      type: "PO",
      date: po.createdAt,
    }));

    const recentPrs = prs.slice(0, 5).map((pr) => ({
      ...pr,
      type: "PR",
      date: pr.createdAt,
    }));

    const recentActivity = [...recentIoms, ...recentPos, ...recentPrs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return NextResponse.json({
      iomCount: ioms.length,
      poCount: pos.length,
      prCount: prs.length,
      pendingApprovals,
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

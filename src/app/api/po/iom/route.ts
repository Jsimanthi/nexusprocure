// src/app/api/po/iom/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get approved IOMs that don't have purchase orders yet
    const ioms = await prisma.iOM.findMany({
      where: {
        status: "APPROVED",
        purchaseOrders: { none: {} } // Exclude IOMs with existing POs
      },
      include: {
        items: true,
        preparedBy: { select: { name: true, email: true } },
        requestedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(ioms);
  } catch (error) {
    console.error("Error fetching IOMs for PO:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
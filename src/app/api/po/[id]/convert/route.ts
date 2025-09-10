// src/app/api/po/[id]/convert/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { getPOById } from "@/lib/po";
import { createCheckRequest } from "@/lib/cr";
import { CRStatus } from "@/types/cr";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the PO to convert
    const po = await getPOById(id);

    if (!po) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    // Validate that PO is approved
    if (po.status !== 'APPROVED') {
      return NextResponse.json(
        { error: "Purchase Order must be approved before converting to Check Request" },
        { status: 400 }
      );
    }

    const cr = await createCheckRequest({
      title: `CR for ${po.title}`,
      poId: po.id,
      paymentTo: po.vendor?.name || 'N/A',
      grandTotal: po.grandTotal,
      preparedById: session.user.id,
      requestedById: po.requestedById,
      companyName: po.companyName,
      companyAddress: po.companyAddress,
      companyContact: po.companyContact,
      purpose: `Payment for PO #${po.poNumber}`,
      status: CRStatus.DRAFT,
    }, session);

    return NextResponse.json(cr, { status: 201 });
  } catch (error) {
    console.error("Error converting PO to CR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// src/app/api/po/[id]/convert/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getPOById } from "@/lib/po";
import { createPaymentRequest } from "@/lib/pr";
import { PaymentMethod } from "@/types/pr";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the PO to convert
    const po = await getPOById(id);

    if (!po) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    // Validate that PO status allows for PR conversion
    const allowedStatuses = ['APPROVED', 'ORDERED', 'DELIVERED'];
    if (!allowedStatuses.includes(po.status)) {
      return NextResponse.json(
        { error: `Purchase Order status must be one of: ${allowedStatuses.join(', ')} to be converted.` },
        { status: 400 }
      );
    }

    // Check if a PR already exists for this PO
    const existingPr = await prisma.paymentRequest.findFirst({
      where: { poId: id },
    });

    if (existingPr) {
      return NextResponse.json(
        { error: "A Payment Request has already been created for this Purchase Order." },
        { status: 409 }
      );
    }

    const body = await request.json();

    const paymentMethodValues = Object.values(PaymentMethod);
    if (!body.paymentMethod || !paymentMethodValues.includes(body.paymentMethod as PaymentMethod)) {
      return NextResponse.json(
        { error: `Invalid or missing paymentMethod. Must be one of: ${paymentMethodValues.join(', ')}` },
        { status: 400 }
      );
    }

    if (!po.reviewedById || !po.approvedById) {
      return NextResponse.json(
        { error: "PO is missing a reviewer or approver and cannot be converted." },
        { status: 400 }
      );
    }

    const pr = await createPaymentRequest({
      title: `PR for ${po.title}`,
      poId: po.id,
      paymentTo: po.vendor?.name || 'N/A',
      grandTotal: po.grandTotal,
      totalAmount: po.totalAmount,
      taxAmount: po.taxAmount,
      paymentMethod: body.paymentMethod,
      paymentDate: new Date(),
      preparedById: session.user.id,
      requestedById: po.requestedById,
      purpose: `Payment for PO #${po.poNumber}`,
      reviewerId: po.reviewedById,
      approverId: po.approvedById,
    }, session);

    return NextResponse.json(pr, { status: 201 });
  } catch (error) {
    console.error("Error converting PO to PR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

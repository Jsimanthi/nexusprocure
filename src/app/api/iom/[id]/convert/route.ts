// src/app/api/iom/[id]/convert/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { getIOMById } from "@/lib/iom";
import { createPurchaseOrder } from "@/lib/po";
import { prisma } from "@/lib/prisma";

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

    const body = await request.json();
    
    // Get the IOM to convert
    const iom = await getIOMById(id);
    
    if (!iom) {
      return NextResponse.json({ error: "IOM not found" }, { status: 404 });
    }

    // Validate that IOM is approved
    if (iom.status !== 'APPROVED') {
      return NextResponse.json(
        { error: "IOM must be approved before converting to PO" },
        { status: 400 }
      );
    }

    // Check if a PO already exists for this IOM
    const existingPo = await prisma.purchaseOrder.findFirst({
      where: { iomId: id },
    });

    if (existingPo) {
      return NextResponse.json(
        { error: "A Purchase Order has already been created for this IOM." },
        { status: 409 }
      );
    }

    // Validate required fields for PO
    if (!body.vendorName || !body.vendorAddress || !body.vendorContact || 
        !body.companyName || !body.companyAddress || !body.companyContact) {
      return NextResponse.json(
        { error: "Missing required vendor/company details" },
        { status: 400 }
      );
    }

    // Convert IOM items to PO items
    const poItems = iom.items.map(item => ({
      itemName: item.itemName,
      description: item.description || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: body.taxRate || 0,
    }));

    const po = await createPurchaseOrder({
      title: `PO for ${iom.title}`,
      iomId: iom.id,
      vendorId: body.vendorId,
      companyName: body.companyName,
      companyAddress: body.companyAddress,
      companyContact: body.companyContact,
      vendorName: body.vendorName,
      vendorAddress: body.vendorAddress,
      vendorContact: body.vendorContact,
      taxRate: body.taxRate || 0,
      items: poItems,
      preparedById: session.user.id,
      requestedById: iom.requestedById,
    }, session); // <-- Add session as second argument

    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    console.error("Error converting IOM to PO:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
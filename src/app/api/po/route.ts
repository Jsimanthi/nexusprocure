// src/app/api/po/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { createPurchaseOrder, getPOsByUser, getVendors, createVendor } from "@/lib/po";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pos = await getPOsByUser(session.user.id);
    return NextResponse.json(pos);
  } catch (error) {
    console.error("Error fetching POs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.companyName || !body.companyAddress || !body.companyContact || 
        !body.vendorName || !body.vendorAddress || !body.vendorContact || !body.items) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const po = await createPurchaseOrder({
      title: body.title,
      iomId: body.iomId,
      vendorId: body.vendorId,
      companyName: body.companyName,
      companyAddress: body.companyAddress,
      companyContact: body.companyContact,
      vendorName: body.vendorName,
      vendorAddress: body.vendorAddress,
      vendorContact: body.vendorContact,
      taxRate: body.taxRate || 0,
      items: body.items,
      preparedById: session.user.id,
      requestedById: body.requestedById || session.user.id,
    });

    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    console.error("Error creating PO:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
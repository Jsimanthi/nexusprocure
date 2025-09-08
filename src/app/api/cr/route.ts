// src/app/api/cr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { createCheckRequest, getCRsByUser, getPOsForCR } from "@/lib/cr";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const crs = await getCRsByUser(session.user.id);
    return NextResponse.json(crs);
  } catch (error) {
    console.error("Error fetching CRs:", error);
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
    if (!body.title || !body.paymentTo || !body.paymentDate || !body.purpose || 
        !body.paymentMethod || !body.totalAmount || !body.taxAmount || !body.grandTotal) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const cr = await createCheckRequest({
      title: body.title,
      poId: body.poId,
      paymentTo: body.paymentTo,
      paymentDate: new Date(body.paymentDate),
      purpose: body.purpose,
      paymentMethod: body.paymentMethod,
      bankAccount: body.bankAccount,
      referenceNumber: body.referenceNumber,
      totalAmount: body.totalAmount,
      taxAmount: body.taxAmount,
      grandTotal: body.grandTotal,
      preparedById: session.user.id,
      requestedById: body.requestedById || session.user.id,
    });

    return NextResponse.json(cr, { status: 201 });
  } catch (error) {
    console.error("Error creating CR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
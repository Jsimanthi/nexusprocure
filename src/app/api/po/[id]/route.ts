// src/app/api/po/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { getPOById, updatePOStatus } from "@/lib/po";
import { POStatus } from "@/types/po";

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const po = await getPOById(params.id);
    
    if (!po) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
    }

    // Check if user has access to this PO
    const hasAccess = [
      po.preparedById,
      po.requestedById,
      po.reviewedById,
      po.approvedById
    ].includes(session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(po);
  } catch (error) {
    console.error("Error fetching PO:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    if (!body.status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = Object.values(POStatus);
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const po = await updatePOStatus(params.id, body.status, session.user.id);
    
    if (!po) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
    }

    return NextResponse.json(po);
  } catch (error) {
    console.error("Error updating PO:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
// src/app/api/po/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { getPOById, updatePOStatus } from "@/lib/po";
import { POStatus } from "@/types/po";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const po = await getPOById(id);
    
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

export async function PATCH(
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
    const { status, approverId } = body;

    if (!status && !approverId) {
      return NextResponse.json(
        { error: "At least one of status or approverId is required" },
        { status: 400 }
      );
    }

    if (status) {
      const validStatuses = Object.values(POStatus);
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }
    }

    const po = await updatePOStatus(id, status, session, approverId);
    
    if (!po) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
    }

    return NextResponse.json(po);
  } catch (error) {
    console.error("Error updating PO:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
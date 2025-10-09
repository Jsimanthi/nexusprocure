// src/app/api/po/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getPOById, updatePOStatus, updatePODetails } from "@/lib/po";
import { authorize } from "@/lib/auth-utils";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use the authorize utility to check for READ_PO permission
    authorize(session, 'READ_PO');

    const po = await getPOById(id);
    
    if (!po) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
    }

    return NextResponse.json(po);
  } catch (error) {
    console.error("Error fetching PO:", error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
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
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, qualityScore, deliveryNotes } = body;

    if (action) {
      const validActions = ["APPROVE", "REJECT", "ORDER", "DELIVER", "CANCEL"];
      if (!validActions.includes(action)) {
        return NextResponse.json(
          { error: "Invalid action provided." },
          { status: 400 }
        );
      }
      const po = await updatePOStatus(id, action as "APPROVE" | "REJECT" | "ORDER" | "DELIVER" | "CANCEL", session);
      return NextResponse.json(po);
    } else {
      const po = await updatePODetails(id, { qualityScore, deliveryNotes }, session);
      return NextResponse.json(po);
    }
  } catch (error) {
    console.error("Error updating PO:", error);
    if (error instanceof Error) {
      if (error.message.includes('Not authorized')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
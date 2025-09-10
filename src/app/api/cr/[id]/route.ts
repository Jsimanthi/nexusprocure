// src/app/api/cr/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { getCRById, updateCRStatus } from "@/lib/cr";
import { CRStatus } from "@/types/cr";

// Corrected GET handler function signature
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

    const cr = await getCRById(id);

    if (!cr) {
      return NextResponse.json({ error: "CR not found" }, { status: 404 });
    }

    // Check if user has access to this CR
    const hasAccess = [
      cr.preparedById,
      cr.requestedById,
      cr.reviewedById,
      cr.approvedById,
    ].includes(session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(cr);
  } catch (error) {
    console.error("Error fetching CR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Corrected PATCH handler function signature
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

    if (!body.status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = Object.values(CRStatus);
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const cr = await updateCRStatus(id, body.status, session);

    if (!cr) {
      return NextResponse.json({ error: "CR not found" }, { status: 404 });
    }

    return NextResponse.json(cr);
  } catch (error) {
    console.error("Error updating CR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
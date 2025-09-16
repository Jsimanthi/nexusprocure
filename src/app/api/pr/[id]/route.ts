// src/app/api/pr/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { authorize } from "@/lib/auth-utils"; // Make sure to import authorize
import { getPRById, updatePRStatus } from "@/lib/pr";
import { PRStatus } from "@/types/pr";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id:string }> }
) {
  const { id } = await context.params;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // This single line replaces the old manual check
    authorize(session, 'READ_PR');

    const pr = await getPRById(id);

    if (!pr) {
      return NextResponse.json({ error: "PR not found" }, { status: 404 });
    }

    return NextResponse.json(pr);
  } catch (error) {
    console.error("Error fetching PR:", error);
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
      const validStatuses = Object.values(PRStatus);
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }
    }

    const pr = await updatePRStatus(id, status, session, approverId);

    if (!pr) {
      return NextResponse.json({ error: "Payment Request not found" }, { status: 404 });
    }

    return NextResponse.json(pr);
  } catch (error) {
    console.error("Error updating PR:", error);
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
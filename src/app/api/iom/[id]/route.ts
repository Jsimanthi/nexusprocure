// src/app/api/iom/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { getIOMById, updateIOMStatus } from "@/lib/iom";
import { IOMStatus } from "@/types/iom";

// Type definition for route context parameters for clarity.
interface RouteParams {
  params: { id: string };
}

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

    const iom = await getIOMById(id);
    
    if (!iom) {
      return NextResponse.json({ error: "IOM not found" }, { status: 404 });
    }

    // Check if user has access to this IOM
    const hasAccess = [
      iom.preparedById,
      iom.requestedById,
      iom.reviewedById,
      iom.approvedById
    ].includes(session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(iom);
  } catch (error) {
    console.error("Error fetching IOM:", error);
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
      const validStatuses = Object.values(IOMStatus);
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }
    }

    const iom = await updateIOMStatus(id, status, session, approverId);
    
    if (!iom) {
      return NextResponse.json({ error: "IOM not found" }, { status: 404 });
    }

    return NextResponse.json(iom);
  } catch (error) {
    console.error("Error updating IOM:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
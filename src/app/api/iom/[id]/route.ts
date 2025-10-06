// src/app/api/iom/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getIOMById, updateIOMStatus } from "@/lib/iom";
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

    // Use the authorize utility to check for READ_IOM permission
    authorize(session, 'READ_IOM');

    const iom = await getIOMById(id);
    
    if (!iom) {
      return NextResponse.json({ error: "IOM not found" }, { status: 404 });
    }

    return NextResponse.json(iom);
  } catch (error) {
    console.error("Error fetching IOM:", error);
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
    const { action } = body;

    const validActions = ["APPROVE", "REJECT", "COMPLETE"];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: "Invalid action provided." },
        { status: 400 }
      );
    }

    const iom = await updateIOMStatus(id, action, session);
    
    if (!iom) {
      return NextResponse.json({ error: "IOM not found" }, { status: 404 });
    }

    return NextResponse.json(iom);
  } catch (error) {
    console.error("Error updating IOM:", error);
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
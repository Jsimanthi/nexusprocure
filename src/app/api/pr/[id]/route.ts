// src/app/api/pr/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { authorize } from "@/lib/auth-utils"; // Make sure to import authorize
import { getPRById } from "@/lib/pr";

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;

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
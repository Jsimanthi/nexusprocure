// src/app/api/po/public/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPublicPOById } from "@/lib/po";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const po = await getPublicPOById(id);

    if (!po) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
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
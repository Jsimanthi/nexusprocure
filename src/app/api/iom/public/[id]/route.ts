// src/app/api/iom/public/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getIOMById } from "@/lib/iom";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id:string }> }
) {
  const { id } = await context.params;

  try {
    const iom = await getIOMById(id);

    if (!iom) {
      return NextResponse.json({ error: "IOM not found" }, { status: 404 });
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
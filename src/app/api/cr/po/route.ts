// src/app/api/cr/po/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { getPOsForCR } from "@/lib/cr";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pos = await getPOsForCR();
    return NextResponse.json(pos);
  } catch (error) {
    console.error("Error fetching POs for CR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
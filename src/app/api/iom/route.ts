import { NextRequest, NextResponse } from "next/server";
import { getIOMs } from "@/lib/iom";
import { auth } from "@/lib/auth-config";
import { getIOMsSchema } from "@/lib/schemas";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { page, pageSize, search, status } = getIOMsSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const ioms = await getIOMs({
      page,
      pageSize,
      search,
      status: status || [],
      session,
    });
    return NextResponse.json(ioms);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error fetching IOMs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
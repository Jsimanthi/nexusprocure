import { NextRequest, NextResponse } from "next/server";
import { getIOMs, createIOM } from "@/lib/iom";
import { auth } from "@/lib/auth-config";
import { getIOMsSchema, createIomSchema } from "@/lib/schemas";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const iomData = createIomSchema.parse(data);

    const newIom = await createIOM(
      { ...iomData, preparedById: session.user.id },
      session
    );

    return NextResponse.json(newIom, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error creating IOM:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { page, pageSize, search, status } = getIOMsSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const { ioms, total } = await getIOMs({
      page,
      pageSize,
      search,
      status: status || [],
      session,
    });
    return NextResponse.json({ ioms, total });
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
import { authOptions } from "@/lib/auth";
import { createIOM, getIOMs } from "@/lib/iom";
import logger from "@/lib/logger";
import { createIomSchema, getIOMsSchema } from "@/lib/schemas";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
    logger.error({ error }, "Error creating IOM");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
    logger.error({ error }, "Error fetching IOMs");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
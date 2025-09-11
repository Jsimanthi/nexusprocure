// src/app/api/iom/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { createIOM, getIOMs } from "@/lib/iom";
// FIX: Correct the schema import name
import { createIomSchema } from "@/lib/schemas";
import { fromZodError } from "zod-validation-error";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const { ioms, total } = await getIOMs(session, {
      page,
      pageSize,
      search,
      status,
    });

    return NextResponse.json({
      data: ioms,
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching IOMs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    
    // FIX: Use the correct schema name
    const validation = createIomSchema.safeParse(body);
    if (!validation.success) {
      // FIX: Return a more descriptive validation error
      return NextResponse.json(
        { error: fromZodError(validation.error).message },
        { status: 400 }
      );
    }
    
    const iomData = {
      ...validation.data,
      preparedById: session.user.id,
      requestedById: session.user.id,
    };
    
    // FIX: Pass the session as the second argument to createIOM
    const iom = await createIOM(iomData, session);

    return NextResponse.json(iom, { status: 201 });
  } catch (error) {
    console.error("Error creating IOM:", error);
    // FIX: Add more specific error handling for Prisma errors
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json({ error: "An IOM with this number already exists." }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
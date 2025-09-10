// src/app/api/cr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { createCheckRequest, getCRsByUser } from "@/lib/cr";
import { createCrSchema } from "@/lib/schemas";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { fromZodError } from "zod-validation-error";


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

    const { checkRequests, total } = await getCRsByUser(session.user.id, {
      page,
      pageSize,
      search,
      status,
    });

    return NextResponse.json({
      data: checkRequests,
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching CRs:", error);
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
    const validation = createCrSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: fromZodError(validation.error).message },
        { status: 400 }
      );
    }
    
    const crData = {
      ...validation.data,
      preparedById: session.user.id,
    };
    
    // FIX: Pass the full data object and the session object as separate arguments.
    // The previous code had the `preparedById` addition inside the function call, which may have confused TypeScript.
    const cr = await createCheckRequest(crData, session);

    return NextResponse.json(cr, { status: 201 });
  } catch (error) {
    console.error("Error creating CR:", error);
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json({ error: "A check request with this number already exists." }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
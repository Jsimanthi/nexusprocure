// src/app/api/iom/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { createIOM, getIOMsByUser } from "@/lib/iom";
import { createIomSchema } from "@/lib/schemas";

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

    const { ioms, total } = await getIOMsByUser(session.user.id, {
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
    const validation = createIomSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    // Set both preparedBy and requestedBy from the session user ID
    const iom = await createIOM({
      ...validation.data,
      preparedById: session.user.id,
      requestedById: session.user.id, // [!code ++]
    });

    return NextResponse.json(iom, { status: 201 });
  } catch (error) {
    console.error("Error creating IOM:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
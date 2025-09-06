// src/app/api/iom/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { createIOM, getIOMsByUser } from "@/lib/iom";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ioms = await getIOMsByUser(session.user.id);
    return NextResponse.json(ioms);
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
    
    // Validate required fields
    if (!body.title || !body.from || !body.to || !body.subject || !body.items) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const iom = await createIOM({
      title: body.title,
      from: body.from,
      to: body.to,
      subject: body.subject,
      content: body.content,
      items: body.items,
      preparedById: session.user.id,
      requestedById: body.requestedById || session.user.id,
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
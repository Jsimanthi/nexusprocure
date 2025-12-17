// src/app/api/pr/route.ts
import { authOptions } from "@/lib/auth";
import { createPaymentRequest, getPRs } from "@/lib/pr";
import { createPrSchema } from "@/lib/schemas";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { fromZodError } from "zod-validation-error";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const { paymentRequests, total } = await getPRs(session, {
      page,
      pageSize,
      search,
      status,
    });

    return NextResponse.json({ paymentRequests, total });
  } catch (error) {
    console.error("Error fetching PRs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createPrSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: fromZodError(validation.error).message },
        { status: 400 }
      );
    }

    const prData = {
      ...validation.data,
      preparedById: session.user.id,
    };

    const pr = await createPaymentRequest(prData, session);

    return NextResponse.json(pr, { status: 201 });
  } catch (error) {
    console.error("Error creating PR:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: "A payment request with this number already exists." }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
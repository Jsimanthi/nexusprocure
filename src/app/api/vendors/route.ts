// src/app/api/vendors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getVendors, createVendor } from "@/lib/vendor";
import { createVendorSchema } from "@/lib/schemas";
import { Prisma } from "@prisma/client";
import { fromZodError } from "zod-validation-error";
import logger from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    const { vendors, total } = await getVendors({ page, pageSize });

    return NextResponse.json({
      data: vendors,
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    });
  } catch (error) {
    logger.error(`Error fetching vendors: ${String(error)}`);
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
    const validation = createVendorSchema.safeParse(body);

    if (!validation.success) {
      // Return a more descriptive validation error
      return NextResponse.json(
        { error: fromZodError(validation.error).message },
        { status: 400 }
      );
    }

    // FIX: Pass the session as the second argument to createVendor
    const vendor = await createVendor(validation.data, session);

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    logger.error(`Error creating vendor: ${String(error)}`);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json({ error: "A vendor with this email or name already exists." }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
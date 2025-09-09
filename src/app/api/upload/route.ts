import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth-server";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename || !request.body) {
    return NextResponse.json(
      { error: "Missing filename or request body" },
      { status: 400 }
    );
  }

  // The Vercel Blob SDK automatically handles streaming the request body.
  const blob = await put(filename, request.body, {
    access: 'public',
  });

  return NextResponse.json(blob);
}

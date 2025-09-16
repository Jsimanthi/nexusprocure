import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { markNotificationAsRead } from "@/lib/notification";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notification = await markNotificationAsRead(id, session.user.id);
    return NextResponse.json(notification);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

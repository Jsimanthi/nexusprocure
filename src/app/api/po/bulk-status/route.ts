import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { updatePOStatus } from "@/lib/po";
import { POStatus } from "@/types/po";
import { z } from "zod";

const bulkStatusUpdateSchema = z.object({
  poIds: z.array(z.string().cuid()).min(1, "At least one PO ID is required."),
  status: z.nativeEnum(POStatus),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = bulkStatusUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { poIds, status } = validation.data;
    const results = [];

    // This should ideally be a background job for large numbers of updates.
    // Processing sequentially here for simplicity.
    for (const poId of poIds) {
      try {
        // We assume the user has permission to update these.
        // A more robust check would verify ownership of each PO.
        const updatedPo = await updatePOStatus(poId, status, session);
        results.push({ id: poId, success: true, data: updatedPo });
      } catch (error) {
        console.error(`Failed to update PO ${poId}:`, error);
        results.push({ id: poId, success: false, error: (error as Error).message });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error in bulk status update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

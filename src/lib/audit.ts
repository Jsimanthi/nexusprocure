import { prisma } from "./prisma";
import { User } from "@prisma/client";

interface AuditLogData {
  model: string;
  recordId: string;
  userId: string;
  userName: string;
  changes: object;
}

export async function logAudit(
  action: "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE",
  data: AuditLogData
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        model: data.model,
        recordId: data.recordId,
        userId: data.userId,
        userName: data.userName,
        changes: data.changes,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Audit logging should not block the main operation
  }
}

// Helper to get user from session for logging
export const getAuditUser = (session: { user: { id: string, name?: string | null } } | null) => {
  if (!session?.user) {
    // This should ideally not happen if called from authenticated routes
    return { userId: 'system', userName: 'System' };
  }
  return {
    userId: session.user.id,
    userName: session.user.name || 'Unknown User',
  };
};

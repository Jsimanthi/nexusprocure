import { prisma } from "./prisma";
import { Prisma, PrismaClient } from "@prisma/client";

type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

interface AuditLogData {
  model: string;
  recordId: string;
  userId: string;
  userName: string;
  changes: object;
}

export async function logAudit(
  action: "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE",
  data: AuditLogData,
  tx?: PrismaTransactionClient
) {
  const db = tx || prisma;
  try {
    await db.auditLog.create({
      data: {
        action,
        model: data.model,
        recordId: data.recordId,
        userId: data.userId,
        userName: data.userName,
        changes: JSON.stringify(data.changes),
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // In a real-world scenario, you might want to handle this more gracefully
    // For now, we let the transaction fail if the audit log fails.
    throw error;
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
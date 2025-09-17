// src/lib/iom.ts
import { prisma } from "./prisma";
import { IOMStatus } from "@/types/iom";
import { z } from "zod";
import { createNotification } from "./notification";
import { sendEmail } from "./email";
import { StatusUpdateEmail } from "@/components/emails/StatusUpdateEmail";
import { createIomSchema } from "./schemas";
import * as React from "react";
import { Session } from "next-auth";
import { authorize } from "./auth-utils";
import { logAudit, getAuditUser } from "./audit";
import { Prisma } from "@prisma/client";
import { triggerPusherEvent } from "./pusher";

export async function generateIOMNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.iOM.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  return `IOM-${year}-${(count + 1).toString().padStart(4, '0')}`;
}

interface GetIOMsParams {
  session: Session;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string[];
}

export async function getIOMs(
  {
    session,
    page = 1,
    pageSize = 10,
    search = "",
    status = [],
  }: GetIOMsParams
) {
  // Check if the session and user are valid before proceeding
  if (!session || !session.user) {
    throw new Error("Authentication failed: No user session found.");
  }
  const user = session.user; // User object from session already has id and permissions
  const userPermissions = user.permissions || [];

  const where: Prisma.IOMWhereInput = {
    AND: [],
  };

  // If user does not have permission to see all IOMs, filter by their involvement.
  if (!userPermissions.includes('READ_ALL_IOMS')) {
    (where.AND as Prisma.IOMWhereInput[]).push({
      OR: [
        { preparedById: user.id },
        { requestedById: user.id },
        { reviewedById: user.id },
        { approvedById: user.id },
      ],
    });
  }
  // If they have the permission, no user-based filter is added, so they see all.

  if (status && status.length > 0) {
    (where.AND as Prisma.IOMWhereInput[]).push({ status: { in: status as IOMStatus[] } });
  }

  if (search) {
    (where.AND as Prisma.IOMWhereInput[]).push({
      OR: [
        { iomNumber: { contains: search } },
        { title: { contains: search } },
        { subject: { contains: search } },
        { from: { contains: search } },
        { to: { contains: search } },
      ],
    });
  }

  const [ioms, total] = await prisma.$transaction([
    prisma.iOM.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        items: true,
        preparedBy: {
          select: { name: true, email: true },
        },
        requestedBy: {
          select: { name: true, email: true },
        },
        reviewedBy: {
          select: { name: true, email: true },
        },
        approvedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.iOM.count({ where }),
  ]);

  return { ioms, total };
}

export async function getIOMById(id: string) {
  return await prisma.iOM.findUnique({
    where: { id },
    include: {
      items: true,
      preparedBy: {
        select: { name: true, email: true }
      },
      requestedBy: {
        select: { name: true, email: true }
      },
      reviewedBy: {
        select: { name: true, email: true }
      },
      approvedBy: {
        select: { name: true, email: true }
      },
    }
  });
}

type CreateIomData = z.infer<typeof createIomSchema> & {
  preparedById: string;
};

export async function createIOM(data: CreateIomData, session: Session) {
  authorize(session, 'CREATE_IOM');
  const { items, ...restOfData } = data;
  const { reviewerId, approverId, ...actualRest } = restOfData;
  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const maxRetries = 3;
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    const iomNumber = await generateIOMNumber();
    const iomData = {
      ...actualRest,
      iomNumber,
      totalAmount,
      reviewedById: reviewerId,
      approvedById: approverId,
      status: IOMStatus.PENDING_APPROVAL,
      items: {
        create: items.map(item => ({
          ...item,
          totalPrice: item.quantity * item.unitPrice,
        })),
      },
    };

    try {
      const createdIom = await prisma.iOM.create({
        data: iomData,
        include: {
          items: true,
          preparedBy: {
            select: { name: true, email: true }
          },
          requestedBy: {
            select: { name: true, email: true }
          },
          reviewedBy: {
            select: { name: true, email: true }
          },
          approvedBy: {
            select: { name: true, email: true }
          },
        }
      });

      const auditUser = getAuditUser(session);
      await logAudit("CREATE", {
        model: "IOM",
        recordId: createdIom.id,
        userId: auditUser.userId,
        userName: auditUser.userName,
        changes: createdIom,
      });

      return createdIom;
    } catch (error) {
      lastError = error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        console.warn(`Unique constraint violation for IOM number. Retrying... (${i + 1}/${maxRetries})`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed to create IOM after ${maxRetries} attempts. Last error: ${lastError}`);
}

export async function updateIOMStatus(
  id: string,
  action: "APPROVE" | "REJECT" | "COMPLETE",
  session: Session
) {
  const userId = session.user.id;
  if (!userId) {
    throw new Error("User not found in session");
  }

  // Handle simple status changes first
  if (action === "COMPLETE") {
    authorize(session, "COMPLETE_IOM");
    return await prisma.iOM.update({
      where: { id },
      data: { status: IOMStatus.COMPLETED },
    });
  }

  const iom = await prisma.iOM.findUnique({
    where: { id },
    select: {
      preparedById: true,
      reviewedById: true,
      approvedById: true,
      iomNumber: true,
      status: true,
      reviewerStatus: true,
      approverStatus: true,
      preparedBy: { select: { name: true, email: true } },
    },
  });

  if (!iom) throw new Error("IOM not found.");
  if (!iom.preparedBy) throw new Error("IOM originator not found.");

  const isReviewer = userId === iom.reviewedById;
  const isApprover = userId === iom.approvedById;

  if (!isReviewer && !isApprover) {
    throw new Error("Not authorized to perform this action on this IOM.");
  }

  const newActionStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
  const updateData: Partial<Prisma.IOMUpdateInput> = {};

  if (isReviewer) {
    authorize(session, 'REVIEW_IOM');
    updateData.reviewerStatus = newActionStatus;
  }

  if (isApprover) {
    authorize(session, 'APPROVE_IOM');
    updateData.approverStatus = newActionStatus;
  }

  const updatedSubStatusIom = await prisma.iOM.update({
    where: { id },
    data: updateData,
  });

  // Calculate overall status
  const { reviewerStatus, approverStatus } = updatedSubStatusIom;
  let finalStatus: IOMStatus = IOMStatus.PENDING_APPROVAL;

  if (approverStatus === "APPROVED") {
    finalStatus = IOMStatus.APPROVED;
  } else if (approverStatus === "REJECTED" || reviewerStatus === "REJECTED") {
    finalStatus = IOMStatus.REJECTED;
  }

  const finalUpdate = await prisma.iOM.update({
    where: { id },
    data: { status: finalStatus },
    include: {
      items: true,
      preparedBy: { select: { name: true, email: true } },
      requestedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
    },
  });

  // Notifications and Audit Logging
  const message = `IOM ${iom.iomNumber} has been ${action.toLowerCase()}d by ${session.user.name}. New status: ${finalStatus}.`;

  // Notify creator
  await createNotification(iom.preparedById, message);

  // Notify the other party (reviewer or approver)
  const otherPartyId = isReviewer ? iom.approvedById : iom.reviewedById;
  if (otherPartyId) {
    await createNotification(otherPartyId, `Your action is requested on IOM ${iom.iomNumber}. It was ${action.toLowerCase()}d by ${session.user.name}.`);
  }

  const emailComponent = React.createElement(StatusUpdateEmail, {
    userName: iom.preparedBy.name || 'User',
    documentType: 'IOM',
    documentNumber: iom.iomNumber,
    newStatus: finalStatus,
  });

  await sendEmail({
    to: iom.preparedBy.email,
    subject: `Status Update for IOM: ${iom.iomNumber}`,
    react: emailComponent,
  });

  const auditUser = getAuditUser(session);
  await logAudit("UPDATE", {
    model: "IOM",
    recordId: id,
    userId: auditUser.userId,
    userName: auditUser.userName,
    changes: {
      from: { status: iom.status, reviewerStatus: iom.reviewerStatus, approverStatus: iom.approverStatus },
      to: { status: finalStatus, reviewerStatus, approverStatus },
    },
  });

  await triggerPusherEvent("dashboard-channel", "dashboard-update", {});

  return finalUpdate;
}

export async function deleteIOM(id: string, session: Session) {
  authorize(session, 'DELETE_IOM');
  const iomToDelete = await prisma.iOM.findUnique({ where: { id } });

  if (iomToDelete) {
    const auditUser = getAuditUser(session);
    await logAudit("DELETE", {
      model: "IOM",
      recordId: id,
      userId: auditUser.userId,
      userName: auditUser.userName,
      changes: iomToDelete,
    });
  }

  return await prisma.iOM.delete({
    where: { id },
  });
}

export async function getIOMsByStatus(status: IOMStatus) {
  return await prisma.iOM.findMany({
    where: { status },
    include: {
      items: true,
      preparedBy: { select: { name: true, email: true } },
      requestedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' }
  });
}
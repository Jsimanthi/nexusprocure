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
  const user = session.user as { id: string; role?: { name: string } };

  if (!user.role?.name) {
    throw new Error("User role not found in session.");
  }

  const where: Prisma.IOMWhereInput = {
    AND: [],
  };

  if (user.role.name === "ADMIN") {
    // Admin sees all IOMs
  } else if (user.role.name === "MANAGER") {
    (where.AND as Prisma.IOMWhereInput[]).push({
      OR: [{ approvedById: user.id }, { preparedById: user.id }],
    });
  } else if (user.role.name === "REVIEWER") {
    (where.AND as Prisma.IOMWhereInput[]).push({
      OR: [{ reviewedById: user.id }, { preparedById: user.id }],
    });
  } else {
    // Regular user sees only their own IOMs
    (where.AND as Prisma.IOMWhereInput[]).push({ preparedById: user.id });
  }

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
  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const maxRetries = 3;
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    const iomNumber = await generateIOMNumber();
    const iomData = {
      ...restOfData,
      iomNumber,
      totalAmount,
      status: IOMStatus.DRAFT,
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
  status: IOMStatus | undefined,
  session: Session,
  approverId?: string
) {
  if (!status && !approverId) {
    throw new Error("Either status or approverId must be provided.");
  }

  // Authorize based on action
  if (status) {
    switch (status) {
      case IOMStatus.APPROVED:
        authorize(session, "APPROVE_IOM");
        break;
      case IOMStatus.REJECTED:
        authorize(session, "REJECT_IOM");
        break;
      case IOMStatus.UNDER_REVIEW:
        authorize(session, "REVIEW_IOM");
        break;
      case IOMStatus.PENDING_APPROVAL:
        authorize(session, "REVIEW_IOM");
        break;
      default:
        authorize(session, "UPDATE_IOM");
        break;
    }
  } else {
    // If only approverId is provided, it's an update action
    authorize(session, "UPDATE_IOM");
  }

  interface UpdateData {
    status?: IOMStatus;
    reviewedById?: string | null;
    approvedById?: string | null;
  }

  const updateData: UpdateData = {};
  const userId = session.user.id;

  if (status) {
    updateData.status = status;
    switch (status) {
      case IOMStatus.DRAFT: // Withdrawing
        updateData.reviewedById = null;
        updateData.approvedById = null;
        break;
      case IOMStatus.UNDER_REVIEW: // Starting review
        updateData.reviewedById = userId;
        break;
      case IOMStatus.PENDING_APPROVAL: // Submitting for approval
        if (!approverId) {
          throw new Error("Approver ID is required when moving to PENDING_APPROVAL");
        }
        updateData.approvedById = approverId;
        break;
      case IOMStatus.APPROVED: // Approving
        updateData.approvedById = userId;
        break;
    }
  } else if (approverId) {
    // This case should not be used anymore, but we keep it for safety.
    // The new flow always sets a status when assigning an approver.
    updateData.approvedById = approverId;
  }

  const iom = await prisma.iOM.findUnique({
    where: { id },
    select: {
      preparedById: true,
      reviewedById: true,
      approvedById: true,
      iomNumber: true,
      status: true,
      preparedBy: {
        select: { name: true, email: true }
      }
    },
  });

  if (!iom || !iom.preparedBy) {
    throw new Error("IOM or originator not found.");
  }

  const updatedIom = await prisma.iOM.update({
    where: { id },
    data: updateData,
    include: {
      items: true,
      preparedBy: { select: { name: true, email: true } },
      requestedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
    }
  });

  if (status) {
    const message = `The status of IOM ${iom.iomNumber} has been updated to ${status}.`;
    // Notify the creator
    await createNotification(iom.preparedById, message);

    // Notify other relevant parties
    switch (status) {
      case IOMStatus.SUBMITTED:
        if (updatedIom.reviewedById) {
          await createNotification(updatedIom.reviewedById, `An IOM ${iom.iomNumber} has been submitted for your review.`);
        }
        break;
      case IOMStatus.PENDING_APPROVAL:
        if (updatedIom.approvedById) {
          await createNotification(updatedIom.approvedById, `An IOM ${iom.iomNumber} is pending your approval.`);
        }
        break;
      case IOMStatus.APPROVED:
      case IOMStatus.REJECTED:
        if (iom.reviewedById) {
          await createNotification(iom.reviewedById, `The IOM ${iom.iomNumber} you reviewed has been ${status.toLowerCase()}.`);
        }
        break;
    }

    const emailComponent = React.createElement(StatusUpdateEmail, {
      userName: iom.preparedBy.name || 'User',
      documentType: 'IOM',
      documentNumber: iom.iomNumber,
      newStatus: status,
    });

    await sendEmail({
      to: iom.preparedBy.email,
      subject: `Status Update for IOM: ${iom.iomNumber}`,
      react: emailComponent,
    });
  }

  const auditUser = getAuditUser(session);
  await logAudit("UPDATE", {
    model: "IOM",
    recordId: id,
    userId: auditUser.userId,
    userName: auditUser.userName,
    changes: {
      from: { status: iom.status },
      to: { status, approverId },
    },
  });

  // Trigger a dashboard update
  await triggerPusherEvent("dashboard-channel", "dashboard-update", {});

  return updatedIom;
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
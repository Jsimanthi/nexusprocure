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

export async function getIOMs(
  session: Session,
  {
    page = 1,
    pageSize = 10,
    search = "",
    status = "",
  }: { page?: number; pageSize?: number; search?: string; status?: string }
) {
  const user = session.user as unknown as {
    id: string;
    role: { name: string };
  };
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

  if (status) {
    const statuses = status.split(',') as IOMStatus[];
    if (statuses.length > 0) {
      (where.AND as Prisma.IOMWhereInput[]).push({ status: { in: statuses } });
    }
  }

  if (search) {
    (where.AND as Prisma.IOMWhereInput[]).push({
      OR: [
        { iomNumber: { contains: search } }, // Removed mode: 'insensitive'
        { title: { contains: search } }, // Removed mode: 'insensitive'
        { subject: { contains: search } }, // Removed mode: 'insensitive'
        { from: { contains: search } }, // Removed mode: 'insensitive'
        { to: { contains: search } }, // Removed mode: 'insensitive'
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

export async function updateIOMStatus(id: string, status: IOMStatus, session: Session) {
  // Different permissions are required for different status updates
  switch (status) {
    case IOMStatus.APPROVED:
      authorize(session, 'APPROVE_IOM');
      break;
    case IOMStatus.REJECTED:
      authorize(session, 'REJECT_IOM');
      break;
    default:
      authorize(session, 'UPDATE_IOM');
      break;
  }
  
  // Use a more specific type instead of 'any'
  interface UpdateData {
    status: IOMStatus;
    reviewedById?: string;
    approvedById?: string;
  }
  
  const updateData: UpdateData = { status };
  const userId = session.user.id;

  const iom = await prisma.iOM.findUnique({
    where: { id },
    select: {
      preparedById: true,
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

  if (status === IOMStatus.UNDER_REVIEW) {
    updateData.reviewedById = userId;
  } else if (status === IOMStatus.APPROVED) {
    updateData.approvedById = userId;
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

  const message = `The status of your IOM ${iom.iomNumber} has been updated to ${status}.`;
  await createNotification(iom.preparedById, message);

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

  const auditUser = getAuditUser(session);
  await logAudit("STATUS_CHANGE", {
    model: "IOM",
    recordId: id,
    userId: auditUser.userId,
    userName: auditUser.userName,
    changes: {
      from: iom.status,
      to: status,
    },
  });

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
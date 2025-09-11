// src/lib/cr.ts
import { prisma } from "./prisma";
import { CRStatus } from "@/types/cr";
import { z } from "zod";
import { createNotification } from "./notification";
import { sendEmail } from "./email";
import { StatusUpdateEmail } from "@/components/emails/StatusUpdateEmail";
import { createCrSchema } from "./schemas";
import * as React from "react";
import { Session } from "next-auth";
import { authorize } from "./auth-utils";
import { logAudit, getAuditUser } from "./audit";
import { Prisma } from "@prisma/client";

export async function generateCRNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.checkRequest.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  return `CR-${year}-${(count + 1).toString().padStart(4, '0')}`;
}

export async function getCRs(
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
  const where: Prisma.CheckRequestWhereInput = {
    AND: [],
  };

  if (user.role.name === "ADMIN") {
    // Admin sees all CRs
  } else if (user.role.name === "MANAGER") {
    (where.AND as Prisma.CheckRequestWhereInput[]).push({
      OR: [{ approvedById: user.id }, { preparedById: user.id }],
    });
  } else if (user.role.name === "REVIEWER") {
    (where.AND as Prisma.CheckRequestWhereInput[]).push({
      OR: [{ reviewedById: user.id }, { preparedById: user.id }],
    });
  } else {
    // Regular user sees only their own CRs
    (where.AND as Prisma.CheckRequestWhereInput[]).push({
      preparedById: user.id,
    });
  }

  if (status) {
    const statuses = status.split(',') as CRStatus[];
    if (statuses.length > 0) {
      (where.AND as Prisma.CheckRequestWhereInput[]).push({ status: { in: statuses } });
    }
  }

  if (search) {
    (where.AND as Prisma.CheckRequestWhereInput[]).push({
      OR: [
        { crNumber: { contains: search } },
        { title: { contains: search } },
        { paymentTo: { contains: search } },
        { purpose: { contains: search } },
        { po: { poNumber: { contains: search } } },
      ],
    });
  }

  const [checkRequests, total] = await prisma.$transaction([
    prisma.checkRequest.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      // FIX: Add this 'include' to fetch the related PO data
      include: {
        po: {
          select: {
            poNumber: true,
          },
        },
        preparedBy: { select: { name: true, email: true } },
        requestedBy: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } },
        approvedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.checkRequest.count({ where }),
  ]);

  return { checkRequests, total };
}

export async function getCRById(id: string) {
  return await prisma.checkRequest.findUnique({
    where: { id },
    include: {
      po: {
        include: {
          vendor: true,
          items: true
        }
      },
      preparedBy: { select: { name: true, email: true } },
      requestedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
    }
  });
}

export async function getPOsForCR() {
  return await prisma.purchaseOrder.findMany({
    where: {
      status: {
        in: ['APPROVED', 'ORDERED', 'DELIVERED']
      }
    },
    include: {
      vendor: true,
      items: true
    },
    orderBy: { createdAt: 'desc' }
  });
}

type CreateCrData = z.infer<typeof createCrSchema> & {
  preparedById: string;
};

export async function createCheckRequest(data: CreateCrData, session: Session) {
  authorize(session, 'CREATE_CR');
  if (data.poId) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: data.poId },
      select: { grandTotal: true },
    });
    if (!po) {
      throw new Error("Associated Purchase Order not found.");
    }
    if (data.grandTotal > po.grandTotal) {
      throw new Error(`Check Request total (${data.grandTotal}) cannot exceed Purchase Order total (${po.grandTotal}).`);
    }
  }

  const maxRetries = 3;
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    const crNumber = await generateCRNumber();
    const crData = {
      ...data,
      crNumber,
      status: CRStatus.DRAFT,
    };

    try {
      const createdCr = await prisma.checkRequest.create({
        data: crData,
        include: {
          po: {
            include: {
              vendor: true
            }
          },
          preparedBy: { select: { name: true, email: true } },
          requestedBy: { select: { name: true, email: true } },
          reviewedBy: { select: { name: true, email: true } },
        }
      });

      const auditUser = getAuditUser(session);
      await logAudit("CREATE", {
        model: "CheckRequest",
        recordId: createdCr.id,
        userId: auditUser.userId,
        userName: auditUser.userName,
        changes: createdCr,
      });

      return createdCr;
    } catch (error) {
      lastError = error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        console.warn(`Unique constraint violation for CR number. Retrying... (${i + 1}/${maxRetries})`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed to create Check Request after ${maxRetries} attempts. Last error: ${lastError}`);
}

export async function updateCRStatus(id: string, status: CRStatus, session: Session) {
  switch (status) {
    case CRStatus.APPROVED:
      authorize(session, 'APPROVE_CR');
      break;
    case CRStatus.REJECTED:
      authorize(session, 'REJECT_CR');
      break;
    default:
      authorize(session, 'UPDATE_CR');
      break;
  }
  
  interface UpdateData {
    status: CRStatus;
    reviewedById?: string;
    approvedById?: string;
  }
  
  const updateData: UpdateData = { status };
  const userId = session.user.id;

  const cr = await prisma.checkRequest.findUnique({
    where: { id },
    select: {
      preparedById: true,
      crNumber: true,
      status: true,
      preparedBy: {
        select: { name: true, email: true }
      }
    },
  });

  if (!cr || !cr.preparedBy) {
    throw new Error("Check Request or originator not found.");
  }

  if (status === CRStatus.PENDING_APPROVAL) {
    updateData.reviewedById = userId;
  } else if (status === CRStatus.APPROVED) {
    updateData.approvedById = userId;
  }

  const updatedCr = await prisma.checkRequest.update({
    where: { id },
    data: updateData,
    include: {
      po: {
        include: {
          vendor: true
        }
      },
      preparedBy: { select: { name: true, email: true } },
      requestedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
    }
  });

  const message = `The status of your Check Request ${cr.crNumber} has been updated to ${status}.`;
  await createNotification(cr.preparedById, message);

  const emailComponent = React.createElement(StatusUpdateEmail, {
    userName: cr.preparedBy.name || 'User',
    documentType: 'Check Request',
    documentNumber: cr.crNumber,
    newStatus: status,
  });

  await sendEmail({
    to: cr.preparedBy.email,
    subject: `Status Update for CR: ${cr.crNumber}`,
    react: emailComponent,
  });

  const auditUser = getAuditUser(session);
  await logAudit("STATUS_CHANGE", {
    model: "CheckRequest",
    recordId: id,
    userId: auditUser.userId,
    userName: auditUser.userName,
    changes: {
      from: cr.status,
      to: status,
    },
  });

  return updatedCr;
}
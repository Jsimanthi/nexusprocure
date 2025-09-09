// src/lib/cr.ts
import { prisma } from "./prisma";
import { CRStatus, PaymentMethod } from "@/types/cr";
import { z } from "zod";
import { createNotification } from "./notification";
import { sendEmail } from "./email";
import { StatusUpdateEmail } from "@/components/emails/StatusUpdateEmail";
import { createCrSchema } from "./schemas";
import * as React from "react";
import { Session } from "next-auth";
import { authorize } from "./auth-utils";
import { logAudit, getAuditUser } from "./audit";
import { Prisma, Role } from "@prisma/client";

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

export async function getCRsByUser(
  userId: string,
  { page = 1, pageSize = 10, search = "", status = "" }: { page?: number; pageSize?: number, search?: string, status?: string }
) {
  const userClause = {
    OR: [
      { preparedById: userId },
      { requestedById: userId },
      { reviewedById: userId },
      { approvedById: userId },
    ],
  };

  const where: Prisma.CheckRequestWhereInput = {
    AND: [userClause],
  };

  if (status) {
    const statuses = status.split(',') as CRStatus[];
    if (statuses.length > 0) {
      where.AND.push({ status: { in: statuses } });
    }
  }

  if (search) {
    where.AND.push({
      OR: [
        { crNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { paymentTo: { contains: search, mode: 'insensitive' } },
        { purpose: { contains: search, mode: 'insensitive' } },
        { po: { poNumber: { contains: search, mode: 'insensitive' } } },
      ],
    });
  }

  const [checkRequests, total] = await prisma.$transaction([
    prisma.checkRequest.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        po: {
          include: {
            vendor: true,
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
  // Financial Validation
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
  authorize(session, Role.MANAGER);
  const updateData: any = { status };
  const userId = session.user.id;

  const cr = await prisma.checkRequest.findUnique({
    where: { id },
    select: {
      preparedById: true,
      crNumber: true,
      status: true, // For audit log
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

  // Create the email component with proper typing
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
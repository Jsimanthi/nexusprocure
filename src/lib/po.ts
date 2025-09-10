// src/lib/po.ts
import { prisma } from "./prisma";
import { POStatus } from "@/types/po";
import { z } from "zod";
import { createNotification } from "./notification";
import { sendEmail } from "./email";
import { StatusUpdateEmail } from "@/components/emails/StatusUpdateEmail";
import { createPoSchema, createVendorSchema, updateVendorSchema } from "./schemas";
import { logAudit, getAuditUser } from "./audit";
import { Session } from "next-auth";
import * as React from "react";
import { authorize } from "./auth-utils";
import { Prisma } from "@prisma/client";

export async function generatePONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  return `PO-${year}-${(count + 1).toString().padStart(4, '0')}`;
}

export async function getPOsByUser(
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

  // Correctly initialize AND as an array
  const where: Prisma.PurchaseOrderWhereInput = {
    AND: [userClause],
  };

  if (status) {
    const statuses = status.split(',') as POStatus[];
    if (statuses.length > 0) {
      (where.AND as Prisma.PurchaseOrderWhereInput[]).push({ status: { in: statuses } });
    }
  }

  if (search) {
    (where.AND as Prisma.PurchaseOrderWhereInput[]).push({
      OR: [
        { poNumber: { contains: search } }, // Removed mode: 'insensitive'
        { title: { contains: search } }, // Removed mode: 'insensitive'
        { vendorName: { contains: search } }, // Removed mode: 'insensitive'
      ],
    });
  }

  const [purchaseOrders, total] = await prisma.$transaction([
    prisma.purchaseOrder.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        items: true,
        preparedBy: { select: { name: true, email: true } },
        requestedBy: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } },
        approvedBy: { select: { name: true, email: true } },
        vendor: true,
        iom: {
          include: {
            preparedBy: { select: { name: true, email: true } },
            requestedBy: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return { purchaseOrders, total };
}

export async function getPOById(id: string) {
  return await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      items: true,
      preparedBy: { select: { name: true, email: true } },
      requestedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
      vendor: true,
      iom: {
        include: {
          items: true,
          preparedBy: { select: { name: true, email: true } },
          requestedBy: { select: { name: true, email: true } },
          reviewedBy: { select: { name: true, email: true } },
          approvedBy: { select: { name: true, email: true } },
        }
      }
    }
  });
}

export async function getVendors({
  page = 1,
  pageSize = 10,
}: {
  page?: number;
  pageSize?: number;
}) {
  const [vendors, total] = await prisma.$transaction([
    prisma.vendor.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: "asc" },
    }),
    prisma.vendor.count(),
  ]);

  return { vendors, total };
}

export async function getVendorById(id: string) {
  return await prisma.vendor.findUnique({
    where: { id }
  });
}

type CreateVendorData = z.infer<typeof createVendorSchema>;
type UpdateVendorData = z.infer<typeof updateVendorSchema>;

export async function createVendor(data: CreateVendorData, session: Session) {
  await authorize(session, 'MANAGE_VENDORS');
  return await prisma.vendor.create({
    data,
  });
}

export async function updateVendor(
  id: string,
  data: UpdateVendorData,
  session: Session
) {
  await authorize(session, 'MANAGE_VENDORS');
  return await prisma.vendor.update({
    where: { id },
    data,
  });
}

export async function deleteVendor(id: string, session: Session) {
  await authorize(session, 'MANAGE_VENDORS');
  return await prisma.vendor.delete({
    where: { id },
  });
}

type CreatePoData = z.infer<typeof createPoSchema> & {
  preparedById: string;
  requestedById: string;
};

export async function createPurchaseOrder(data: CreatePoData, session: Session) {
  await authorize(session, 'CREATE_PO');
  const { items, attachments, ...restOfData } = data;

  let totalAmount = 0;
  let taxAmount = 0;

  const itemsWithTotals = items.map(item => {
    const itemTaxAmount = (item.quantity * item.unitPrice) * (item.taxRate / 100);
    const itemTotalPrice = (item.quantity * item.unitPrice) + itemTaxAmount;

    totalAmount += item.quantity * item.unitPrice;
    taxAmount += itemTaxAmount;

    return {
      ...item,
      taxAmount: itemTaxAmount,
      totalPrice: itemTotalPrice
    };
  });

  const grandTotal = totalAmount + taxAmount;

  const maxRetries = 3;
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    const poNumber = await generatePONumber();
    const poData = {
      ...restOfData,
      poNumber,
      totalAmount,
      taxAmount,
      grandTotal,
      status: POStatus.DRAFT,
      items: {
        create: itemsWithTotals,
      },
      ...(attachments && attachments.length > 0 && {
        attachments: {
          create: attachments.map(att => ({
            url: att.url,
            filename: att.filename,
            filetype: att.filetype,
            size: att.size,
          })),
        },
      })
    };

    try {
      const createdPo = await prisma.purchaseOrder.create({
        data: poData,
        include: {
          items: true,
          attachments: true,
          preparedBy: { select: { name: true, email: true } },
          requestedBy: { select: { name: true, email: true } },
          vendor: true,
          iom: {
            include: {
              preparedBy: { select: { name: true, email: true } },
              requestedBy: { select: { name: true, email: true } },
            }
          }
        }
      });

      const auditUser = getAuditUser(session);
      await logAudit("CREATE", {
        model: "PurchaseOrder",
        recordId: createdPo.id,
        userId: auditUser.userId,
        userName: auditUser.userName,
        changes: createdPo,
      });

      return createdPo;
    } catch (error) {
      lastError = error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        console.warn(`Unique constraint violation for PO number. Retrying... (${i + 1}/${maxRetries})`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed to create purchase order after ${maxRetries} attempts. Last error: ${lastError}`);
}

export async function updatePOStatus(id: string, status: POStatus, session: Session) {
  switch (status) {
    case POStatus.APPROVED:
      await authorize(session, 'APPROVE_PO');
      break;
    case POStatus.REJECTED:
      await authorize(session, 'REJECT_PO');
      break;
    default:
      await authorize(session, 'UPDATE_PO');
      break;
  }
  
  interface UpdateData {
    status: POStatus;
    reviewedById?: string;
    approvedById?: string;
  }
  
  const updateData: UpdateData = { status };
  const userId = session.user.id;
  
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: {
      preparedById: true,
      poNumber: true,
      status: true,
      preparedBy: {
        select: { name: true, email: true }
      }
    },
  });

  if (!po || !po.preparedBy) {
    throw new Error("Purchase Order or originator not found.");
  }

  if (status === POStatus.PENDING_APPROVAL && userId) {
    updateData.reviewedById = userId;
  } else if (status === POStatus.APPROVED && userId) {
    updateData.approvedById = userId;
  }
  
  const updatedPo = await prisma.purchaseOrder.update({
    where: { id },
    data: updateData,
    include: {
      items: true,
      preparedBy: { select: { name: true, email: true } },
      requestedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
      vendor: true,
      iom: {
        include: {
          preparedBy: { select: { name: true, email: true } },
          requestedBy: { select: { name: true, email: true } },
        }
      }
    }
  });

  const message = `The status of your Purchase Order ${po.poNumber} has been updated to ${status}.`;
  await createNotification(po.preparedById, message);

  const emailComponent = React.createElement(StatusUpdateEmail, {
    userName: po.preparedBy.name || 'User',
    documentType: 'Purchase Order',
    documentNumber: po.poNumber,
    newStatus: status,
  });

  await sendEmail({
    to: po.preparedBy.email,
    subject: `Status Update for PO: ${po.poNumber}`,
    react: emailComponent,
  });

  const auditUser = getAuditUser(session);
  await logAudit("STATUS_CHANGE", {
    model: "PurchaseOrder",
    recordId: id,
    userId: auditUser.userId,
    userName: auditUser.userName,
    changes: {
      from: po.status,
      to: status,
    },
  });

  return updatedPo;
}

export async function getIOMsForPO() {
  return await prisma.iOM.findMany({
    where: {
      status: "APPROVED",
    },
    include: {
      items: true,
      preparedBy: { select: { name: true, email: true } },
      requestedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' }
  });
}
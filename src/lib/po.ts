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
import { triggerPusherEvent } from "./pusher";

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

export async function getPOs(
  session: Session,
  {
    page = 1,
    pageSize = 10,
    search = "",
    status = "",
  }: { page?: number; pageSize?: number; search?: string; status?: string }
) {
  const user = session.user;
  const userPermissions = user.permissions || [];
  const where: Prisma.PurchaseOrderWhereInput = {
    AND: [],
  };

  // If user does not have permission to see all POs, filter by their involvement.
  if (!userPermissions.includes('READ_ALL_POS')) {
    (where.AND as Prisma.PurchaseOrderWhereInput[]).push({
      OR: [
        { preparedById: user.id },
        { requestedById: user.id },
        { reviewedById: user.id },
        { approvedById: user.id },
      ],
    });
  }

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
  authorize(session, 'MANAGE_VENDORS');
  return await prisma.vendor.create({
    data,
  });
}

export async function updateVendor(
  id: string,
  data: UpdateVendorData,
  session: Session
) {
  authorize(session, 'MANAGE_VENDORS');
  return await prisma.vendor.update({
    where: { id },
    data,
  });
}

export async function deleteVendor(id: string, session: Session) {
  authorize(session, 'MANAGE_VENDORS');
  return await prisma.vendor.delete({
    where: { id },
  });
}

type CreatePoData = z.infer<typeof createPoSchema> & {
  preparedById: string;
  requestedById: string;
};

export async function createPurchaseOrder(data: CreatePoData, session: Session) {
  authorize(session, 'CREATE_PO');
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

export async function updatePOStatus(
  id: string,
  status: POStatus | undefined,
  session: Session,
  approverId?: string,
  reviewerId?: string,
) {
  if (!status && !approverId && !reviewerId) {
    throw new Error("Either status, approverId, or reviewerId must be provided.");
  }

  // Authorize based on action
  if (status) {
    switch (status) {
      case POStatus.APPROVED:
        authorize(session, "APPROVE_PO");
        break;
      case POStatus.REJECTED:
        authorize(session, "REJECT_PO");
        break;
      case POStatus.UNDER_REVIEW:
        authorize(session, "REVIEW_PO");
        break;
      case POStatus.PENDING_APPROVAL:
        authorize(session, "REVIEW_PO");
        break;
      default:
        authorize(session, "UPDATE_PO");
        break;
    }
  } else {
    authorize(session, "UPDATE_PO");
  }

  interface UpdateData {
    status?: POStatus;
    reviewedById?: string | null;
    approvedById?: string | null;
  }

  const updateData: UpdateData = {};
  const userId = session.user.id;

  if (status) {
    updateData.status = status;
    switch (status) {
      case POStatus.DRAFT: // Withdrawing
        updateData.reviewedById = null;
        updateData.approvedById = null;
        break;
      case POStatus.SUBMITTED: // Submitting for review
        if (!reviewerId) {
          throw new Error("Reviewer ID is required when submitting for review");
        }
        updateData.reviewedById = reviewerId;
        break;
      case POStatus.UNDER_REVIEW: // Starting review
        updateData.reviewedById = userId;
        break;
      case POStatus.PENDING_APPROVAL: // Submitting for approval
        if (!approverId) {
          throw new Error("Approver ID is required when moving to PENDING_APPROVAL");
        }
        updateData.approvedById = approverId;
        break;
      case POStatus.APPROVED: // Approving
        updateData.approvedById = userId;
        break;
    }
  } else if (approverId) {
    updateData.approvedById = approverId;
  }
  
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: {
      preparedById: true,
      reviewedById: true,
      approvedById: true,
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

  if (status) {
    const message = `The status of Purchase Order ${po.poNumber} has been updated to ${status}.`;
    // Notify the creator
    await createNotification(po.preparedById, message);

    // Notify other relevant parties
    switch (status) {
      case POStatus.SUBMITTED:
        if (updatedPo.reviewedById) {
          await createNotification(updatedPo.reviewedById, `A PO ${po.poNumber} has been submitted for your review.`);
        }
        break;
      case POStatus.PENDING_APPROVAL:
        if (updatedPo.approvedById) {
          await createNotification(updatedPo.approvedById, `A PO ${po.poNumber} is pending your approval.`);
        }
        break;
      case POStatus.APPROVED:
      case POStatus.REJECTED:
        if (po.reviewedById) {
          await createNotification(po.reviewedById, `The PO ${po.poNumber} you reviewed has been ${status.toLowerCase()}.`);
        }
        break;
    }

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
  }

  const auditUser = getAuditUser(session);
  await logAudit("UPDATE", {
    model: "PurchaseOrder",
    recordId: id,
    userId: auditUser.userId,
    userName: auditUser.userName,
    changes: {
      from: { status: po.status },
      to: { status, approverId, reviewerId },
    },
  });

  // Trigger a dashboard update
  await triggerPusherEvent("dashboard-channel", "dashboard-update", {});

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
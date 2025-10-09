// src/lib/po.ts
import { prisma } from "./prisma";
import { POStatus } from "@/types/po";
import { z } from "zod";
import crypto from "crypto";
import { createNotification } from "./notification";
import { sendEmail } from "./email";
import { StatusUpdateEmail } from "@/components/emails/StatusUpdateEmail";
import { createPoSchema } from "./schemas";
import { logAudit, getAuditUser } from "./audit";
import { Session } from "next-auth";
import * as React from "react";
import { authorize } from "./auth-utils";
import { Prisma } from "@prisma/client";
import { triggerPusherEvent } from "./pusher";
import { updateVendorPerformanceMetrics } from "./vendor";

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
    month = "",
  }: { page?: number; pageSize?: number; search?: string; status?: string, month?: string }
) {
  const user = session.user;
  if (!user) {
    throw new Error("User not found in session");
  }
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

  if (month) {
    const [year, monthNum] = month.split('-').map(Number);
    if (!isNaN(year) && !isNaN(monthNum)) {
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 1);
      (where.AND as Prisma.PurchaseOrderWhereInput[]).push({
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      });
    }
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

export async function getPublicPOById(id: string) {
  const selectClause = {
    id: true,
    poNumber: true,
    title: true,
    vendorName: true,
    vendorAddress: true,
    vendorContact: true,
    totalAmount: true,
    taxAmount: true,
    grandTotal: true,
    status: true,
    pdfToken: true,
    createdAt: true,
    updatedAt: true,
    taxRate: true,
    items: true,
    preparedBy: { select: { name: true, email: true } },
    requestedBy: { select: { name: true, email: true } },
    reviewedBy: { select: { name: true, email: true } },
    approvedBy: { select: { name: true, email: true } },
    vendor: true,
    iom: {
      select: {
        iomNumber: true,
      },
    },
  };

  let po = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: selectClause,
  });

  if (po && !po.pdfToken) {
    const newPdfToken = crypto.randomBytes(16).toString("hex");
    try {
      po = await prisma.purchaseOrder.update({
        where: { id },
        data: { pdfToken: newPdfToken },
        select: selectClause,
      });
    } catch (error) {
      // It's possible another request generated the token in the meantime.
      // Fetch the latest record to ensure we have the token.
      console.warn(`Failed to update PO with new PDF token, likely due to a race condition. Refetching...`, error);
      po = await prisma.purchaseOrder.findUnique({
        where: { id },
        select: selectClause,
      });
    }
  }

  return po;
}

type CreatePoData = z.infer<typeof createPoSchema> & {
  preparedById: string;
  requestedById: string;
  status?: POStatus;
};

export async function createPurchaseOrder(data: CreatePoData, session: Session) {
  authorize(session, 'CREATE_PO');
  const { items, attachments, reviewerId, approverId, status, ...restOfData } = data;

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
      pdfToken: crypto.randomBytes(16).toString('hex'),
      totalAmount,
      taxAmount,
      grandTotal,
      reviewedById: reviewerId,
      approvedById: approverId,
      status: status || POStatus.PENDING_APPROVAL,
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

      const auditUser = getAuditUser(session);
      await logAudit("CREATE", {
        model: "PurchaseOrder",
        recordId: createdPo.id,
        userId: auditUser.userId,
        userName: auditUser.userName,
        changes: createdPo,
      });

      // Notify the assigned reviewer and approver, but only if it's not a draft
      if (createdPo.status !== POStatus.DRAFT) {
        if (createdPo.reviewedById) {
          await createNotification(
            createdPo.reviewedById,
            `You have been assigned to review PO: ${createdPo.poNumber}`
          );
        }
        if (createdPo.approvedById) {
          await createNotification(
            createdPo.approvedById,
            `Your approval is requested for PO: ${createdPo.poNumber}`
          );
        }
        if (createdPo.preparedById) {
           await createNotification(
            createdPo.preparedById,
            `Your PO ${createdPo.poNumber} has been submitted for review.`
          );
        }
      }

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
  action: "APPROVE" | "REJECT" | "ORDER" | "DELIVER" | "CANCEL",
  session: Session
) {
  if (!session.user) {
    throw new Error("User not found in session");
  }
  const userId = session.user.id;

  // Handle simple status changes first
  if (action === "ORDER" || action === "DELIVER" || action === "CANCEL") {
    const updateData: Prisma.PurchaseOrderUpdateInput = {};
    switch (action) {
      case "ORDER":
        authorize(session, "ORDER_PO");
        updateData.status = POStatus.ORDERED;
        break;
      case "DELIVER":
        authorize(session, "DELIVER_PO");
        updateData.status = POStatus.DELIVERED;
        updateData.fulfilledAt = new Date();
        break;
      case "CANCEL":
        authorize(session, "CANCEL_PO");
        updateData.status = POStatus.CANCELLED;
        break;
    }
    const updatedPo = await prisma.purchaseOrder.update({ where: { id }, data: updateData });

    // After a PO is marked as delivered, update the vendor's performance metrics.
    if (action === "DELIVER" && updatedPo.vendorId) {
      await updateVendorPerformanceMetrics(updatedPo.vendorId);
    }

    return updatedPo;
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: {
      preparedById: true,
      reviewedById: true,
      approvedById: true,
      poNumber: true,
      status: true,
      reviewerStatus: true,
      approverStatus: true,
      preparedBy: { select: { name: true, email: true } },
    },
  });

  if (!po) throw new Error("Purchase Order not found.");
  if (!po.preparedBy) throw new Error("PO originator not found.");

  const isReviewer = userId === po.reviewedById;
  const isApprover = userId === po.approvedById;

  if (!isReviewer && !isApprover) {
    throw new Error("Not authorized to perform this action on this PO.");
  }

  const newActionStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
  const updateData: Partial<Prisma.PurchaseOrderUpdateInput> = {};

  if (isReviewer) {
    authorize(session, 'REVIEW_PO');
    updateData.reviewerStatus = newActionStatus;
  }

  if (isApprover) {
    authorize(session, 'APPROVE_PO');
    updateData.approverStatus = newActionStatus;
  }

  const updatedSubStatusPo = await prisma.purchaseOrder.update({
    where: { id },
    data: updateData,
  });

  const { reviewerStatus, approverStatus } = updatedSubStatusPo;
  let finalStatus: POStatus = POStatus.PENDING_APPROVAL;

  if (approverStatus === "APPROVED") {
    finalStatus = POStatus.APPROVED;
  } else if (approverStatus === "REJECTED" || reviewerStatus === "REJECTED") {
    finalStatus = POStatus.REJECTED;
  }

  const finalUpdate = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: finalStatus },
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
    },
  });

  const actorName = session.user.name || 'A user';
  const finalStatusMessage = `PO ${po.poNumber} has been ${finalStatus.toLowerCase()} by the approval process.`;

  if (finalStatus === POStatus.APPROVED || finalStatus === POStatus.REJECTED) {
    // Notify all parties about the final decision
    const partiesToNotify = [po.preparedById, po.reviewedById, po.approvedById].filter(id => id) as string[];
    for (const partyId of partiesToNotify) {
      await createNotification(partyId, finalStatusMessage);
    }
  } else {
    // It's still pending, notify the next person in line
    const messageToCreator = `Your PO ${po.poNumber} was ${action.toLowerCase()}d by ${actorName} and is now pending further action.`;
    await createNotification(po.preparedById, messageToCreator);

    const otherPartyId = isReviewer ? po.approvedById : po.reviewedById;
    if (otherPartyId) {
      const messageToOtherParty = `Action required on PO ${po.poNumber}. It was ${action.toLowerCase()}d by ${actorName}.`;
      await createNotification(otherPartyId, messageToOtherParty);
    }
  }

  // Send email to the creator
  const emailComponent = React.createElement(StatusUpdateEmail, {
    userName: po.preparedBy.name || 'User',
    documentType: 'Purchase Order',
    documentNumber: po.poNumber,
    newStatus: finalStatus,
  });

  await sendEmail({
    to: po.preparedBy.email,
    subject: `Status Update for PO: ${po.poNumber}`,
    react: emailComponent,
  });

  const auditUser = getAuditUser(session);
  await logAudit("UPDATE", {
    model: "PurchaseOrder",
    recordId: id,
    userId: auditUser.userId,
    userName: auditUser.userName,
    changes: {
      from: { status: po.status, reviewerStatus: po.reviewerStatus, approverStatus: po.approverStatus },
      to: { status: finalStatus, reviewerStatus, approverStatus },
    },
  });

  await triggerPusherEvent("dashboard-channel", "dashboard-update", {});

  return finalUpdate;
}

export async function updatePODetails(
  id: string,
  data: { qualityScore?: number; deliveryNotes?: string },
  session: Session
) {
  if (!session.user) {
    throw new Error("User not found in session");
  }
  authorize(session, 'MANAGE_VENDORS'); // Reuse this permission for now

  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) {
    throw new Error("Purchase Order not found.");
  }

  const updatedPo = await prisma.purchaseOrder.update({
    where: { id },
    data,
  });

  // After updating details, trigger vendor metric recalculation
  if (updatedPo.vendorId) {
    await updateVendorPerformanceMetrics(updatedPo.vendorId);
  }

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
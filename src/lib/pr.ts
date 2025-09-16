// src/lib/pr.ts
import { prisma } from "./prisma";
import { PRStatus } from "@/types/pr";
import { z } from "zod";
import { createNotification } from "./notification";
import { sendEmail } from "./email";
import { StatusUpdateEmail } from "@/components/emails/StatusUpdateEmail";
import { createPrSchema } from "./schemas";
import * as React from "react";
import { Session } from "next-auth";
import { authorize } from "./auth-utils";
import { logAudit, getAuditUser } from "./audit";
import { Prisma } from "@prisma/client";
import { triggerPusherEvent } from "./pusher";

export async function generatePRNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.paymentRequest.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  return `PR-${year}-${(count + 1).toString().padStart(4, '0')}`;
}

export async function getPRs(
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
  const where: Prisma.PaymentRequestWhereInput = {
    AND: [],
  };

  // If user does not have permission to see all PRs, filter by their involvement.
  if (!userPermissions.includes('READ_ALL_PRS')) {
    (where.AND as Prisma.PaymentRequestWhereInput[]).push({
      OR: [
        { preparedById: user.id },
        { requestedById: user.id },
        { reviewedById: user.id },
        { approvedById: user.id },
      ],
    });
  }

  if (status) {
    const statuses = status.split(',') as PRStatus[];
    if (statuses.length > 0) {
      (where.AND as Prisma.PaymentRequestWhereInput[]).push({ status: { in: statuses } });
    }
  }

  if (search) {
    (where.AND as Prisma.PaymentRequestWhereInput[]).push({
      OR: [
        { prNumber: { contains: search } },
        { title: { contains: search } },
        { paymentTo: { contains: search } },
        { purpose: { contains: search } },
        { po: { poNumber: { contains: search } } },
      ],
    });
  }

  const [paymentRequests, total] = await prisma.$transaction([
    prisma.paymentRequest.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
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
    prisma.paymentRequest.count({ where }),
  ]);

  return { paymentRequests, total };
}

export async function getPRById(id: string) {
  return await prisma.paymentRequest.findUnique({
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

export async function getPOsForPR() {
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

type CreatePrData = z.infer<typeof createPrSchema> & {
  preparedById: string;
};

export async function createPaymentRequest(data: CreatePrData, session: Session) {
  authorize(session, 'CREATE_PR');
  if (data.poId) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: data.poId },
      select: { grandTotal: true },
    });
    if (!po) {
      throw new Error("Associated Purchase Order not found.");
    }
    if (data.grandTotal > po.grandTotal) {
      throw new Error(`Payment Request total (${data.grandTotal}) cannot exceed Purchase Order total (${po.grandTotal}).`);
    }
  }

  const maxRetries = 3;
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    const prNumber = await generatePRNumber();
    const prData = {
      ...data,
      prNumber,
      status: PRStatus.DRAFT,
    };

    try {
      const createdPr = await prisma.paymentRequest.create({
        data: prData,
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
        model: "PaymentRequest",
        recordId: createdPr.id,
        userId: auditUser.userId,
        userName: auditUser.userName,
        changes: createdPr,
      });

      return createdPr;
    } catch (error) {
      lastError = error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        console.warn(`Unique constraint violation for PR number. Retrying... (${i + 1}/${maxRetries})`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed to create Payment Request after ${maxRetries} attempts. Last error: ${lastError}`);
}

export async function updatePRStatus(
  id: string,
  status: PRStatus | undefined,
  session: Session,
  approverId?: string
) {
  if (!status && !approverId) {
    throw new Error("Either status or approverId must be provided.");
  }

  // Authorize based on action
  if (status) {
    switch (status) {
      case PRStatus.APPROVED:
        authorize(session, "APPROVE_PR");
        break;
      case PRStatus.REJECTED:
        authorize(session, "REJECT_PR");
        break;
      default:
        authorize(session, "UPDATE_PR");
        break;
    }
  } else {
    authorize(session, "UPDATE_PR");
  }

  interface UpdateData {
    status?: PRStatus;
    reviewedById?: string | null;
    approvedById?: string | null;
  }

  const updateData: UpdateData = {};
  const userId = session.user.id;

  if (status) {
    updateData.status = status;
    switch (status) {
      case PRStatus.DRAFT: // Withdrawing
        updateData.reviewedById = null;
        updateData.approvedById = null;
        break;
      case PRStatus.UNDER_REVIEW: // Starting review
        updateData.reviewedById = userId;
        break;
      case PRStatus.PENDING_APPROVAL: // Submitting for approval
        if (!approverId) {
          throw new Error("Approver ID is required when moving to PENDING_APPROVAL");
        }
        updateData.approvedById = approverId;
        break;
      case PRStatus.APPROVED: // Approving
        updateData.approvedById = userId;
        break;
    }
  } else if (approverId) {
    updateData.approvedById = approverId;
  }

  const pr = await prisma.paymentRequest.findUnique({
    where: { id },
    select: {
      preparedById: true,
      prNumber: true,
      status: true,
      preparedBy: {
        select: { name: true, email: true }
      }
    },
  });

  if (!pr || !pr.preparedBy) {
    throw new Error("Payment Request or originator not found.");
  }

  const updatedPr = await prisma.paymentRequest.update({
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

  if (status) {
    const message = `The status of Payment Request ${pr.prNumber} has been updated to ${status}.`;
    // Notify the creator
    await createNotification(pr.preparedById, message);

    // Notify other relevant parties
    if (status === PRStatus.PENDING_APPROVAL && updatedPr.approvedById) {
      await createNotification(updatedPr.approvedById, `A PR ${pr.prNumber} is pending your approval.`);
    }

    const emailComponent = React.createElement(StatusUpdateEmail, {
      userName: pr.preparedBy.name || 'User',
      documentType: 'Payment Request',
      documentNumber: pr.prNumber,
      newStatus: status,
    });

    await sendEmail({
      to: pr.preparedBy.email,
      subject: `Status Update for PR: ${pr.prNumber}`,
      react: emailComponent,
    });
  }

  const auditUser = getAuditUser(session);
  await logAudit("UPDATE", {
    model: "PaymentRequest",
    recordId: id,
    userId: auditUser.userId,
    userName: auditUser.userName,
    changes: {
      from: { status: pr.status },
      to: { status, approverId },
    },
  });

  // Trigger a dashboard update
  await triggerPusherEvent("dashboard-channel", "dashboard-update", {});

  return updatedPr;
}
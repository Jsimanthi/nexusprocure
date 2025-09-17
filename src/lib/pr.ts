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

    // Explicitly construct the data for prisma create
    const prData = {
      title: data.title,
      poId: data.poId,
      paymentTo: data.paymentTo,
      paymentDate: data.paymentDate,
      purpose: data.purpose,
      paymentMethod: data.paymentMethod,
      bankAccount: data.bankAccount,
      referenceNumber: data.referenceNumber,
      totalAmount: data.totalAmount,
      taxAmount: data.taxAmount,
      grandTotal: data.grandTotal,
      preparedById: data.preparedById,
      requestedById: data.requestedById,
      reviewedById: data.reviewerId, // map reviewerId to reviewedById
      approvedById: data.approverId, // map approverId to approvedById
      prNumber: prNumber,
      status: PRStatus.PENDING_APPROVAL,
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
          approvedBy: { select: { name: true, email: true } },
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

      // Notify the assigned reviewer and approver
      if (createdPr.reviewedById) {
        await createNotification(
          createdPr.reviewedById,
          `You have been assigned to review PR: ${createdPr.prNumber}`
        );
      }
      if (createdPr.approvedById) {
        await createNotification(
          createdPr.approvedById,
          `Your approval is requested for PR: ${createdPr.prNumber}`
        );
      }

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
  action: "APPROVE" | "REJECT" | "PROCESS" | "CANCEL",
  session: Session
) {
  const userId = session.user.id;
  if (!userId) {
    throw new Error("User not found in session");
  }

  // Handle simple status changes first
  if (action === "PROCESS" || action === "CANCEL") {
    let newStatus: PRStatus;
    switch (action) {
      case "PROCESS":
        authorize(session, "PROCESS_PR");
        newStatus = PRStatus.PROCESSED;
        break;
      case "CANCEL":
        authorize(session, "CANCEL_PR");
        newStatus = PRStatus.CANCELLED;
        break;
    }
    return await prisma.paymentRequest.update({ where: { id }, data: { status: newStatus } });
  }

  const pr = await prisma.paymentRequest.findUnique({
    where: { id },
    select: {
      preparedById: true,
      reviewedById: true,
      approvedById: true,
      prNumber: true,
      status: true,
      reviewerStatus: true,
      approverStatus: true,
      preparedBy: { select: { name: true, email: true } },
    },
  });

  if (!pr) throw new Error("Payment Request not found.");
  if (!pr.preparedBy) throw new Error("PR originator not found.");

  const isReviewer = userId === pr.reviewedById;
  const isApprover = userId === pr.approvedById;

  if (!isReviewer && !isApprover) {
    throw new Error("Not authorized to perform this action on this PR.");
  }

  const newActionStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
  const updateData: Partial<Prisma.PaymentRequestUpdateInput> = {};

  if (isReviewer) {
    authorize(session, 'REVIEW_PR'); // Assuming REVIEW_PR permission exists
    updateData.reviewerStatus = newActionStatus;
  }

  if (isApprover) {
    authorize(session, 'APPROVE_PR');
    updateData.approverStatus = newActionStatus;
  }

  const updatedSubStatusPr = await prisma.paymentRequest.update({
    where: { id },
    data: updateData,
  });

  const { reviewerStatus, approverStatus } = updatedSubStatusPr;
  let finalStatus: PRStatus = PRStatus.PENDING_APPROVAL;

  if (approverStatus === "APPROVED") {
    finalStatus = PRStatus.APPROVED;
  } else if (approverStatus === "REJECTED" || reviewerStatus === "REJECTED") {
    finalStatus = PRStatus.REJECTED;
  }

  const finalUpdate = await prisma.paymentRequest.update({
    where: { id },
    data: { status: finalStatus },
    include: {
      po: { include: { vendor: true, items: true } },
      preparedBy: { select: { name: true, email: true } },
      requestedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
    },
  });

  const actorName = session.user.name || 'A user';
  const finalStatusMessage = `PR ${pr.prNumber} has been ${finalStatus.toLowerCase()} by the approval process.`;

  if (finalStatus === PRStatus.APPROVED || finalStatus === PRStatus.REJECTED) {
    // Notify all parties about the final decision
    const partiesToNotify = [pr.preparedById, pr.reviewedById, pr.approvedById].filter(id => id) as string[];
    for (const partyId of partiesToNotify) {
      await createNotification(partyId, finalStatusMessage);
    }
  } else {
    // It's still pending, notify the next person in line
    const messageToCreator = `Your PR ${pr.prNumber} was ${action.toLowerCase()}d by ${actorName} and is now pending further action.`;
    await createNotification(pr.preparedById, messageToCreator);

    const otherPartyId = isReviewer ? pr.approvedById : pr.reviewedById;
    if (otherPartyId) {
      const messageToOtherParty = `Action required on PR ${pr.prNumber}. It was ${action.toLowerCase()}d by ${actorName}.`;
      await createNotification(otherPartyId, messageToOtherParty);
    }
  }

  // Send email to the creator
  const emailComponent = React.createElement(StatusUpdateEmail, {
    userName: pr.preparedBy.name || 'User',
    documentType: 'Payment Request',
    documentNumber: pr.prNumber,
    newStatus: finalStatus,
  });

  await sendEmail({
    to: pr.preparedBy.email,
    subject: `Status Update for PR: ${pr.prNumber}`,
    react: emailComponent,
  });

  const auditUser = getAuditUser(session);
  await logAudit("UPDATE", {
    model: "PaymentRequest",
    recordId: id,
    userId: auditUser.userId,
    userName: auditUser.userName,
    changes: {
      from: { status: pr.status, reviewerStatus: pr.reviewerStatus, approverStatus: pr.approverStatus },
      to: { status: finalStatus, reviewerStatus, approverStatus },
    },
  });

  await triggerPusherEvent("dashboard-channel", "dashboard-update", {});

  return finalUpdate;
}
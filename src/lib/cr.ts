// src/lib/cr.ts
import { prisma } from "./prisma";
import { CRStatus, PaymentMethod } from "@/types/cr";
import { z } from "zod";
import { createNotification } from "./notification";
import { sendEmail } from "./email";
import { StatusUpdateEmail } from "@/components/emails/StatusUpdateEmail";
import { createCrSchema } from "./schemas";
import * as React from "react";

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
  { page = 1, pageSize = 10 }: { page?: number; pageSize?: number }
) {
  const where = {
    OR: [
      { preparedById: userId },
      { requestedById: userId },
      { reviewedById: userId },
      { approvedById: userId },
    ],
  };

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

export async function createCheckRequest(data: CreateCrData) {
  const crNumber = await generateCRNumber();

  return await prisma.checkRequest.create({
    data: {
      ...data,
      crNumber,
      status: CRStatus.DRAFT,
    },
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
}

export async function updateCRStatus(id: string, status: CRStatus, userId?: string) {
  const updateData: any = { status };
  
  const cr = await prisma.checkRequest.findUnique({
    where: { id },
    select: {
      preparedById: true,
      crNumber: true,
      preparedBy: {
        select: { name: true, email: true }
      }
    },
  });

  if (!cr || !cr.preparedBy) {
    throw new Error("Check Request or originator not found.");
  }

  if (status === CRStatus.PENDING_APPROVAL && userId) {
    updateData.reviewedById = userId;
  } else if (status === CRStatus.APPROVED && userId) {
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

  return updatedCr;
}
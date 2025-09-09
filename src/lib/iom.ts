// src/lib/iom.ts
import { prisma } from "./prisma";
import { IOMStatus } from "@/types/iom";
import { z } from "zod";
import { createNotification } from "./notification";
import { sendEmail } from "./email";
import { StatusUpdateEmail } from "@/components/emails/StatusUpdateEmail";
import { createIomSchema } from "./schemas";
import * as React from "react";

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

export async function getIOMsByUser(
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

export async function createIOM(data: CreateIomData) {
  const { items, ...restOfData } = data;
  const iomNumber = await generateIOMNumber();
  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  return await prisma.iOM.create({
    data: {
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
    },
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
}

export async function updateIOMStatus(id: string, status: IOMStatus, userId?: string) {
  const updateData: any = { status };
  
  const iom = await prisma.iOM.findUnique({
    where: { id },
    select: {
      preparedById: true,
      iomNumber: true,
      preparedBy: {
        select: { name: true, email: true }
      }
    },
  });

  if (!iom || !iom.preparedBy) {
    throw new Error("IOM or originator not found.");
  }

  if (status === IOMStatus.UNDER_REVIEW && userId) {
    updateData.reviewedById = userId;
  } else if (status === IOMStatus.APPROVED && userId) {
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

  // Create the email component with proper typing
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

  return updatedIom;
}

export async function deleteIOM(id: string) {
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
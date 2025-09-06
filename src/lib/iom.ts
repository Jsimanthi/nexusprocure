// src/lib/iom.ts
import { prisma } from "./prisma";
import { IOMStatus } from "@/types/iom";

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

export async function getIOMsByUser(userId: string) {
  return await prisma.iOM.findMany({
    where: {
      OR: [
        { preparedById: userId },
        { requestedById: userId },
        { reviewedById: userId },
        { approvedById: userId },
      ],
    },
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
    },
    orderBy: { createdAt: 'desc' }
  });
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

export async function createIOM(data: {
  title: string;
  from: string;
  to: string;
  subject: string;
  content?: string;
  items: Array<{
    itemName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
  }>;
  preparedById: string;
  requestedById: string;
}) {
  const iomNumber = await generateIOMNumber();
  const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  return await prisma.iOM.create({
    data: {
      iomNumber,
      title: data.title,
      from: data.from,
      to: data.to,
      subject: data.subject,
      content: data.content,
      totalAmount,
      status: IOMStatus.DRAFT,
      preparedById: data.preparedById,
      requestedById: data.requestedById,
      items: {
        create: data.items.map(item => ({
          itemName: item.itemName,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
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
  
  if (status === IOMStatus.UNDER_REVIEW && userId) {
    updateData.reviewedById = userId;
  } else if (status === IOMStatus.APPROVED && userId) {
    updateData.approvedById = userId;
  }
  
  return await prisma.iOM.update({
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
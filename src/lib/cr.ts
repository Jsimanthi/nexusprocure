// src/lib/cr.ts
import { prisma } from "./prisma";
import { CRStatus, PaymentMethod } from "@/types/cr";

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

export async function getCRsByUser(userId: string) {
  return await prisma.checkRequest.findMany({
    where: {
      OR: [
        { preparedById: userId },
        { requestedById: userId },
        { reviewedById: userId },
        { approvedById: userId },
      ],
    },
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
    },
    orderBy: { createdAt: 'desc' }
  });
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

export async function createCheckRequest(data: {
  title: string;
  poId?: string;
  paymentTo: string;
  paymentDate: Date;
  purpose: string;
  paymentMethod: PaymentMethod;
  bankAccount?: string;
  referenceNumber?: string;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  preparedById: string;
  requestedById: string;
}) {
  const crNumber = await generateCRNumber();

  return await prisma.checkRequest.create({
    data: {
      crNumber,
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
      status: CRStatus.DRAFT,
      preparedById: data.preparedById,
      requestedById: data.requestedById,
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
  
  if (status === CRStatus.PENDING_APPROVAL && userId) {
    updateData.reviewedById = userId;
  } else if (status === CRStatus.APPROVED && userId) {
    updateData.approvedById = userId;
  }
  
  return await prisma.checkRequest.update({
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
}
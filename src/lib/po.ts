// src/lib/po.ts
import { prisma } from "./prisma";
import { POStatus } from "@/types/po";

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

export async function getPOsByUser(userId: string) {
  return await prisma.purchaseOrder.findMany({
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
    orderBy: { createdAt: 'desc' }
  });
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

export async function getVendors() {
  return await prisma.vendor.findMany({
    orderBy: { name: 'asc' }
  });
}

export async function getVendorById(id: string) {
  return await prisma.vendor.findUnique({
    where: { id }
  });
}

export async function createVendor(data: {
  name: string;
  address: string;
  contactInfo: string;
  taxId?: string;
  website?: string;
  email: string;
  phone: string;
}) {
  return await prisma.vendor.create({
    data
  });
}

export async function updateVendor(id: string, data: {
  name?: string;
  address?: string;
  contactInfo?: string;
  taxId?: string;
  website?: string;
  email?: string;
  phone?: string;
}) {
  return await prisma.vendor.update({
    where: { id },
    data
  });
}

export async function deleteVendor(id: string) {
  return await prisma.vendor.delete({
    where: { id }
  });
}

export async function createPurchaseOrder(data: {
  title: string;
  iomId?: string;
  vendorId?: string;
  companyName: string;
  companyAddress: string;
  companyContact: string;
  vendorName: string;
  vendorAddress: string;
  vendorContact: string;
  taxRate: number;
  items: Array<{
    itemName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
  preparedById: string;
  requestedById: string;
}) {
  const poNumber = await generatePONumber();
  
  // Calculate totals
  let totalAmount = 0;
  let taxAmount = 0;
  
  const itemsWithTotals = data.items.map(item => {
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
  
  return await prisma.purchaseOrder.create({
    data: {
      poNumber,
      title: data.title,
      iomId: data.iomId,
      vendorId: data.vendorId,
      companyName: data.companyName,
      companyAddress: data.companyAddress,
      companyContact: data.companyContact,
      vendorName: data.vendorName,
      vendorAddress: data.vendorAddress,
      vendorContact: data.vendorContact,
      taxRate: data.taxRate,
      totalAmount,
      taxAmount,
      grandTotal,
      status: POStatus.DRAFT,
      preparedById: data.preparedById,
      requestedById: data.requestedById,
      items: {
        create: itemsWithTotals
      }
    },
    include: {
      items: true,
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
}

export async function updatePOStatus(id: string, status: POStatus, userId?: string) {
  const updateData: any = { status };
  
  if (status === POStatus.PENDING_APPROVAL && userId) {
    updateData.reviewedById = userId;
  } else if (status === POStatus.APPROVED && userId) {
    updateData.approvedById = userId;
  }
  
  return await prisma.purchaseOrder.update({
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
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

export async function createVendor(data: CreateVendorData) {
  return await prisma.vendor.create({
    data
  });
}

export async function updateVendor(id: string, data: UpdateVendorData) {
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

type CreatePoData = z.infer<typeof createPoSchema> & {
  preparedById: string;
  requestedById: string;
};

export async function createPurchaseOrder(data: CreatePoData, session: Session) {
  const poNumber = await generatePONumber();
  const { items, attachments, ...restOfData } = data;

  // Calculate totals
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

  const poData: any = {
    ...restOfData,
    poNumber,
    totalAmount,
    taxAmount,
    grandTotal,
    status: POStatus.DRAFT,
    items: {
      create: itemsWithTotals,
    },
  };

  if (attachments && attachments.length > 0) {
    poData.attachments = {
      create: attachments.map(att => ({
        url: att.url,
        filename: att.filename,
        filetype: att.filetype,
        size: att.size,
      })),
    };
  }

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
}

export async function updatePOStatus(id: string, status: POStatus, session: Session) {
  const updateData: any = { status };
  const userId = session.user.id;
  
  // First, get the PO to identify the user who prepared it
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: {
      preparedById: true,
      poNumber: true,
      status: true, // Get old status for audit log
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

  // Create a real-time notification
  const message = `The status of your Purchase Order ${po.poNumber} has been updated to ${status}.`;
  await createNotification(po.preparedById, message);

  // Send an email notification
  await sendEmail({
    to: po.preparedBy.email,
    subject: `Status Update for PO: ${po.poNumber}`,
    react: StatusUpdateEmail({
      userName: po.preparedBy.name || 'User',
      documentType: 'Purchase Order',
      documentNumber: po.poNumber,
      newStatus: status,
    }),
  });

  // Log the audit trail
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
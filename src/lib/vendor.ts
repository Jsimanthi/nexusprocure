import { prisma } from "./prisma";
import { authorize } from "./auth-utils";
import { Session } from "next-auth";
import { z } from "zod";
import { createVendorSchema, updateVendorSchema } from "./schemas";

/**
 * Calculates and updates the performance metrics for a specific vendor.
 * This function should be called whenever a Purchase Order related to the vendor is updated in a way that could affect these metrics (e.g., marked as delivered).
 *
 * @param vendorId The ID of the vendor to update.
 */
export async function updateVendorPerformanceMetrics(vendorId: string) {
  // 1. Fetch all relevant purchase orders for the vendor
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: {
      vendorId: vendorId,
      status: { in: ['DELIVERED', 'COMPLETED'] },
    },
  });

  if (purchaseOrders.length === 0) {
    // No completed orders, so nothing to calculate.
    // We can ensure metrics are reset to 0 if desired.
    await prisma.vendor.update({
        where: { id: vendorId },
        data: {
            onTimeDeliveryRate: 0,
            averageQualityScore: 0,
        }
    });
    return;
  }

  // 2. Calculate On-Time Delivery Rate
  const posWithDeliveryDates = purchaseOrders.filter(
    (po: any) => po.expectedDeliveryDate && po.fulfilledAt
  );

  let onTimeDeliveryRate = 0;
  if (posWithDeliveryDates.length > 0) {
    const onTimeDeliveries = posWithDeliveryDates.filter(
      (po: any) => po.fulfilledAt! <= po.expectedDeliveryDate!
    ).length;
    onTimeDeliveryRate = (onTimeDeliveries / posWithDeliveryDates.length) * 100;
  }

  // 3. Calculate Average Quality Score
  const posWithQualityScores = purchaseOrders.filter(
    (po: any) => po.qualityScore !== null && po.qualityScore > 0
  );

  let averageQualityScore = 0;
  if (posWithQualityScores.length > 0) {
    const totalScore = posWithQualityScores.reduce(
      (acc: any, po: any) => acc + po.qualityScore!,
      0
    );
    averageQualityScore = totalScore / posWithQualityScores.length;
  }

  // 4. Update the Vendor record in the database
  await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      onTimeDeliveryRate: onTimeDeliveryRate,
      averageQualityScore: averageQualityScore,
    },
  });

  console.log(`Updated performance metrics for vendor ${vendorId}`);
}


// These functions were moved from po.ts to keep vendor logic together.
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
    where: { id },
    include: {
      purchaseOrders: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
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

export async function getAllVendorsForExport(session: Session) {
  authorize(session, 'MANAGE_VENDORS'); // Restrict export to users who can manage vendors
  return await prisma.vendor.findMany({
    orderBy: { name: 'asc' },
  });
}
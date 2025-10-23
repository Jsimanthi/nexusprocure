import { prisma } from './prisma';
import { PurchaseOrder, Vendor } from '@prisma/client';
import logger from './logger';

export async function updateVendorPerformanceMetrics(vendorId: string) {
  logger.info(`Updating performance metrics for vendor ${vendorId}`);

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        purchaseOrders: {
          where: {
            status: {
              in: ['ORDERED', 'DELIVERED', 'COMPLETED'],
            },
          },
        },
      },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const orders = vendor.purchaseOrders;

    if (orders.length === 0) {
      logger.info(`No orders found for vendor ${vendorId}`);
      return;
    }

    // Calculate on-time delivery rate
    const deliveredOrders = orders.filter((order: PurchaseOrder) => order.status === 'DELIVERED' || order.status === 'COMPLETED');
    const onTimeOrders = deliveredOrders.filter((order: PurchaseOrder) => {
      if (!order.expectedDeliveryDate || !order.fulfilledAt) return false;
      return order.fulfilledAt <= order.expectedDeliveryDate;
    });

    const onTimeDeliveryRate = deliveredOrders.length > 0 ? (onTimeOrders.length / deliveredOrders.length) * 100 : 0;

    // Calculate average quality score
    const ordersWithScores = orders.filter((order: PurchaseOrder) => order.qualityScore !== null);
    const averageQualityScore = ordersWithScores.length > 0
      ? ordersWithScores.reduce((sum: number, order: PurchaseOrder) => sum + (order.qualityScore || 0), 0) / ordersWithScores.length
      : 0;

    // Update vendor metrics
    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        onTimeDeliveryRate,
        averageQualityScore,
      },
    });

    logger.info(`Updated vendor ${vendorId} metrics: onTimeRate=${onTimeDeliveryRate}, qualityScore=${averageQualityScore}`);

  } catch (error) {
    logger.error(`Failed to update vendor performance metrics for ${vendorId}: ${String(error)}`);
    throw new Error(`Failed to update vendor performance metrics: ${String(error)}`);
  }
}

export async function getVendorScore(vendorId: string): Promise<number> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
  });

  if (!vendor) {
    throw new Error('Vendor not found');
  }

  // Calculate weighted score
  const onTimeWeight = 0.4;
  const qualityWeight = 0.6;

  const onTimeScore = vendor.onTimeDeliveryRate / 100; // Normalize to 0-1
  const qualityScore = vendor.averageQualityScore / 5; // Assuming 5 is max score

  const totalScore = (onTimeScore * onTimeWeight) + (qualityScore * qualityWeight);

  return totalScore * 100; // Return as percentage
}

type VendorWithScore = Vendor & { score: number };

export async function getTopVendors(limit: number = 5): Promise<VendorWithScore[]> {
  const vendors = await prisma.vendor.findMany({
    include: {
      purchaseOrders: {
        where: {
          status: {
            in: ['ORDERED', 'DELIVERED', 'COMPLETED'],
          },
        },
      },
    },
    orderBy: {
      onTimeDeliveryRate: 'desc',
    },
    take: limit,
  });

  const vendorsWithScores = await Promise.all(
    vendors.map(async (vendor: Vendor) => ({
      ...vendor,
      score: await getVendorScore(vendor.id),
    }))
  );

  return vendorsWithScores;
}

export async function getVendors({ page = 1, pageSize = 10 }: { page?: number; pageSize?: number }) {
  const skip = (page - 1) * pageSize;

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.vendor.count(),
  ]);

  return { vendors, total };
}

export async function getVendorById(id: string) {
  try {
    return await prisma.vendor.findUnique({
      where: { id },
    });
  } catch (error) {
    logger.error(`Failed to get vendor by id ${id}: ${String(error)}`);
    throw new Error(`Failed to get vendor: ${String(error)}`);
  }
}

export async function createVendor(data: any) {
  try {
    return await prisma.vendor.create({
      data: {
        ...data,
        onTimeDeliveryRate: 0,
        averageQualityScore: 0,
      },
    });
  } catch (error) {
    logger.error(`Failed to create vendor: ${String(error)}`);
    throw new Error(`Failed to create vendor: ${String(error)}`);
  }
}

export async function updateVendor(id: string, data: any) {
  try {
    return await prisma.vendor.update({
      where: { id },
      data,
    });
  } catch (error) {
    logger.error(`Failed to update vendor ${id}: ${String(error)}`);
    throw new Error(`Failed to update vendor: ${String(error)}`);
  }
}

export async function deleteVendor(id: string) {
  try {
    return await prisma.vendor.delete({
      where: { id },
    });
  } catch (error) {
    logger.error(`Failed to delete vendor ${id}: ${String(error)}`);
    throw new Error(`Failed to delete vendor: ${String(error)}`);
  }
}

export async function getAllVendorsForExport() {
  try {
    return await prisma.vendor.findMany({
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    logger.error(`Failed to get all vendors for export: ${String(error)}`);
    throw new Error(`Failed to get vendors for export: ${String(error)}`);
  }
}
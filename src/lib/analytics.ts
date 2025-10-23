import { prisma } from './prisma';
import logger from './logger';

export async function computeAnalytics(type: 'daily' | 'weekly' | 'monthly', date: string) {
  logger.info(`Computing ${type} analytics for ${date}`);

  try {
    const startDate = new Date(date);
    const endDate = new Date(startDate);

    switch (type) {
      case 'daily':
        endDate.setDate(startDate.getDate() + 1);
        break;
      case 'weekly':
        endDate.setDate(startDate.getDate() + 7);
        break;
      case 'monthly':
        endDate.setMonth(startDate.getMonth() + 1);
        break;
    }

    // Compute basic metrics
    const iomCount = await prisma.iOM.count({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const poCount = await prisma.purchaseOrder.count({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const prCount = await prisma.paymentRequest.count({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const totalAmount = await prisma.purchaseOrder.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      _sum: {
        grandTotal: true,
      },
    });

    // Store in analytics table (if exists) or log
    logger.info(`Analytics for ${type} ${date}: IOMs: ${iomCount}, POs: ${poCount}, PRs: ${prCount}, Total: ${totalAmount._sum.grandTotal}`);

    // TODO: Store in database or send to external service

  } catch (error) {
    logger.error(`Failed to compute analytics for ${type} ${date}: ${error}`);
    throw error;
  }
}

export async function scheduleDailyAnalytics() {
  const today = new Date().toISOString().split('T')[0];
  await computeAnalytics('daily', today);
}

export async function scheduleWeeklyAnalytics() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const date = weekAgo.toISOString().split('T')[0];
  await computeAnalytics('weekly', date);
}

export async function scheduleMonthlyAnalytics() {
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const date = monthAgo.toISOString().split('T')[0];
  await computeAnalytics('monthly', date);
}
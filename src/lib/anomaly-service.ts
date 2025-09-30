import { prisma } from './prisma';
import { createNotification } from './notification';

const PO_VOLUME_THRESHOLD = 10; // 10 POs
const TIME_WINDOW_HOURS = 1; // in the last hour

/**
 * Checks for high-volume PO creation anomaly for a specific user.
 * If an anomaly is detected, it notifies all administrators.
 * @param userId - The ID of the user who created the PO.
 * @param createdPoNumber - The number of the PO that was just created.
 */
export async function checkPoVolumeAnomaly(userId: string, createdPoNumber: string) {
  try {
    const timeWindow = new Date();
    timeWindow.setHours(timeWindow.getHours() - TIME_WINDOW_HOURS);

    const poCreationCount = await prisma.auditLog.count({
      where: {
        userId: userId,
        model: 'PurchaseOrder',
        action: 'CREATE',
        createdAt: {
          gte: timeWindow,
        },
      },
    });

    if (poCreationCount > PO_VOLUME_THRESHOLD) {
      console.warn(`ANOMALY DETECTED: User ${userId} created ${poCreationCount} POs in the last hour.`);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      const admins = await prisma.user.findMany({
        where: {
          role: {
            name: 'Administrator',
          },
        },
      });

      const notificationMessage = `Potential anomaly detected: User ${user?.name || userId} created ${poCreationCount} purchase orders in the last hour. The most recent was ${createdPoNumber}.`;

      for (const admin of admins) {
        await createNotification(admin.id, notificationMessage);
      }
    }
  } catch (error) {
    // We don't want to block the PO creation process if this fails,
    // so we just log the error.
    console.error('Error checking for PO volume anomaly:', error);
  }
}
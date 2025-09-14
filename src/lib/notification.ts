import { prisma } from "./prisma";
import { triggerPusherEvent } from "./pusher";

export async function createNotification(userId: string, message: string) {
  try {
    // 1. Save notification to the database
    const notification = await prisma.notification.create({
      data: {
        userId,
        message,
      },
    });

    // 2. Trigger a real-time event using Pusher
    const channel = `private-user-${userId}`;
    const event = "new-notification";
    await triggerPusherEvent(channel, event, { message });

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}

export async function getNotifications(userId: string) {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20, // Get the 20 most recent notifications
  });
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  // Ensure the user owns the notification before marking as read
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId: userId,
    },
  });

  if (!notification) {
    throw new Error("Notification not found or user does not have permission.");
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: {
      userId: userId,
      read: false,
    },
    data: {
      read: true,
    },
  });
}

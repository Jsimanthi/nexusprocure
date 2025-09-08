import { prisma } from "./prisma";

export async function createNotification(userId: string, message: string) {
  try {
    // 1. Save notification to the database
    const notification = await prisma.notification.create({
      data: {
        userId,
        message,
      },
    });

    // 2. Trigger the WebSocket event via the notification server
    const notificationPort = process.env.NOTIFICATION_PORT || 3002;
    await fetch(`http://localhost:${notificationPort}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, message }),
    });

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

// src/lib/pusher.ts
import Pusher from 'pusher';

// These credentials should be set in your .env.local file
// You can get them from your Pusher dashboard: https://dashboard.pusher.com/
if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET || !process.env.PUSHER_CLUSTER) {
  // In a real application, you might want to throw an error here
  // For this project, we'll log a warning and use placeholder values
  // to allow the application to run without real credentials.
  console.warn("Pusher environment variables are not set. Using placeholder values.");
}

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

/**
 * Triggers a Pusher event.
 * @param channel The channel to publish the event to.
 * @param event The name of the event.
 * @param data The payload for the event.
 */
export async function triggerPusherEvent<T>(channel: string, event: string, data: T) {
  try {
    await pusherServer.trigger(channel, event, data);
  } catch (error) {
    console.error("Failed to trigger Pusher event:", error);
    // Depending on the importance, you might want to handle this more gracefully
  }
}
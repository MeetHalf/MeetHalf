import Pusher from 'pusher';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET || !process.env.PUSHER_CLUSTER) {
  console.warn('[Pusher] Missing Pusher environment variables. Real-time features will be disabled.');
}

export const pusher = process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET && process.env.PUSHER_CLUSTER
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    })
  : null;

/**
 * Trigger a Pusher event on an event channel
 */
export function triggerEventChannel(eventId: number, eventName: string, data: any): void {
  if (!pusher) {
    console.warn(`[Pusher] Pusher not configured. Skipping event: ${eventName} on channel event-${eventId}`);
    return;
  }

  pusher.trigger(`event-${eventId}`, eventName, data).catch((error) => {
    console.error(`[Pusher] Error triggering event ${eventName} on channel event-${eventId}:`, error);
  });
}


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
  const channelName = `event-${eventId}`;
  
  console.log('[Pusher] Attempting to trigger event:', {
    channel: channelName,
    event: eventName,
    data,
    timestamp: new Date().toISOString(),
    pusherConfig: {
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY?.substring(0, 10) + '...',
      cluster: process.env.PUSHER_CLUSTER,
    },
  });

  if (!pusher) {
    console.warn(`[Pusher] Pusher not configured. Skipping event: ${eventName} on channel ${channelName}`);
    console.warn('[Pusher] Environment variables:', {
      PUSHER_APP_ID: !!process.env.PUSHER_APP_ID,
      PUSHER_KEY: !!process.env.PUSHER_KEY,
      PUSHER_SECRET: !!process.env.PUSHER_SECRET,
      PUSHER_CLUSTER: process.env.PUSHER_CLUSTER || 'not set',
    });
    return;
  }

  // Use the same format as official example: pusher.trigger("my-channel", "my-event", {...})
  pusher.trigger(channelName, eventName, data)
    .then(() => {
      console.log('[Pusher] ✓ Successfully triggered event:', {
        channel: channelName,
        event: eventName,
        data,
        timestamp: new Date().toISOString(),
      });
    })
    .catch((error) => {
      console.error(`[Pusher] ✗ Error triggering event ${eventName} on channel ${channelName}:`, {
        error: error.message,
        stack: error.stack,
        errorCode: error.code,
        errorStatus: error.status,
        data,
      });
    });
}


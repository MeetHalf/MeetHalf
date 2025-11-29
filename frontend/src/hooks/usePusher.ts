import { useEffect, useRef, useCallback } from 'react';
import Pusher from 'pusher-js';
import type { Channel, PresenceChannel } from 'pusher-js';

/**
 * Pusher event handler type
 */
export type PusherEventHandler = (data: any) => void;

/**
 * Hook options
 */
export interface UsePusherOptions {
  /**
   * Channel name to subscribe to (e.g., 'event-1')
   */
  channelName: string | null;
  /**
   * Event name to listen for (e.g., 'poke')
   */
  eventName: string;
  /**
   * Handler function called when event is received
   */
  onEvent: PusherEventHandler;
  /**
   * Called when connection is established
   */
  onConnected?: () => void;
  /**
   * Called when connection fails
   */
  onError?: (error: Error) => void;
  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Custom hook for Pusher real-time events
 * 
 * @example
 * ```tsx
 * usePusher({
 *   channelName: eventId ? `event-${eventId}` : null,
 *   eventName: 'poke',
 *   onEvent: (data) => {
 *     console.log('Poke received:', data);
 *   },
 * });
 * ```
 */
export function usePusher(options: UsePusherOptions): void {
  const {
    channelName,
    eventName,
    onEvent,
    onConnected,
    onError,
    debug = false,
  } = options;

  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);

  const log = useCallback(
    (message: string, ...args: any[]) => {
      if (debug) {
        console.log(`[usePusher] ${message}`, ...args);
      }
    },
    [debug]
  );

  // Initialize Pusher
  useEffect(() => {
    const pusherKey = import.meta.env.VITE_PUSHER_KEY;
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER;

    if (!pusherKey || !pusherCluster) {
      const error = new Error('Pusher configuration missing. Please set VITE_PUSHER_KEY and VITE_PUSHER_CLUSTER');
      console.error('[usePusher]', error.message);
      onError?.(error);
      return;
    }

    log('Initializing Pusher', { key: pusherKey.substring(0, 10) + '...', cluster: pusherCluster });

    try {
      const pusher = new Pusher(pusherKey, {
        cluster: pusherCluster,
        enabledTransports: ['ws', 'wss'],
      });

      pusherRef.current = pusher;

      // Connection event handlers
      pusher.connection.bind('connected', () => {
        log('Pusher connected');
        onConnected?.();
      });

      pusher.connection.bind('error', (error: Error) => {
        log('Pusher connection error', error);
        onError?.(error);
      });

      pusher.connection.bind('disconnected', () => {
        log('Pusher disconnected');
      });

      return () => {
        log('Cleaning up Pusher connection');
        pusher.disconnect();
        pusherRef.current = null;
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to initialize Pusher');
      console.error('[usePusher]', err);
      onError?.(err);
    }
  }, [onConnected, onError, log]);

  // Subscribe to channel and bind event
  useEffect(() => {
    if (!pusherRef.current || !channelName) {
      log('Skipping subscription: pusher not initialized or channelName is null');
      return;
    }

    log('Subscribing to channel', channelName);

    try {
      const channel = pusherRef.current.subscribe(channelName);
      channelRef.current = channel;

      channel.bind('pusher:subscription_succeeded', () => {
        log('Successfully subscribed to channel', channelName);
      });

      channel.bind('pusher:subscription_error', (error: any) => {
        log('Subscription error', error);
        onError?.(new Error(`Failed to subscribe to channel: ${channelName}`));
      });

      // Bind to the event
      channel.bind(eventName, (data: any) => {
        log(`Event received: ${eventName}`, data);
        onEvent(data);
      });

      return () => {
        log('Unsubscribing from channel', channelName);
        if (channelRef.current) {
          channelRef.current.unbind(eventName);
          pusherRef.current?.unsubscribe(channelName);
          channelRef.current = null;
        }
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(`Failed to subscribe to channel: ${channelName}`);
      console.error('[usePusher]', err);
      onError?.(err);
    }
  }, [channelName, eventName, onEvent, onError, log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current && pusherRef.current) {
        log('Cleaning up on unmount');
        channelRef.current.unbind(eventName);
        pusherRef.current.unsubscribe(channelRef.current.name);
        channelRef.current = null;
      }
      if (pusherRef.current) {
        pusherRef.current.disconnect();
        pusherRef.current = null;
      }
    };
  }, [eventName, log]);
}


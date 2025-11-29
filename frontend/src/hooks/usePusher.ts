import { useEffect, useRef, useState, useCallback } from 'react';
import Pusher, { Channel } from 'pusher-js';

// Pusher 配置
const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY;
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || 'ap3';

// 連線狀態類型
export type ConnectionState = 
  | 'initialized' 
  | 'connecting' 
  | 'connected' 
  | 'unavailable' 
  | 'failed' 
  | 'disconnected';

/**
 * usePusher Hook
 * 
 * 處理 Pusher 即時連線和事件訂閱
 * 
 * @param channelName - Channel 名稱（例如: `event-${eventId}`）
 * @param enabled - 是否啟用連線
 * @returns Pusher channel 實例和連線狀態
 * 
 * @example
 * ```tsx
 * const { channel, connectionState } = usePusher(`event-${eventId}`, true);
 * 
 * useEffect(() => {
 *   if (!channel) return;
 *   
 *   const handleLocationUpdate = (data: LocationUpdateEvent) => {
 *     console.log('Location update:', data);
 *   };
 *   
 *   channel.bind('location-update', handleLocationUpdate);
 *   
 *   return () => {
 *     channel.unbind('location-update', handleLocationUpdate);
 *   };
 * }, [channel]);
 * ```
 */
export function usePusher(channelName: string, enabled: boolean = true) {
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('initialized');
  const [error, setError] = useState<string | null>(null);

  // 初始化 Pusher
  useEffect(() => {
    // 如果未啟用或缺少配置，則不初始化
    if (!enabled || !PUSHER_KEY) {
      if (!PUSHER_KEY) {
        console.warn('[usePusher] VITE_PUSHER_KEY not found. Pusher disabled.');
        setError('Pusher configuration missing');
      }
      return;
    }

    // 避免重複初始化
    if (pusherRef.current) {
      return;
    }

    try {
      console.log('[usePusher] Initializing Pusher...');
      
      // 創建 Pusher 實例
      const pusher = new Pusher(PUSHER_KEY, {
        cluster: PUSHER_CLUSTER,
        forceTLS: true, // 強制使用 TLS
      });

      pusherRef.current = pusher;

      // 監聽連線狀態
      pusher.connection.bind('state_change', (states: { previous: string; current: string }) => {
        console.log(`[usePusher] State changed: ${states.previous} → ${states.current}`);
        setConnectionState(states.current as ConnectionState);
      });

      // 監聽連線錯誤
      pusher.connection.bind('error', (err: any) => {
        console.error('[usePusher] Connection error:', err);
        setError(err.message || 'Connection error');
      });

      console.log('[usePusher] Pusher initialized successfully');
    } catch (err) {
      console.error('[usePusher] Failed to initialize Pusher:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize Pusher');
    }

    // Cleanup: 斷開連線
    return () => {
      if (pusherRef.current) {
        console.log('[usePusher] Disconnecting Pusher...');
        pusherRef.current.disconnect();
        pusherRef.current = null;
      }
    };
  }, [enabled]);

  // 訂閱 Channel
  useEffect(() => {
    if (!enabled || !pusherRef.current || !channelName) {
      return;
    }

    // 避免重複訂閱
    if (channelRef.current) {
      return;
    }

    try {
      console.log(`[usePusher] Subscribing to channel: ${channelName}`);
      
      const channel = pusherRef.current.subscribe(channelName);
      channelRef.current = channel;

      // 監聽訂閱成功
      channel.bind('pusher:subscription_succeeded', () => {
        console.log(`[usePusher] Subscribed to ${channelName}`);
      });

      // 監聽訂閱錯誤
      channel.bind('pusher:subscription_error', (status: any) => {
        console.error(`[usePusher] Subscription error for ${channelName}:`, status);
        setError(`Failed to subscribe to ${channelName}`);
      });
    } catch (err) {
      console.error(`[usePusher] Failed to subscribe to ${channelName}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
    }

    // Cleanup: 取消訂閱
    return () => {
      if (pusherRef.current && channelRef.current) {
        console.log(`[usePusher] Unsubscribing from channel: ${channelName}`);
        pusherRef.current.unsubscribe(channelName);
        channelRef.current = null;
      }
    };
  }, [enabled, channelName]);

  // 手動重新連線
  const reconnect = useCallback(() => {
    if (pusherRef.current) {
      console.log('[usePusher] Reconnecting...');
      pusherRef.current.connect();
    }
  }, []);

  // 手動斷開連線
  const disconnect = useCallback(() => {
    if (pusherRef.current) {
      console.log('[usePusher] Disconnecting...');
      pusherRef.current.disconnect();
    }
  }, []);

  return {
    channel: channelRef.current,
    pusher: pusherRef.current,
    connectionState,
    error,
    reconnect,
    disconnect,
    isConnected: connectionState === 'connected',
  };
}

/**
 * useEventChannel Hook
 * 
 * 專門用於訂閱 Event 相關的 Pusher channel
 * 
 * @param eventId - Event ID
 * @param enabled - 是否啟用
 * @returns Pusher channel 和連線狀態
 * 
 * @example
 * ```tsx
 * const { channel } = useEventChannel(eventId, true);
 * 
 * useEffect(() => {
 *   if (!channel) return;
 *   
 *   channel.bind('location-update', handleLocationUpdate);
 *   channel.bind('member-arrived', handleMemberArrived);
 *   channel.bind('poke', handlePoke);
 *   
 *   return () => {
 *     channel.unbind_all();
 *   };
 * }, [channel]);
 * ```
 */
export function useEventChannel(eventId: string | undefined, enabled: boolean = true) {
  const channelName = eventId ? `event-${eventId}` : '';
  return usePusher(channelName, enabled && !!eventId);
}

export default usePusher;


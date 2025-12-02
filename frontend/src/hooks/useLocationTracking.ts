import { useEffect, useRef } from 'react';
import { eventsApi } from '../api/events';
import { LOCATION_CONFIG } from '../config/location';

interface UseLocationTrackingOptions {
  enabled: boolean;
  eventId: number;
  shareLocation: boolean;
  hasJoined: boolean;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  onError?: (error: Error) => void;
}

/**
 * Hook for tracking user location and updating it to the backend
 * Uses navigator.geolocation.watchPosition for continuous tracking
 */
export function useLocationTracking({
  enabled,
  eventId,
  shareLocation,
  hasJoined,
  startTime,
  endTime,
  onError,
}: UseLocationTrackingOptions) {
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  useEffect(() => {
    // Check if tracking should be enabled
    if (!enabled || !shareLocation || !hasJoined) {
      // Clean up if disabled
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    // Check if geolocation is available
    if (!navigator.geolocation) {
      const error = new Error('Geolocation is not supported by this browser');
      console.error('[useLocationTracking]', error);
      onError?.(error);
      return;
    }

    // Check if within time window (startTime - 30min to endTime + 30min)
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    const windowStart = new Date(start.getTime() - LOCATION_CONFIG.TIME_WINDOW_BEFORE);
    const windowEnd = new Date(end.getTime() + LOCATION_CONFIG.TIME_WINDOW_AFTER);

    if (now < windowStart || now > windowEnd) {
      console.log('[useLocationTracking] Outside time window', {
        now,
        windowStart,
        windowEnd,
      });
      return;
    }

    // Start watching position
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const now = Date.now();

        // Throttle updates to avoid too frequent API calls
        if (now - lastUpdateTimeRef.current < LOCATION_CONFIG.UPDATE_INTERVAL) {
          return;
        }

        lastUpdateTimeRef.current = now;

        try {
          console.log('[useLocationTracking] Updating location', {
            lat: latitude,
            lng: longitude,
            eventId,
          });

          await eventsApi.updateLocation(eventId, {
            lat: latitude,
            lng: longitude,
          });

          console.log('[useLocationTracking] Location updated successfully');
        } catch (error) {
          console.error('[useLocationTracking] Failed to update location:', error);
          onError?.(error instanceof Error ? error : new Error('Failed to update location'));
        }
      },
      (error) => {
        console.error('[useLocationTracking] Geolocation error:', error);
        onError?.(new Error(`Geolocation error: ${error.message}`));
      },
      {
        enableHighAccuracy: LOCATION_CONFIG.HIGH_ACCURACY,
        timeout: LOCATION_CONFIG.TIMEOUT,
        maximumAge: LOCATION_CONFIG.MAXIMUM_AGE,
      }
    );

    watchIdRef.current = watchId;

    // Cleanup function
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, eventId, shareLocation, hasJoined, startTime, endTime, onError]);
}


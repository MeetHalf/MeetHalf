import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  withCredentials: true,
});

// Helper function to get guest token from localStorage for any event
function getGuestTokenForEvent(eventId: number | string): string | null {
  try {
    const storageKey = `event_${eventId}_member`;
    const storedMember = localStorage.getItem(storageKey);
    if (storedMember) {
      const memberData = JSON.parse(storedMember);
      return memberData.guestToken || null;
    }
  } catch (error) {
    console.error('Error reading guest token from localStorage:', error);
  }
  return null;
}

// Helper function to extract event ID from URL
function extractEventIdFromUrl(url: string): string | null {
  // Match patterns like:
  // /events/123/join
  // /events/123/poke
  // /events/123/location
  // /events/123/arrival
  const match = url.match(/\/events\/(\d+)(?:\/|$)/);
  return match ? match[1] : null;
}

// Request interceptor: Add Authorization header with guest token if available
api.interceptors.request.use(
  (config) => {
    // Try to extract event ID from URL
    const url = config.url || '';
    const eventId = extractEventIdFromUrl(url);
    
    if (eventId) {
      const guestToken = getGuestTokenForEvent(eventId);
      
      // Debug logging for poke endpoint
      if (url.includes('/poke')) {
        console.log('[axios] Poke request - Token check:', {
          eventId,
          hasGuestToken: !!guestToken,
          tokenLength: guestToken ? guestToken.length : 0,
          tokenPrefix: guestToken ? guestToken.substring(0, 20) + '...' : 'none',
          hasExistingAuth: !!config.headers['Authorization'],
          url,
        });
      }
      
      // Only add guest token if:
      // 1. We have a guest token
      // 2. No Authorization header is already set (don't override existing auth)
      if (guestToken && !config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${guestToken}`;
        if (url.includes('/poke')) {
          console.log('[axios] ✓ Added Authorization header with guest token');
        }
      } else if (url.includes('/poke') && !guestToken) {
        console.warn('[axios] ⚠️ No guest token found for event:', eventId);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;



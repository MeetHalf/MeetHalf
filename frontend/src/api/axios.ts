import axios from 'axios';

// Debug: Log the API base URL to help diagnose issues
// IMPORTANT: Vite environment variables must be prefixed with VITE_ and are only available at build time
const apiBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Validate that we have a proper base URL
if (!apiBaseURL || apiBaseURL === 'undefined' || apiBaseURL.includes('undefined')) {
  console.error('[API] ERROR: Invalid API base URL:', apiBaseURL);
  console.error('[API] VITE_API_BASE_URL env var:', import.meta.env.VITE_API_BASE_URL);
  throw new Error('VITE_API_BASE_URL is not properly configured. Please set it in Vercel environment variables.');
}

console.log('[API] Base URL:', apiBaseURL);
console.log('[API] Environment variables:', {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD,
  DEV: import.meta.env.DEV,
});

const api = axios.create({
  baseURL: apiBaseURL,
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
      
      // Only add guest token if:
      // 1. We have a guest token
      // 2. No Authorization header is already set (don't override existing auth)
      if (guestToken && !config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${guestToken}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;



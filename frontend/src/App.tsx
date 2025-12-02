import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { AuthProvider } from './hooks/useAuth';
import { router } from './router';
import { theme } from './theme';

// Handle temporary auth token from URL (mobile fallback for when cookies are blocked)
// This uses a secure one-time token exchange mechanism
async function handleTempAuthTokenFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const tempToken = urlParams.get('auth_temp');
  
  if (tempToken) {
    console.log('[App] Temporary auth token found in URL (mobile fallback)');
    
    try {
      // Remove token from URL immediately for security
      urlParams.delete('auth_temp');
      const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '');
      window.history.replaceState({}, '', newUrl);
      
      // Exchange temporary token for real JWT via API
      const api = (await import('./api/axios')).default;
      const response = await api.post('/auth/exchange-temp-token', {
        tempToken,
      });
      
      const { token } = response.data;
      
      console.log('[App] Successfully exchanged temp token for JWT');
      
      // Store JWT in sessionStorage (more secure than localStorage - cleared on tab close)
      // This is a fallback when cookies are blocked
      sessionStorage.setItem('auth_token', token);
      console.log('[App] JWT stored in sessionStorage as backup');
      
      // Also try to set it as a cookie via JavaScript (if possible)
      // Note: This won't work if HttpOnly is required, but helps in some cases
      const isSecure = window.location.protocol === 'https:';
      const maxAge = 7 * 24 * 60 * 60; // 7 days
      const cookieString = `token=${token}; path=/; max-age=${maxAge}; SameSite=None${isSecure ? '; Secure' : ''}`;
      document.cookie = cookieString;
      console.log('[App] Attempted to set cookie via JavaScript');
      
      // Trigger auth refresh by reloading
      console.log('[App] Reloading page to apply auth token');
      window.location.reload();
    } catch (error: any) {
      console.error('[App] Error exchanging temp token:', error);
      // Redirect to login on error
      window.location.href = '/login?error=token_exchange_failed';
    }
  }
}

function App() {
  // Handle temporary auth token from URL on mount (for mobile fallback)
  useEffect(() => {
    handleTempAuthTokenFromURL();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;


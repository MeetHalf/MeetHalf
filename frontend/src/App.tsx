import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { CssBaseline, ThemeProvider, Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './hooks/useAuth';
import { router } from './router';
import { theme } from './theme';

// Handle temporary auth token from URL (mobile fallback for when cookies are blocked)
async function handleTempAuthTokenFromURL(): Promise<boolean> {
  const urlParams = new URLSearchParams(window.location.search);
  const tempToken = urlParams.get('auth_temp');
  
  if (tempToken) {
    console.log('[App] Temporary auth token found in URL (mobile fallback)');
    
    try {
      urlParams.delete('auth_temp');
      const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '');
      window.history.replaceState({}, '', newUrl);
      
      const api = (await import('./api/axios')).default;
      const response = await api.post('/auth/exchange-temp-token', {
        tempToken,
      });
      
      const { token } = response.data;
      console.log('[App] Successfully exchanged temp token for JWT');
      
      sessionStorage.setItem('auth_token', token);
      console.log('[App] JWT stored in sessionStorage as backup');
      
      const isSecure = window.location.protocol === 'https:';
      const maxAge = 7 * 24 * 60 * 60;
      const cookieString = `token=${token}; path=/; max-age=${maxAge}; SameSite=None${isSecure ? '; Secure' : ''}`;
      document.cookie = cookieString;
      console.log('[App] Attempted to set cookie via JavaScript');
      
      console.log('[App] Token exchange complete, triggering auth refresh');
      window.dispatchEvent(new Event('auth-token-updated'));
      
      setTimeout(() => {
        console.log('[App] Reloading page to ensure auth state is synced');
        window.location.reload();
      }, 500);
      
      return true;
    } catch (error: any) {
      console.error('[App] Error exchanging temp token:', error);
      window.location.href = '/login?error=token_exchange_failed';
      return false;
    }
  }
  return false;
}

function App() {
  const [isExchangingToken, setIsExchangingToken] = useState(false);

  useEffect(() => {
    console.log('[App] ===== App Component Mounted =====');
    console.log('[App] Current URL:', window.location.href);
    console.log('[App] User Agent:', navigator.userAgent);
    
    // Helper to log localStorage state
    try {
      const pendingRoute = localStorage.getItem('pending_invite_route');
      console.log('[App] Initial localStorage state:', {
        pending_invite_route: pendingRoute,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[App] Failed to read localStorage:', error);
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('auth_temp')) {
      console.log('[App] Found auth_temp token in URL');
      setIsExchangingToken(true);
      handleTempAuthTokenFromURL().then(() => {
        // Keep loading state until reload
      });
      return;
    } else {
      console.log('[App] No auth_temp token found, proceeding normally');
    }
  }, []);

  if (isExchangingToken) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}>
          <CircularProgress size={60} thickness={4} sx={{ mb: 4 }} />
          <div style={{ fontSize: '1.2rem', fontWeight: 500, color: '#555' }}>
            正在完成登入...
          </div>
        </Box>
      </ThemeProvider>
    );
  }

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

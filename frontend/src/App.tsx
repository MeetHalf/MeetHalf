import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { AuthProvider } from './hooks/useAuth';
import { router } from './router';
import { theme } from './theme';

/**
 * Reload redirect handler - explicitly redirects to root "/" on page reload
 * 
 * This prevents 404 errors when refreshing on routes like /events.
 * When the page reloads, we redirect to "/" and let the router handle navigation.
 */
function ReloadRedirectHandler() {
  useEffect(() => {
    const currentPath = window.location.pathname;
    
    // Explicit reload redirect logic: if not on root, redirect to "/"
    // This handles all page reloads (F5, browser refresh, direct URL access)
    // The router will then automatically navigate to the correct route via the "/" -> "/events" redirect
    if (currentPath !== '/') {
      console.log('[ReloadRedirect] Redirecting from', currentPath, 'to / (reload detected)');
      window.location.replace('/');
    }
  }, []);

  return null;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ReloadRedirectHandler />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;


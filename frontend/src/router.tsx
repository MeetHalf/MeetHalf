import { createBrowserRouter, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import CreateEvent from './pages/CreateEvent';
import InvitePage from './pages/InvitePage';
import { Box, CircularProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PENDING_INVITE_ROUTE_KEY } from './pages/InvitePage';

// PWA detection utility
function isPWA(): boolean {
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  return false;
}

// Component to handle PWA navigation from localStorage
function PWANavigationHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (hasChecked) return;
    
    const timer = setTimeout(() => {
      if (isPWA()) {
        const pendingRoute = localStorage.getItem(PENDING_INVITE_ROUTE_KEY);
        console.log('[PWA Navigation] Checking localStorage:', {
          isPWA: true,
          pendingRoute,
          currentPath: location.pathname,
          timestamp: new Date().toISOString(),
        });
        
        if (pendingRoute && pendingRoute !== location.pathname && !location.pathname.startsWith('/invite/')) {
          console.log('[PWA Navigation] Found pending route, navigating to:', pendingRoute);
          localStorage.removeItem(PENDING_INVITE_ROUTE_KEY);
          navigate(pendingRoute, { replace: true });
        } else if (pendingRoute) {
          console.log('[PWA Navigation] Skipping navigation:', {
            reason: pendingRoute === location.pathname ? 'already on target route' : 'on invite page',
            pendingRoute,
            currentPath: location.pathname,
          });
        }
      } else {
        console.log('[PWA Navigation] Not in PWA mode, skipping check');
      }
      setHasChecked(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [navigate, location.pathname, hasChecked]);

  return null;
}

// Root layout that wraps all routes
function RootLayout() {
  return (
    <>
      <PWANavigationHandler />
      <Outlet />
    </>
  );
}

// Redirect helper that preserves query parameters
function RedirectToEvents() {
  const location = useLocation();
  return <Navigate to={`/events${location.search}`} replace />;
}

// Loading Route wrapper
function LoadingRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
}

// 404 Page - only shows for truly invalid routes
function NotFoundPage() {
  return (
    <Layout>
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <h1>404 - 頁面不存在</h1>
        <p>您訪問的頁面不存在</p>
      </Box>
    </Layout>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <RedirectToEvents />,
      },
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/invite/:token',
        element: <InvitePage />,
      },
      {
        path: '/events',
        element: (
          <LoadingRoute>
            <Events />
          </LoadingRoute>
        ),
      },
      {
        path: '/events/new',
        element: (
          <LoadingRoute>
            <CreateEvent />
          </LoadingRoute>
        ),
      },
      {
        path: '/events/:id',
        element: (
          <LoadingRoute>
            <EventDetail />
          </LoadingRoute>
        ),
      },
      {
        path: '/groups',
        element: <Navigate to="/events" replace />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);



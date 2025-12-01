import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import CreateEvent from './pages/CreateEvent';
import { Box, CircularProgress } from '@mui/material';

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

// 404 Page with auto-redirect for valid SPA routes
function NotFoundPage() {
  const location = useLocation();

  useEffect(() => {
    // If we hit 404 on a route that should be handled by SPA routing,
    // redirect to root and let the router handle it
    const currentPath = location.pathname;
    
    // Check if current path matches any valid route pattern
    // Valid routes: /, /login, /events, /events/new, /events/:id
    const isValidRoute = 
      currentPath === '/' ||
      currentPath === '/login' ||
      currentPath.startsWith('/events');

    if (isValidRoute) {
      // Redirect to root, router will handle navigation
      // Use replace to avoid adding to history
      window.location.replace('/');
    }
  }, [location.pathname]);

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
    path: '/',
    element: <Navigate to="/events" replace />,
  },
  {
    path: '/login',
    element: <Login />,
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
  // Legacy routes - redirect to events
  {
    path: '/groups',
    element: <Navigate to="/events" replace />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);



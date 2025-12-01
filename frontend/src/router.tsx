import { createBrowserRouter, Navigate } from 'react-router-dom';
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



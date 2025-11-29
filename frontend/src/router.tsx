import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Events from './pages/Events';
import GroupDetail from './pages/EventsDetail';
import EventRoom from './pages/EventRoom';
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
    path: '/events/:id',
    element: (
      <LoadingRoute>
        <GroupDetail />
      </LoadingRoute>
    ),
  },
  {
    path: '/gatherings/:id',
    element: (
      <LoadingRoute>
        <EventRoom />
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
    element: (
      <Layout>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <h1>404 - 頁面不存在</h1>
          <p>您訪問的頁面不存在</p>
        </Box>
      </Layout>
    ),
  },
]);



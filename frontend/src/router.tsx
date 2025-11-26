import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import { Box, CircularProgress } from '@mui/material';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

// Public Route wrapper (redirect to groups if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (user) {
    return <Navigate to="/groups" replace />;
  }

  return <Layout>{children}</Layout>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/groups" replace />,
  },
  {
    path: '/login',
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: '/groups',
    element: (
      <ProtectedRoute>
        <Groups />
      </ProtectedRoute>
    ),
  },
  {
    path: '/groups/:id',
    element: (
      <ProtectedRoute>
        <GroupDetail />
      </ProtectedRoute>
    ),
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



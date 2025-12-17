import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Events from './pages/Events';
import EventRoom from './pages/EventRoom';
import CreateEvent from './pages/CreateEvent';

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
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
}

// 404 Page
function NotFoundPage() {
  return (
    <Layout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">404 - 頁面不存在</h1>
        <p className="text-slate-500 mb-6">您訪問的頁面不存在</p>
        <a 
          href="/events" 
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
        >
          返回首頁
        </a>
      </div>
    </Layout>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RedirectToEvents />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/events',
    element: <Events />,
  },
  {
    path: '/events/new',
    element: <CreateEvent />,
  },
  {
    path: '/events/:id',
    element: <EventRoom />,
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

import { Box } from '@mui/material';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import { useAuth } from '../hooks/useAuth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname;
  const { user } = useAuth();

  // 判斷是否為 EventRoom 頁面（/events/:id 但不是 /events 或 /events/new）
  const isEventRoomPage = pathname.match(/^\/events\/\d+$/);

  // 判斷是否隱藏導航
  const shouldHideNav =
    isEventRoomPage ||
    pathname === '/login' ||
    pathname.startsWith('/invite/');

  if (shouldHideNav) {
    // 全屏模式：只顯示內容
    return <Box sx={{ minHeight: '100vh' }}>{children}</Box>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          // Add padding at bottom when bottom nav is visible
          pb: user ? { xs: '80px', md: '80px' } : 0,
        }}
      >
        {children}
      </Box>
      <BottomNav />
    </Box>
  );
}

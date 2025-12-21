import { Box } from '@mui/material';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNav from './BottomNav';

// 這些路徑不顯示底部導航欄
const hideBottomNavPaths = [
  '/events/', // EventRoom 頁面 (e.g., /events/123)
  '/login',
  '/invite/',
];

// 這些路徑完全不顯示 Layout（全屏模式）
const fullScreenPaths = [
  '/events/', // EventRoom 頁面
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname;

  // 判斷是否為 EventRoom 頁面（/events/:id 但不是 /events 或 /events/new）
  const isEventRoomPage = pathname.match(/^\/events\/\d+$/);
  
  // 判斷是否隱藏底部導航
  const shouldHideBottomNav = isEventRoomPage || 
    pathname === '/login' || 
    pathname.startsWith('/invite/');

  // 判斷是否為全屏模式（不顯示 Navbar 和 Footer）
  const isFullScreen = isEventRoomPage;

  if (isFullScreen) {
    // 全屏模式：只顯示內容
    return (
      <Box sx={{ minHeight: '100vh' }}>
        {children}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          // 為底部導航欄預留空間
          pb: shouldHideBottomNav ? 0 : '80px',
        }}
      >
        {children}
      </Box>
      {/* 在主要頁面隱藏 Footer，使用底部導航代替 */}
      {shouldHideBottomNav && <Footer />}
      {/* 底部導航欄 */}
      {!shouldHideBottomNav && <BottomNav />}
    </Box>
  );
}

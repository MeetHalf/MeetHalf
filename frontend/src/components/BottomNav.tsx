import { useNavigate, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import {
  Home as HomeIcon,
  People as PeopleIcon,
  Add as AddIcon,
  Map as MapIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  isCreate?: boolean;
}

const navItems: NavItem[] = [
  { path: '/events', icon: <HomeIcon sx={{ fontSize: 20 }} /> },
  { path: '/social', icon: <PeopleIcon sx={{ fontSize: 20 }} /> },
  { path: '/events/new', icon: <AddIcon sx={{ fontSize: 24 }} />, isCreate: true },
  { path: '/map', icon: <MapIcon sx={{ fontSize: 20 }} /> },
  { path: '/profile', icon: <PersonIcon sx={{ fontSize: 20 }} /> },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/events') {
      return location.pathname === '/events' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid',
        borderColor: 'rgba(241, 245, 249, 1)', // slate-100
        px: 4,
        py: 2,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        // Safe area for iOS
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      }}
    >
      {navItems.map((item) => {
        const active = isActive(item.path);

        if (item.isCreate) {
          // 中間的「建立」按鈕 - 藍色圓角方形
          return (
            <Box
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                width: 48,
                height: 48,
                borderRadius: 4, // rounded-2xl
                bgcolor: '#2563eb', // blue-600
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:active': {
                  transform: 'scale(0.9)',
                },
              }}
            >
              {item.icon}
            </Box>
          );
        }

        return (
          <Box
            key={item.path}
            onClick={() => navigate(item.path)}
            sx={{
              width: 48,
              height: 48,
              borderRadius: 4, // rounded-2xl
              bgcolor: active ? '#2563eb' : 'white',
              color: active ? 'white' : '#64748b', // slate-500
              boxShadow: active ? '0 4px 12px rgba(37, 99, 235, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
              border: active ? 'none' : '1px solid',
              borderColor: '#f1f5f9', // slate-100
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:active': {
                transform: 'scale(0.9)',
              },
            }}
          >
            {item.icon}
          </Box>
        );
      })}
    </Box>
  );
}

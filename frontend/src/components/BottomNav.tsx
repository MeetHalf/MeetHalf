import { useNavigate, useLocation } from 'react-router-dom';
import { Box, IconButton, Typography } from '@mui/material';
import {
  Home as HomeIcon,
  People as PeopleIcon,
  Add as AddIcon,
  Map as MapIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  isCreate?: boolean;
}

const navItems: NavItem[] = [
  { path: '/events', label: '首頁', icon: <HomeIcon /> },
  { path: '/social', label: '社交', icon: <PeopleIcon /> },
  { path: '/events/new', label: '建立', icon: <AddIcon />, isCreate: true },
  { path: '/map', label: '地圖', icon: <MapIcon /> },
  { path: '/profile', label: '個人', icon: <PersonIcon /> },
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
        bgcolor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(0, 0, 0, 0.05)',
        px: 2,
        py: 1,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        // Safe area for iOS
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}
    >
      {navItems.map((item) => {
        const active = isActive(item.path);

        if (item.isCreate) {
          // 中間的「建立」按鈕 - 突出顯示
          return (
            <Box
              key={item.path}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mt: -2, // 稍微上浮
              }}
            >
              <IconButton
                onClick={() => navigate(item.path)}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: '#3b82f6',
                  color: 'white',
                  borderRadius: 4,
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                  '&:hover': {
                    bgcolor: '#2563eb',
                    transform: 'scale(1.05)',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                {item.icon}
              </IconButton>
            </Box>
          );
        }

        return (
          <Box
            key={item.path}
            onClick={() => navigate(item.path)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              py: 0.5,
              px: 1.5,
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&:active': {
                transform: 'scale(0.9)',
              },
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: active ? '#3b82f6' : 'transparent',
                color: active ? 'white' : '#94a3b8',
                transition: 'all 0.2s ease',
                boxShadow: active ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
              }}
            >
              {item.icon}
            </Box>
            <Typography
              sx={{
                fontSize: '0.65rem',
                fontWeight: active ? 700 : 500,
                color: active ? '#3b82f6' : '#94a3b8',
                mt: 0.25,
              }}
            >
              {item.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}


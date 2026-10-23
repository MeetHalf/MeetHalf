import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Badge } from '@mui/material';
import { Home, Users, Plus, Map, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  isCreate?: boolean;
}

const navItems: NavItem[] = [
  {
    path: '/events',
    icon: <Home size={20} />,
  },
  {
    path: '/friends',
    icon: <Users size={20} />,
  },
  {
    path: '/events/new',
    icon: <Plus size={24} />,
    isCreate: true,
  },
  {
    path: '/map',
    icon: <Map size={20} />,
  },
  {
    path: '/profile',
    icon: <User size={20} />,
  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useChat(user?.userId ?? undefined);

  const isActive = (path: string) => {
    if (path === '/events') {
      return location.pathname === '/events' || location.pathname === '/';
    }
    if (path === '/friends') {
      return location.pathname.startsWith('/friends') || location.pathname.startsWith('/social');
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
        bgcolor: 'rgba(248, 250, 252, 0.92)',
        backdropFilter: 'blur(18px)',
        borderTop: '1px solid',
        borderColor: '#E4EAF2',
        px: { xs: 2, md: 4 },
        py: 1.25,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      }}
    >
      {navItems.map((item) => {
        const active = isActive(item.path);

        if (item.isCreate) {
          return (
            <Box
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: '#F28A25',
                border: '4px solid #F8FAFC',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px -4px rgba(242, 138, 37, 0.38)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              {item.icon}
            </Box>
          );
        }

        const shouldShowBadge = item.path === '/friends' && unreadCount > 0;

        return (
          <Box
            key={item.path}
            onClick={() => navigate(item.path)}
            sx={{
              width: 52,
              height: 44,
              borderRadius: 2,
              bgcolor: 'transparent',
              color: active ? '#1769E8' : '#71839A',
              boxShadow: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              '&::after': active ? { content: '""', position: 'absolute', bottom: 1, width: 18, height: 3, borderRadius: 3, bgcolor: '#F28A25' } : {},
              '&:active': {
                transform: 'scale(0.9)',
              },
            }}
          >
            {shouldShowBadge ? (
              <Badge
                badgeContent={unreadCount}
                color="error"
                max={99}
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.65rem',
                    height: '16px',
                    minWidth: '16px',
                    padding: '0 4px',
                  },
                }}
              >
                {item.icon}
              </Badge>
            ) : (
              item.icon
            )}
          </Box>
        );
      })}
    </Box>
  );
}

import { useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar, Badge, Button } from '@mui/material';
import { Bell, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import CuteAvatar from './CuteAvatar';
import { useNotifications } from '../hooks/useNotifications';

export default function Navbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useNotifications(user?.userId ?? undefined);

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        bgcolor: '#F8FAFC',
        borderBottom: '1px solid',
        borderColor: '#E4EAF2',
        px: 3,
        pt: { xs: 2.5, md: 3 },
        pb: { xs: 2, md: 2.25 },
        backdropFilter: 'blur(18px)',
        backgroundColor: 'rgba(248, 250, 252, 0.94)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Logo */}
        <Box
          onClick={() => navigate('/events')}
          sx={{
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            '&:active': {
              transform: 'scale(0.98)',
            },
          }}
        >
          <Typography
            sx={{
              fontSize: '1.35rem',
              fontWeight: 850,
              color: '#142B52',
              letterSpacing: '-0.045em',
              '&::after': { content: '""', display: 'inline-block', width: 7, height: 7, ml: 0.6, mb: 0.15, borderRadius: '50%', bgcolor: '#F28A25' },
            }}
          >
            MeetHalf
          </Typography>
          <Typography
            sx={{
              color: '#71839A',
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.01em',
            }}
          >
            找到大家都到得了的地方
          </Typography>
        </Box>

        {/* 右側：通知 + 頭像/登入按鈕 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {user ? (
            <>
              <Box
                onClick={() => navigate('/notifications')}
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                  '&:active': {
                    transform: 'scale(0.9)',
                  },
                }}
              >
                <Badge
                  badgeContent={unreadCount}
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.65rem',
                      minWidth: 16,
                      height: 16,
                    },
                  }}
                >
                  <Bell size={22} />
                </Badge>
              </Box>

              <Box
                onClick={() => navigate('/profile')}
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                }}
              >
                {user?.avatar ? <Avatar
                  src={user.avatar}
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: '#DCE9FF',
                    border: '2px solid white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: '#2F5D8A',
                  }}
                /> : <CuteAvatar size={40} />}
              </Box>
            </>
          ) : (
            <Button
              variant="contained"
              startIcon={<LogIn size={18} />}
              onClick={() => navigate('/login')}
              sx={{
                bgcolor: '#2F5D8A',
                color: 'white',
                px: 2,
                py: 1,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: '0.875rem',
                textTransform: 'none',
                boxShadow: '0 8px 20px -4px rgba(23, 105, 232, 0.32)',
                '&:hover': {
                  bgcolor: '#0F4FB7',
                  boxShadow: '0 6px 16px -2px rgba(37, 99, 235, 0.4)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              登入
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

import { useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar, Badge } from '@mui/material';
import { Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';

export default function Navbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useNotifications(user?.userId);

  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderBottom: '1px solid',
        borderColor: '#f1f5f9',
        px: 3,
        pt: 5,
        pb: 3,
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
              fontSize: '1.5rem',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '-0.025em',
            }}
          >
            MeetHalf
          </Typography>
          <Typography
            sx={{
              color: '#94a3b8',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Where's the squad?
          </Typography>
        </Box>

        {/* 右側：通知 + 頭像 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: '#dbeafe',
                border: '2px solid white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: '#3b82f6',
              }}
            >
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '👤'}
            </Avatar>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

import { useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar, Badge, IconButton } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // 模擬未讀通知數量
  const unreadCount = 3;

  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderBottom: '1px solid',
        borderColor: '#f1f5f9', // slate-100
        px: 3,
        pt: 5,
        pb: 3,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Logo */}
        <Box
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate('/events')}
        >
          <Typography
            sx={{
              fontSize: '1.5rem',
              fontWeight: 900,
              color: '#0f172a', // slate-900
              letterSpacing: '-0.025em',
            }}
          >
            MeetHalf
          </Typography>
          <Typography
            sx={{
              color: '#94a3b8', // slate-400
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Where's the squad?
          </Typography>
        </Box>

        {/* 右側：通知 + 頭像 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => navigate('/notifications')}
            sx={{
              color: '#64748b',
              '&:hover': { bgcolor: '#f8fafc' },
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
              <NotificationsIcon sx={{ fontSize: 22 }} />
            </Badge>
          </IconButton>
          
          <Avatar
            onClick={() => navigate('/profile')}
            sx={{
              width: 40,
              height: 40,
              bgcolor: '#dbeafe', // blue-100
              border: '2px solid white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: '#3b82f6',
            }}
          >
            {user?.name?.[0]?.toUpperCase() || '👤'}
          </Avatar>
        </Box>
      </Box>
    </Box>
  );
}

import { useState } from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Badge } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Notifications as NotificationsIcon } from '@mui/icons-material';

export default function Navbar() {
  const navigate = useNavigate();
  // 模擬未讀通知數量
  const [unreadCount] = useState(3);

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{ 
        bgcolor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ px: { xs: 2, md: 4 }, py: 1 }}>
        {/* Logo */}
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            cursor: 'pointer',
            flexGrow: 1
          }}
          onClick={() => navigate('/events')}
        >
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 900, 
              color: '#1e293b',
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
            }}
          >
            MeetHalf
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#94a3b8',
              fontSize: '0.75rem',
              fontWeight: 500,
            }}
          >
            Where's the squad?
          </Typography>
        </Box>

        {/* 通知圖標 */}
        <IconButton 
          onClick={() => navigate('/notifications')}
          sx={{ 
            color: '#64748b',
            '&:hover': {
              bgcolor: '#f1f5f9',
            },
          }}
        >
          <Badge 
            badgeContent={unreadCount} 
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.65rem',
                minWidth: 18,
                height: 18,
              },
            }}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}

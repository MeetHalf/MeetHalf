import { AppBar, Toolbar, Typography, Button, Box, Avatar } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Logout as LogoutIcon, Group as GroupIcon } from '@mui/icons-material';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

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
      <Toolbar sx={{ px: { xs: 2, md: 4 }, py: 1.5 }}>
        {/* Logo */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            flexGrow: 1
          }}
          onClick={() => navigate(user ? '/groups' : '/')}
        >
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 'bold', 
              color: 'primary.main',
              letterSpacing: '-0.5px'
            }}
          >
            MeetHalf
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              ml: 2, 
              color: 'text.secondary',
              display: { xs: 'none', sm: 'block' }
            }}
          >
            找到完美的聚會地點
          </Typography>
        </Box>

        {/* Navigation Buttons */}
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* User Email */}
            <Box 
              sx={{ 
                display: { xs: 'none', md: 'flex' }, 
                alignItems: 'center', 
                gap: 1,
                px: 2,
                py: 0.5,
                bgcolor: 'grey.50',
                borderRadius: 2
              }}
            >
              <Avatar 
                sx={{ 
                  width: 28, 
                  height: 28, 
                  bgcolor: 'primary.main',
                  fontSize: '0.875rem'
                }}
              >
                {user.email.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                {user.email}
              </Typography>
            </Box>

            {/* Groups Button */}
            {location.pathname !== '/groups' && (
              <Button 
                variant="outlined" 
                size="medium"
                startIcon={<GroupIcon />}
                onClick={() => navigate('/groups')}
                sx={{
                  borderColor: 'divider',
                  color: 'text.primary',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.50',
                  }
                }}
              >
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>群組</Box>
              </Button>
            )}

            {/* Logout Button */}
            <Button 
              variant="contained" 
              size="medium"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{
                bgcolor: 'primary.main',
                '&:hover': { 
                  bgcolor: 'primary.dark',
                  transform: 'translateY(-1px)',
                  boxShadow: 2
                },
                transition: 'all 0.2s ease'
              }}
            >
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>登出</Box>
            </Button>
          </Box>
        ) : (
          location.pathname !== '/login' && (
            <Button 
              variant="contained" 
              size="medium"
              onClick={() => navigate('/login')}
              sx={{
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
            >
              登入
            </Button>
          )
        )}
      </Toolbar>
    </AppBar>
  );
}



import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  Fade,
  Divider,
} from '@mui/material';
import { 
  Google as GoogleIcon,
  GitHub as GitHubIcon,
  LocationOn as LocationIcon 
} from '@mui/icons-material';
import api from '../api/axios';

export default function Login() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  const handleGoogleLogin = () => {
    window.location.href = `${api.defaults.baseURL}/auth/google`;
  };

  const handleGitHubLogin = () => {
    window.location.href = `${api.defaults.baseURL}/auth/github`;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'background.default',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          left: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          bgcolor: 'rgba(255, 255, 255, 0.1)',
          filter: 'blur(40px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -150,
          right: -150,
          width: 400,
          height: 400,
          borderRadius: '50%',
          bgcolor: 'rgba(255, 255, 255, 0.1)',
          filter: 'blur(60px)',
        }}
      />

      <Container maxWidth="sm">
        <Fade in={true} timeout={800}>
          <Paper
            elevation={24}
            sx={{
              p: 4,
              borderRadius: 4,
              bgcolor: 'background.paper',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* Logo and Title */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  mb: 2,
                  boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)',
                }}
              >
                <LocationIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: 'bold',
                  color: 'text.primary',
                  mb: 1,
                }}
              >
                MeetHalf
              </Typography>
              <Typography variant="body1" color="text.secondary">
                找到完美的聚會地點
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Fade in={!!error}>
                <Alert 
                  severity="error" 
                  sx={{ mb: 3 }}
                >
                  登入失敗，請稍後再試
                </Alert>
              </Fade>
            )}

            {/* OAuth Buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleGoogleLogin}
                startIcon={<GoogleIcon />}
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  bgcolor: '#4285F4',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#357AE8',
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                使用 Google 登入
              </Button>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleGitHubLogin}
                startIcon={<GitHubIcon />}
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  bgcolor: '#24292e',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#1a1e22',
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                使用 GitHub 登入
              </Button>
            </Box>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                或
              </Typography>
            </Divider>

            {/* Info Text */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                💡 未登入也可以使用！直接前往活動頁面即可開始使用
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
}


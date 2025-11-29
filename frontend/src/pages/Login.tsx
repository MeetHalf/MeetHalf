import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Tabs,
  Tab,
  Container,
  Paper,
  Fade,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { 
  Login as LoginIcon, 
  PersonAdd as RegisterIcon,
  LocationOn as LocationIcon 
} from '@mui/icons-material';

const authSchema = z.object({
  email: z.string().email('請輸入有效的 email 格式'),
  password: z.string().min(8, '密碼至少需要 8 個字元'),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthFormData) => {
    setError(null);
    try {
      if (mode === 'login') {
        await login(data.email, data.password);
        // No need to call refreshMe() - login() already sets the user
        // Cookie is set by backend, but we already have user data from login response
      } else {
        await register(data.email, data.password);
        // No need to call refreshMe() - register() already logs in and sets the user
      }
      // Navigate after successful login/register
      navigate('/groups');
    } catch (err: any) {
      // Extract error message from backend response
      const message = err.response?.data?.message || err.response?.data?.code || '發生錯誤，請稍後再試';
      setError(message);
    }
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

            {/* Tabs */}
            <Tabs
              value={mode}
              onChange={(_, newValue) => {
                setMode(newValue);
                setError(null);
              }}
              variant="fullWidth"
              sx={{
                mb: 3,
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: '1rem',
                },
              }}
            >
              <Tab 
                label="登入" 
                value="login" 
                icon={<LoginIcon />} 
                iconPosition="start"
              />
              <Tab 
                label="註冊" 
                value="register" 
                icon={<RegisterIcon />} 
                iconPosition="start"
              />
            </Tabs>

            {/* Error Alert */}
            {error && (
              <Fade in={!!error}>
                <Alert 
                  severity="error" 
                  sx={{ mb: 3 }}
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <TextField
                {...registerField('email')}
                label="Email 帳號"
                type="email"
                fullWidth
                margin="normal"
                error={!!errors.email}
                helperText={errors.email?.message}
                autoComplete="email"
                sx={{ mb: 2 }}
              />

              <TextField
                {...registerField('password')}
                label="密碼"
                type="password"
                fullWidth
                margin="normal"
                error={!!errors.password}
                helperText={errors.password?.message || '密碼需至少 8 個字元'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isSubmitting}
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  boxShadow: 2,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                {isSubmitting ? '處理中...' : mode === 'login' ? '登入' : '註冊新帳號'}
              </Button>
            </form>

            {/* Info Text */}
            {mode === 'register' && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: 'info.50',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'info.200',
                }}
              >
                <Typography variant="body2" color="text.secondary" align="center">
                  💡 註冊後將自動登入並導向群組頁面
                </Typography>
              </Box>
            )}

            {mode === 'login' && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary" align="center">
                  還沒有帳號？點擊上方「註冊」分頁建立新帳號
                </Typography>
              </Box>
            )}
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
}


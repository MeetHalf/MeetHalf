import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Share as ShareIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { inviteApi } from '../api/events';

// PWA detection utility
function isPWA(): boolean {
  // iOS Safari
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  // Android Chrome and other browsers
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  return false;
}

const PENDING_INVITE_ROUTE_KEY = 'pending_invite_route';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if we're in PWA mode
    setIsStandalone(isPWA());
  }, []);

  useEffect(() => {
    if (!token) {
      setError('無效的邀請連結');
      setLoading(false);
      return;
    }

    // Resolve token to event ID
    const resolveToken = async () => {
      try {
        const response = await inviteApi.resolveInviteToken(token);
        setEventId(response.eventId);
        setLoading(false);

        const targetRoute = `/events/${response.eventId}`;
        
        // If already in PWA mode, navigate directly
        if (isPWA()) {
          console.log('[InvitePage] Already in PWA mode, navigating directly to:', targetRoute);
          navigate(targetRoute, { replace: true });
        } else {
          // Store the route in localStorage for later (when user opens from home screen)
          console.log('[InvitePage] Not in PWA mode, storing route in localStorage:', targetRoute);
          try {
            localStorage.setItem(PENDING_INVITE_ROUTE_KEY, targetRoute);
            console.log('[InvitePage] Successfully stored route in localStorage');
          } catch (storageError) {
            console.error('[InvitePage] Failed to store in localStorage:', storageError);
            // If localStorage fails, still allow user to navigate manually
          }
        }
      } catch (err: any) {
        console.error('Error resolving invite token:', err);
        setError(err.response?.data?.message || '無法解析邀請連結，請確認連結是否正確');
        setLoading(false);
      }
    };

    resolveToken();
  }, [token, navigate]);

  const handleGoToEvent = () => {
    if (eventId) {
      navigate(`/events/${eventId}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/events')} fullWidth>
          返回聚會列表
        </Button>
      </Container>
    );
  }

  // If in PWA mode, this shouldn't be shown (should have navigated already)
  // But just in case, show a message
  if (isStandalone) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            正在載入聚會...
          </Typography>
        </Paper>
      </Container>
    );
  }

  // Show PWA installation guide
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <ShareIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom fontWeight={600}>
            將 MeetHalf 加入主畫面
          </Typography>
          <Typography variant="body1" color="text.secondary">
            為了獲得最佳體驗並接收即時通知，請將 MeetHalf 加入主畫面
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom fontWeight={600}>
          如何加入主畫面：
        </Typography>

        {/* iOS Safari instructions */}
        {/iPhone|iPad|iPod/.test(navigator.userAgent) ? (
          <Box sx={{ mt: 3 }}>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Typography variant="h6" color="primary.main">
                    1
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary="點擊底部的分享按鈕（方塊與向上箭頭圖示）"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Typography variant="h6" color="primary.main">
                    2
                  </Typography>
                </ListItemIcon>
                <ListItemText
                  primary="向下滾動並選擇「加入主畫面」或「加入主畫面螢幕」"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Typography variant="h6" color="primary.main">
                    3
                  </Typography>
                </ListItemIcon>
                <ListItemText primary="確認後，應用程式圖示會出現在主畫面上" />
              </ListItem>
            </List>
          </Box>
        ) : (
          /* Android Chrome instructions */
          <Box sx={{ mt: 3 }}>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Typography variant="h6" color="primary.main">
                    1
                  </Typography>
                </ListItemIcon>
                <ListItemText primary="點擊瀏覽器右上角的三點選單" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Typography variant="h6" color="primary.main">
                    2
                  </Typography>
                </ListItemIcon>
                <ListItemText primary="選擇「加到主畫面」或「安裝應用程式」" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Typography variant="h6" color="primary.main">
                    3
                  </Typography>
                </ListItemIcon>
                <ListItemText primary="確認後，應用程式圖示會出現在主畫面上" />
              </ListItem>
            </List>
          </Box>
        )}

        <Box sx={{ mt: 4, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => navigate('/events')}
            sx={{ textTransform: 'none' }}
          >
            稍後再說
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={handleGoToEvent}
            endIcon={<ArrowForwardIcon />}
            sx={{ textTransform: 'none' }}
          >
            立即前往聚會
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
          提示：加入主畫面後，從主畫面打開應用程式可以獲得更好的體驗並接收即時通知
        </Typography>
      </Paper>
    </Container>
  );
}

// Export the localStorage key for use in App.tsx
export { PENDING_INVITE_ROUTE_KEY };


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
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { inviteApi } from '../api/events';

const PENDING_INVITE_ROUTE_KEY = 'pending_invite_route';

// Helper function to log localStorage state
function logLocalStorageState(context: string) {
  try {
    const pendingRoute = localStorage.getItem(PENDING_INVITE_ROUTE_KEY);
    const allLocalStorage: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        allLocalStorage[key] = localStorage.getItem(key) || '';
      }
    }
    console.log(`[${context}] localStorage State:`, {
      pending_invite_route: pendingRoute,
      allItems: allLocalStorage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${context}] Failed to read localStorage:`, error);
  }
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);

  useEffect(() => {
    console.log('[InvitePage] ===== Component Mounted =====');
    console.log('[InvitePage] URL:', window.location.href);
    console.log('[InvitePage] Token from URL:', token);
    logLocalStorageState('InvitePage-Mount');
  }, []);

  useEffect(() => {
    console.log('[InvitePage] Token effect triggered, token:', token);
    
    if (!token) {
      console.error('[InvitePage] No token provided');
      setError('無效的邀請連結');
      setLoading(false);
      return;
    }

    // Resolve token to event ID
    const resolveToken = async () => {
      console.log('[InvitePage] Starting to resolve token:', token);
      try {
        const response = await inviteApi.resolveInviteToken(token);
        console.log('[InvitePage] Token resolved successfully:', response);
        setEventId(response.eventId);
        setLoading(false);

        const targetRoute = `/events/${response.eventId}`;
        
        // 簡化邏輯：不管是瀏覽器還是 PWA，都存儲到 localStorage
        // 讓 Events 頁面負責檢查和導航
        console.log('[InvitePage] ===== Storing Route in localStorage =====');
        console.log('[InvitePage] Target route:', targetRoute);
        logLocalStorageState('InvitePage-Before-Store');
        
        try {
          localStorage.setItem(PENDING_INVITE_ROUTE_KEY, targetRoute);
          console.log('[InvitePage] ✓ Successfully stored route in localStorage');
          logLocalStorageState('InvitePage-After-Store');
        } catch (storageError) {
          console.error('[InvitePage] ✗ Failed to store in localStorage:', storageError);
          // If localStorage fails, still allow user to navigate manually
        }
      } catch (err: any) {
        console.error('[InvitePage] Error resolving invite token:', err);
        console.error('[InvitePage] Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
        });
        setError(err.response?.data?.message || err.message || '無法解析邀請連結，請確認連結是否正確');
        setLoading(false);
      }
    };

    resolveToken();
  }, [token]);

  const handleGoToEvent = () => {
    console.log('[InvitePage] ===== User clicked "Go to Event" =====');
    console.log('[InvitePage] Event ID:', eventId);
    logLocalStorageState('InvitePage-GoToEvent');
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


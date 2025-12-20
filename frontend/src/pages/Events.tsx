import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Alert,
  Button,
  Container,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import GroupCard from '../components/EventCard';
import { eventsApi, Event } from '../api/events';
import { PENDING_INVITE_ROUTE_KEY } from './InvitePage';

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

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [creating, setCreating] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const hasCheckedPendingRoute = useRef(false);

  // Define fetchEvents with useCallback for stable reference
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await eventsApi.getEvents();
      setEvents(response.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check for pending invite route (from localStorage)
  useEffect(() => {
    console.log('[Events] ===== Component Mounted =====');
    console.log('[Events] Current path:', window.location.pathname);
    console.log('[Events] Has checked before:', hasCheckedPendingRoute.current);
    
    // Only check once when component mounts
    if (hasCheckedPendingRoute.current) {
      console.log('[Events] Already checked pending route, fetching events directly');
      fetchEvents();
      return;
    }

    // Small delay to ensure everything is initialized
    const timer = setTimeout(() => {
      console.log('[Events] ===== Checking for Pending Route =====');
      logLocalStorageState('Events-Check');
      
      const pendingRoute = localStorage.getItem(PENDING_INVITE_ROUTE_KEY);
      console.log('[Events] Checking localStorage for pending route:', {
        pendingRoute,
        currentPath: '/events',
      });

      if (pendingRoute && pendingRoute !== '/events' && !pendingRoute.startsWith('/invite/')) {
        console.log('[Events] ===== NAVIGATING TO PENDING ROUTE =====');
        console.log('[Events] From: /events');
        console.log('[Events] To:', pendingRoute);
        logLocalStorageState('Events-Before-Remove');
        
        // Mark as checked BEFORE removing and navigating
        hasCheckedPendingRoute.current = true;
        
        localStorage.removeItem(PENDING_INVITE_ROUTE_KEY);
        console.log('[Events] ✓ Removed pending route from localStorage');
        logLocalStorageState('Events-After-Remove');
        
        console.log('[Events] ✓ Calling navigate...');
        navigate(pendingRoute, { replace: true });
        console.log('[Events] ✓ Navigate called');
        return; // Don't fetch events if we're navigating away
      } else if (pendingRoute) {
        console.log('[Events] ===== Skipping Navigation =====');
        console.log('[Events] Reason:', {
          pendingRoute,
          isSamePath: pendingRoute === '/events',
          isInvitePage: pendingRoute.startsWith('/invite/'),
        });
        // Clear invalid pending route
        if (pendingRoute === '/events' || pendingRoute.startsWith('/invite/')) {
          localStorage.removeItem(PENDING_INVITE_ROUTE_KEY);
          console.log('[Events] ✓ Removed invalid pending route');
        }
      } else {
        console.log('[Events] No pending route found in localStorage');
      }

      hasCheckedPendingRoute.current = true;
      console.log('[Events] ===== Pending Route Check Complete =====');
      console.log('[Events] Starting to fetch events...');
      
      // Fetch events after checking (only if we didn't navigate away)
      fetchEvents();
    }, 200);

    return () => {
      console.log('[Events] Cleanup: clearing timer');
      clearTimeout(timer);
    };
  }, [navigate, fetchEvents]);

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) return;

    try {
      setCreating(true);
      const response = await eventsApi.createEvent({ name: newEventName.trim() });
      setEvents(prev => [response.event, ...prev]);
      setCreateDialogOpen(false);
      setNewEventName('');
      setSnackbarMessage('活動建立成功！');
      setSnackbarOpen(true);
      // Navigate to the new event
      navigate(`/events/${response.event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const handleEventClick = (eventId: number) => {
    navigate(`/events/${eventId}`);
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 'calc(100vh - 200px)' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: 'calc(100vh - 200px)', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header Section */}
        <Fade in={true} timeout={600}>
          <Box>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 4,
              flexWrap: 'wrap',
              gap: 2
            }}>
              <Box>
                <Typography 
                  variant="h3" 
                  component="h1"
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'text.primary',
                    mb: 1
                  }}
                >
                  我的活動
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  管理您的活動，規劃完美的聚會地點
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => navigate('/events/new')}
                sx={{
                  px: 3,
                  py: 1.5,
                  boxShadow: 2,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                建立新活動
              </Button>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 4,
                  borderRadius: 2,
                }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}
          </Box>
        </Fade>

        {/* Events Grid */}
        {events.length > 0 ? (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 3
          }}>
            {events.map((event, index) => (
              <Fade in={true} timeout={800 + index * 200} key={event.id}>
                <Box>
                  <GroupCard
                    id={event.id}
                    name={event.name}
                    memberCount={event._count?.members || event.members.length}
                    createdAt={event.createdAt}
                    onClick={() => handleEventClick(event.id)}
                  />
                </Box>
              </Fade>
            ))}
          </Box>
        ) : (
          <Fade in={true} timeout={800}>
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 12,
                px: 2
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  bgcolor: 'grey.100',
                  mb: 3,
                }}
              >
                <Typography variant="h1" sx={{ fontSize: '4rem' }}>
                  📭
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                還沒有活動
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                建立第一個活動來開始使用 MeetHalf
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{
                  px: 4,
                  py: 1.5,
                }}
              >
                建立新活動
              </Button>
            </Box>
          </Fade>
        )}

        {/* Quick Stats (Optional) */}
        {events.length > 0 && (
          <Fade in={true} timeout={1200}>
            <Box 
              sx={{ 
                mt: 6, 
                p: 3, 
                bgcolor: 'background.paper',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-around',
                flexWrap: 'wrap',
                gap: 3
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 0.5 }}>
                  {events.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  活動總數
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main', mb: 0.5 }}>
                  {events.reduce((sum, e) => sum + (e._count?.members || e.members.length), 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  成員總數
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'warning.main', mb: 0.5 }}>
                  {events.length > 0 ? Math.max(...events.map(e => e._count?.members || e.members.length)) : 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  最大活動人數
                </Typography>
              </Box>
            </Box>
          </Fade>
        )}
      </Container>

      {/* Create Event Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>建立新活動</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="活動名稱"
            fullWidth
            variant="outlined"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newEventName.trim()) {
                handleCreateEvent();
              }
            }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            取消
          </Button>
          <Button 
            onClick={handleCreateEvent}
            variant="contained"
            disabled={!newEventName.trim() || creating}
            startIcon={creating ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {creating ? '建立中...' : '建立'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
}


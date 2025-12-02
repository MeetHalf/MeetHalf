import { useState, useEffect } from 'react';
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

  // Fetch events on component mount
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
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
  };

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


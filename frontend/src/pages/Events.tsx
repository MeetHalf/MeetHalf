import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Login as LoginIcon,
  AccessTime as TimeIcon,
  ChevronRight as ChevronRightIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { format, isAfter, isBefore, isToday } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { eventsApi, Event, inviteApi } from '../api/events';

type EventStatus = 'ongoing' | 'upcoming' | 'ended';

// 根據活動時間判斷狀態
const getEventStatus = (event: Event): EventStatus => {
  const now = new Date();
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);

  if (isAfter(now, endTime)) return 'ended';
  if (isBefore(now, startTime)) return 'upcoming';
  return 'ongoing';
};

// 模擬群組數據
const mockSquads = [
  { id: 1, name: '大學同學', avatar: '🎓' },
  { id: 2, name: '工作夥伴', avatar: '💼' },
  { id: 3, name: '健身群', avatar: '💪' },
  { id: 4, name: '讀書會', avatar: '📚' },
];

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [resolving, setResolving] = useState(false);

  // Fetch events on component mount
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

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // 按狀態分類活動
  const { activeEvents, pastEvents } = useMemo(() => {
    const active: Event[] = [];
    const past: Event[] = [];

    events.forEach((event) => {
      const status = getEventStatus(event);
      if (status === 'ended') past.push(event);
      else active.push(event);
    });

    active.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    past.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

    return { activeEvents: active, pastEvents: past };
  }, [events]);

  const handleEventClick = (eventId: number) => {
    navigate(`/events/${eventId}`);
  };

  const handleJoinWithToken = async () => {
    if (!inviteToken.trim()) return;
    
    try {
      setResolving(true);
      const response = await inviteApi.resolveInviteToken(inviteToken.trim());
      setInviteDialogOpen(false);
      setInviteToken('');
      navigate(`/events/${response.eventId}`);
    } catch (err) {
      setSnackbarMessage('無效的邀請碼，請確認後重試');
      setSnackbarOpen(true);
    } finally {
      setResolving(false);
    }
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
    <Box sx={{ bgcolor: '#f8fafc', minHeight: 'calc(100vh - 140px)', pb: 12 }}>
      {/* Squads 水平滾動列表 */}
      <Box
        sx={{
          bgcolor: 'white',
          borderBottom: '1px solid #f1f5f9',
          px: 3,
          pb: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            py: 1,
            mx: -1,
            px: 1,
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
          }}
        >
          {/* New Meet 按鈕 */}
          <Box
            onClick={() => navigate('/events/new')}
            sx={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 6,
                bgcolor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
              }}
            >
              <AddIcon sx={{ fontSize: 24 }} />
            </Box>
            <Typography
              sx={{
                fontSize: '0.625rem',
                fontWeight: 700,
                color: '#64748b',
              }}
            >
              New Meet
            </Typography>
          </Box>

          {/* Squads */}
          {mockSquads.map((squad) => (
            <Box
              key={squad.id}
              sx={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 6,
                  bgcolor: 'white',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.875rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                {squad.avatar}
              </Box>
              <Typography
                sx={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: '#64748b',
                  width: 64,
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {squad.name}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        {/* Error Alert */}
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: 4 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* 輸入邀請碼 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Button
            variant="text"
            size="small"
            startIcon={<LoginIcon sx={{ fontSize: 16 }} />}
            onClick={() => setInviteDialogOpen(true)}
            sx={{
              color: '#64748b',
              fontWeight: 700,
              fontSize: '0.75rem',
              textTransform: 'none',
              '&:hover': { bgcolor: '#f1f5f9' },
            }}
          >
            輸入邀請碼
          </Button>
        </Box>

        {/* Active Events Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography sx={{ fontWeight: 700, color: '#1e293b' }}>
              Active Gatherings
            </Typography>
            {activeEvents.length > 0 && (
              <Box
                sx={{
                  bgcolor: '#dcfce7',
                  color: '#15803d',
                  fontSize: '0.625rem',
                  fontWeight: 900,
                  px: 1,
                  py: 0.25,
                  borderRadius: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Live
              </Box>
            )}
          </Box>

          {activeEvents.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {activeEvents.map((event) => {
                const status = getEventStatus(event);
                const memberCount = event._count?.members || event.members?.length || 0;
                const startTime = new Date(event.startTime);

                return (
                  <Box
                    key={event.id}
                    onClick={() => handleEventClick(event.id)}
                    sx={{
                      bgcolor: 'white',
                      p: 2.5,
                      borderRadius: '2rem',
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:active': {
                        transform: 'scale(0.98)',
                      },
                      '&:hover': {
                        '& .event-title': {
                          color: '#2563eb',
                        },
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: '#dbeafe',
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                        }}
                      >
                        {status === 'ongoing' ? '🔴' : '📍'}
                      </Box>
                      <Box>
                        <Typography
                          className="event-title"
                          sx={{
                            fontWeight: 700,
                            color: '#0f172a',
                            transition: 'color 0.2s ease',
                          }}
                        >
                          {event.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#94a3b8' }}>
                          <TimeIcon sx={{ fontSize: 12 }} />
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                            {isToday(startTime)
                              ? format(startTime, 'h:mm a', { locale: zhTW })
                              : format(startTime, 'MM/dd h:mm a', { locale: zhTW })}
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem' }}>•</Typography>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                            {memberCount} friends
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <ChevronRightIcon sx={{ color: '#cbd5e1', fontSize: 18 }} />
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box
              sx={{
                bgcolor: 'white',
                p: 4,
                borderRadius: '2rem',
                border: '1px solid #f1f5f9',
                textAlign: 'center',
              }}
            >
              <Typography sx={{ fontSize: '2rem', mb: 1 }}>📭</Typography>
              <Typography sx={{ fontWeight: 700, color: '#64748b', mb: 0.5 }}>
                No active gatherings
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                Tap "New Meet" to create one
              </Typography>
            </Box>
          )}
        </Box>

        {/* Past Events Section */}
        {pastEvents.length > 0 && (
          <Box>
            <Typography sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
              History
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {pastEvents.slice(0, 5).map((event) => {
                const startTime = new Date(event.startTime);

                return (
                  <Box
                    key={event.id}
                    onClick={() => handleEventClick(event.id)}
                    sx={{
                      bgcolor: 'rgba(241, 245, 249, 0.5)',
                      p: 2,
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: 0.8,
                      cursor: 'pointer',
                      '&:hover': {
                        opacity: 1,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography sx={{ fontSize: '1.25rem', filter: 'grayscale(100%)' }}>
                        🕒
                      </Typography>
                      <Box>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>
                          {event.name}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.625rem',
                            color: '#94a3b8',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                          }}
                        >
                          {format(startTime, 'MMM d', { locale: zhTW })}
                        </Typography>
                      </Box>
                    </Box>
                    <TrophyIcon sx={{ color: '#cbd5e1', fontSize: 14 }} />
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>

      {/* Invite Token Input Dialog */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 6, p: 1 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#0f172a' }}>輸入邀請碼</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
            請輸入您收到的邀請碼來加入活動
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="邀請碼"
            placeholder="例如：abc123xyz..."
            fullWidth
            variant="outlined"
            value={inviteToken}
            onChange={(e) => setInviteToken(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && inviteToken.trim()) {
                handleJoinWithToken();
              }
            }}
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': { borderRadius: 3 },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setInviteDialogOpen(false)} sx={{ fontWeight: 700 }}>
            取消
          </Button>
          <Button
            onClick={handleJoinWithToken}
            variant="contained"
            disabled={!inviteToken.trim() || resolving}
            startIcon={resolving ? <CircularProgress size={20} /> : <LoginIcon />}
            sx={{
              borderRadius: 3,
              fontWeight: 700,
              bgcolor: '#0f172a',
              '&:hover': { bgcolor: '#1e293b' },
            }}
          >
            {resolving ? '驗證中...' : '加入活動'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
}

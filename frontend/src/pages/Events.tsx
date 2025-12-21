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
  Tabs,
  Tab,
  Paper,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Login as LoginIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  ChevronRight as ChevronRightIcon,
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

// Glassmorphism 活動卡片
function EventCard({ event, onClick }: { event: Event; onClick: () => void }) {
  const status = getEventStatus(event);
  const memberCount = event._count?.members || event.members?.length || 0;
  const startTime = new Date(event.startTime);

  const statusConfig = {
    ongoing: { label: 'Live', color: '#22c55e', bg: '#dcfce7' },
    upcoming: { label: '即將開始', color: '#3b82f6', bg: '#dbeafe' },
    ended: { label: '已結束', color: '#64748b', bg: '#f1f5f9' },
  };

  const config = statusConfig[status];

  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 2.5,
        borderRadius: 4,
        bgcolor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 3,
          bgcolor: status === 'ended' ? '#f1f5f9' : '#dbeafe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          flexShrink: 0,
        }}
      >
        {status === 'ongoing' ? '🔴' : status === 'upcoming' ? '📍' : '🕒'}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography
            sx={{
              fontWeight: 700,
              color: '#1e293b',
              fontSize: '1rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {event.name}
          </Typography>
          {status === 'ongoing' && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#22c55e',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: '#64748b' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TimeIcon sx={{ fontSize: 14 }} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
              {isToday(startTime) 
                ? format(startTime, 'HH:mm', { locale: zhTW })
                : format(startTime, 'MM/dd HH:mm', { locale: zhTW })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PeopleIcon sx={{ fontSize: 14 }} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
              {memberCount} 人
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Status & Arrow */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={config.label}
          size="small"
          sx={{
            bgcolor: config.bg,
            color: config.color,
            fontWeight: 700,
            fontSize: '0.65rem',
            height: 22,
            '& .MuiChip-label': { px: 1 },
          }}
        />
        <ChevronRightIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
      </Box>
    </Paper>
  );
}

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [creating, setCreating] = useState(false);
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
  const { ongoingEvents, upcomingEvents, endedEvents } = useMemo(() => {
    const ongoing: Event[] = [];
    const upcoming: Event[] = [];
    const ended: Event[] = [];

    events.forEach((event) => {
      const status = getEventStatus(event);
      if (status === 'ongoing') ongoing.push(event);
      else if (status === 'upcoming') upcoming.push(event);
      else ended.push(event);
    });

    // 排序：進行中和即將開始按開始時間升序，已結束按結束時間降序
    ongoing.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    upcoming.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    ended.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

    return { ongoingEvents: ongoing, upcomingEvents: upcoming, endedEvents: ended };
  }, [events]);

  // 當前 Tab 顯示的活動
  const currentEvents = useMemo(() => {
    if (tabValue === 0) return [...ongoingEvents, ...upcomingEvents]; // 合併進行中和即將開始
    if (tabValue === 1) return upcomingEvents;
    return endedEvents;
  }, [tabValue, ongoingEvents, upcomingEvents, endedEvents]);

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
    <Box sx={{ bgcolor: '#f8fafc', minHeight: 'calc(100vh - 140px)' }}>
      {/* Header with Tabs */}
      <Box sx={{ 
        bgcolor: 'white', 
        borderBottom: '1px solid',
        borderColor: 'divider',
        px: 2,
        pt: 2,
      }}>
        {/* 輸入邀請碼按鈕 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="text"
            size="small"
            startIcon={<LoginIcon />}
            onClick={() => setInviteDialogOpen(true)}
            sx={{
              color: '#64748b',
              fontWeight: 600,
              '&:hover': { bgcolor: '#f1f5f9' },
            }}
          >
            輸入邀請碼
          </Button>
        </Box>

        {/* Tabs */}
        <Tabs 
          value={tabValue} 
          onChange={(_, v) => setTabValue(v)}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 700,
              textTransform: 'none',
              minWidth: 'auto',
              px: 2,
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                進行中
                {ongoingEvents.length > 0 && (
                  <Chip 
                    label={ongoingEvents.length} 
                    size="small" 
                    sx={{ 
                      bgcolor: '#dcfce7', 
                      color: '#16a34a', 
                      height: 20, 
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }} 
                  />
                )}
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                即將開始
                {upcomingEvents.length > 0 && (
                  <Chip 
                    label={upcomingEvents.length} 
                    size="small" 
                    sx={{ 
                      bgcolor: '#dbeafe', 
                      color: '#3b82f6', 
                      height: 20, 
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }} 
                  />
                )}
              </Box>
            } 
          />
          <Tab label="歷史" />
        </Tabs>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mx: 2, mt: 2, borderRadius: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Events List */}
      <Box sx={{ p: 2 }}>
        {currentEvents.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {currentEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => handleEventClick(event.id)}
              />
            ))}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ fontSize: '4rem', mb: 2 }}>
              {tabValue === 0 ? '📭' : tabValue === 1 ? '📅' : '📚'}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#64748b', mb: 1 }}>
              {tabValue === 0 ? '目前沒有進行中的活動' : 
               tabValue === 1 ? '沒有即將開始的活動' : '沒有歷史活動'}
            </Typography>
            <Typography sx={{ color: '#94a3b8', mb: 3 }}>
              {tabValue !== 2 && '建立新活動來開始使用 MeetHalf'}
            </Typography>
            {tabValue !== 2 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/events/new')}
                sx={{
                  bgcolor: '#3b82f6',
                  borderRadius: 3,
                  px: 3,
                  py: 1.5,
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  '&:hover': {
                    bgcolor: '#2563eb',
                  },
                }}
              >
                建立新活動
              </Button>
            )}
          </Box>
        )}

        {/* Stats Section */}
        {events.length > 0 && tabValue === 0 && (
          <Paper
            sx={{
              mt: 4,
              p: 3,
              borderRadius: 4,
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              display: 'flex',
              justifyContent: 'space-around',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#3b82f6' }}>
                {events.length}
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                活動總數
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#22c55e' }}>
                {events.reduce((sum, e) => sum + (e._count?.members || e.members?.length || 0), 0)}
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                成員總數
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#f59e0b' }}>
                {events.length > 0 ? Math.max(...events.map(e => e._count?.members || e.members?.length || 0)) : 0}
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                最大人數
              </Typography>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Create Event Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>建立新活動</DialogTitle>
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
            sx={{ 
              mt: 2,
              '& .MuiOutlinedInput-root': { borderRadius: 2 },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCreateDialogOpen(false)} sx={{ fontWeight: 600 }}>
            取消
          </Button>
          <Button 
            onClick={handleCreateEvent}
            variant="contained"
            disabled={!newEventName.trim() || creating}
            startIcon={creating ? <CircularProgress size={20} /> : <AddIcon />}
            sx={{ 
              borderRadius: 2, 
              fontWeight: 600,
              bgcolor: '#3b82f6',
              '&:hover': { bgcolor: '#2563eb' },
            }}
          >
            {creating ? '建立中...' : '建立'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite Token Input Dialog */}
      <Dialog 
        open={inviteDialogOpen} 
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>輸入邀請碼</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
              '& .MuiOutlinedInput-root': { borderRadius: 2 },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setInviteDialogOpen(false)} sx={{ fontWeight: 600 }}>
            取消
          </Button>
          <Button 
            onClick={handleJoinWithToken}
            variant="contained"
            disabled={!inviteToken.trim() || resolving}
            startIcon={resolving ? <CircularProgress size={20} /> : <LoginIcon />}
            sx={{ 
              borderRadius: 2, 
              fontWeight: 600,
              bgcolor: '#3b82f6',
              '&:hover': { bgcolor: '#2563eb' },
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

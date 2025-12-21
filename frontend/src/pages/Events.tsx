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
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { format, isAfter, isBefore, isToday } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { eventsApi, Event, inviteApi } from '../api/events';
import { AnimatedPlus, AnimatedChevronRight, AnimatedTrophy, AnimatedClock } from '../components/AnimatedIcons';

type EventStatus = 'ongoing' | 'upcoming' | 'ended';

const getEventStatus = (event: Event): EventStatus => {
  const now = new Date();
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);

  if (isAfter(now, endTime)) return 'ended';
  if (isBefore(now, startTime)) return 'upcoming';
  return 'ongoing';
};

const mockSquads = [
  { id: 1, name: '大學同學', avatar: '🎓' },
  { id: 2, name: '工作夥伴', avatar: '💼' },
  { id: 3, name: '健身群', avatar: '💪' },
  { id: 4, name: '讀書會', avatar: '📚' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 200px)',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <CircularProgress />
        </motion.div>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: 'calc(100vh - 140px)', pb: 12 }}>
      {/* Squads 水平滾動列表 */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #f1f5f9', px: 3, pb: 3 }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            paddingTop: 8,
            paddingBottom: 8,
            marginLeft: -8,
            marginRight: -8,
            paddingLeft: 8,
            paddingRight: 8,
          }}
        >
          {/* New Meet 按鈕 */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/events/new')}
            style={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
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
              <AnimatedPlus size={24} />
            </Box>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#64748b' }}>
              New Meet
            </Typography>
          </motion.div>

          {/* Squads */}
          {mockSquads.map((squad, index) => (
            <motion.div
              key={squad.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.05 * (index + 1), type: 'spring' }}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
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
            </motion.div>
          ))}
        </motion.div>
      </Box>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert severity="error" sx={{ mb: 3, borderRadius: 4 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 輸入邀請碼 */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="text"
                size="small"
                startIcon={<LogIn size={16} />}
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
            </motion.div>
          </Box>
        </motion.div>

        {/* Active Events Section */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <Box sx={{ mb: 4 }}>
            <motion.div variants={itemVariants}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, color: '#1e293b' }}>Active Gatherings</Typography>
                {activeEvents.length > 0 && (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
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
                  </motion.div>
                )}
              </Box>
            </motion.div>

            {activeEvents.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {activeEvents.map((event) => {
                  const status = getEventStatus(event);
                  const memberCount = event._count?.members || event.members?.length || 0;
                  const startTime = new Date(event.startTime);

                  return (
                    <motion.div
                      key={event.id}
                      variants={itemVariants}
                      whileHover={{ scale: 1.01, x: 4 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleEventClick(event.id)}
                      style={{
                        backgroundColor: 'white',
                        padding: 20,
                        borderRadius: 32,
                        border: '1px solid #f1f5f9',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <motion.div
                          animate={status === 'ongoing' ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              bgcolor: status === 'ongoing' ? '#fee2e2' : '#dbeafe',
                              borderRadius: 4,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.5rem',
                            }}
                          >
                            {status === 'ongoing' ? '🔴' : '📍'}
                          </Box>
                        </motion.div>
                        <Box>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              color: '#0f172a',
                              transition: 'color 0.2s ease',
                            }}
                          >
                            {event.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#94a3b8' }}>
                            <AnimatedClock size={12} />
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
                      <AnimatedChevronRight size={18} className="text-slate-300" />
                    </motion.div>
                  );
                })}
              </Box>
            ) : (
              <motion.div
                variants={itemVariants}
                style={{
                  backgroundColor: 'white',
                  padding: 32,
                  borderRadius: 32,
                  border: '1px solid #f1f5f9',
                  textAlign: 'center',
                }}
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Typography sx={{ fontSize: '2rem', mb: 1 }}>📭</Typography>
                </motion.div>
                <Typography sx={{ fontWeight: 700, color: '#64748b', mb: 0.5 }}>
                  No active gatherings
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  Tap "New Meet" to create one
                </Typography>
              </motion.div>
            )}
          </Box>

          {/* Past Events Section */}
          {pastEvents.length > 0 && (
            <motion.div variants={itemVariants}>
              <Typography sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>History</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {pastEvents.slice(0, 5).map((event, index) => {
                  const startTime = new Date(event.startTime);

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                      whileHover={{ opacity: 1, x: 4 }}
                      onClick={() => handleEventClick(event.id)}
                      style={{
                        backgroundColor: 'rgba(241, 245, 249, 0.5)',
                        padding: 16,
                        borderRadius: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        opacity: 0.8,
                        cursor: 'pointer',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography sx={{ fontSize: '1.25rem', filter: 'grayscale(100%)' }}>🕒</Typography>
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
                      <AnimatedTrophy size={14} className="text-slate-300" />
                    </motion.div>
                  );
                })}
              </Box>
            </motion.div>
          )}
        </motion.div>
      </Box>

      {/* Invite Token Input Dialog */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 6, p: 1 } }}
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
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
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
            startIcon={resolving ? <CircularProgress size={20} /> : <LogIn size={18} />}
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

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
}

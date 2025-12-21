import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Divider,
} from '@mui/material';
import { Settings, ChevronRight, Bell, Lock, Info, LogOut, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { eventsApi, Event } from '../api/events';
import { format } from 'date-fns';

// 模擬徽章數據
const badges = [
  { id: 1, emoji: '🏆', name: '準時王' },
  { id: 2, emoji: '⚡', name: '閃電俠' },
  { id: 3, emoji: '🎯', name: '精準定位' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await eventsApi.getEvents();
        setEvents(response.events);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
    };
    fetchEvents();
  }, []);

  const stats = {
    totalEvents: events.length,
    onTimeRate: 85,
    firstPlace: 3,
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const settingsItems = [
    {
      icon: <AnimatedBell size={20} />,
      label: '通知設定',
      onClick: () => navigate('/notifications'),
    },
    {
      icon: <AnimatedLock size={20} />,
      label: '隱私設定',
      onClick: () => {},
    },
    {
      icon: <AnimatedInfo size={20} />,
      label: '關於 MeetHalf',
      onClick: () => {},
    },
  ];

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: 'calc(100vh - 140px)', pb: 12 }}>
      {/* Header with Avatar */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #f1f5f9', pt: 4, pb: 4, px: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/settings')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#f8fafc',
              border: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            <AnimatedSettings size={20} />
          </motion.div>
        </Box>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <Avatar
            sx={{
              width: 100,
              height: 100,
              bgcolor: '#2563eb',
              fontSize: '2.5rem',
              mb: 2,
              border: '4px solid white',
              boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.3)',
            }}
          >
            {user?.name?.[0]?.toUpperCase() || '👤'}
          </Avatar>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
            {user?.name || '訪客用戶'}
          </Typography>
          <Typography sx={{ color: '#94a3b8', fontWeight: 500 }}>
            {user?.email || '未登入'}
          </Typography>
        </motion.div>
      </Box>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* Stats */}
        <Box sx={{ px: 3, mt: 3 }}>
          <motion.div variants={itemVariants}>
            <Box
              sx={{
                bgcolor: 'white',
                borderRadius: '2rem',
                p: 3,
                border: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-around',
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#2563eb' }}>
                    {stats.totalEvents}
                  </Typography>
                </motion.div>
                <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                  活動總數
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                >
                  <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#22c55e' }}>
                    {stats.onTimeRate}%
                  </Typography>
                </motion.div>
                <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                  準時率
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                >
                  <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b' }}>
                    🥇{stats.firstPlace}
                  </Typography>
                </motion.div>
                <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                  冠軍
                </Typography>
              </Box>
            </Box>
          </motion.div>
        </Box>

        {/* Badges */}
        <Box sx={{ px: 3, mt: 4 }}>
          <motion.div variants={itemVariants}>
            <Typography sx={{ fontWeight: 700, color: '#0f172a', mb: 2, px: 1 }}>
              Achievements
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                pb: 1,
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {badges.map((badge, index) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  style={{
                    minWidth: 80,
                    backgroundColor: 'white',
                    border: '1px solid #f1f5f9',
                    borderRadius: 16,
                    padding: 16,
                    textAlign: 'center',
                  }}
                >
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.5 }}
                  >
                    <Typography sx={{ fontSize: '2rem', mb: 1 }}>{badge.emoji}</Typography>
                  </motion.div>
                  <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#64748b' }}>
                    {badge.name}
                  </Typography>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{
                  minWidth: 80,
                  backgroundColor: '#f8fafc',
                  border: '2px dashed #e2e8f0',
                  borderRadius: 16,
                  padding: 16,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ fontSize: '1.5rem', mb: 1, opacity: 0.5 }}>🔒</Typography>
                <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600 }}>
                  More
                </Typography>
              </motion.div>
            </Box>
          </motion.div>
        </Box>

        {/* Recent Events */}
        <Box sx={{ px: 3, mt: 4 }}>
          <motion.div variants={itemVariants}>
            <Typography sx={{ fontWeight: 700, color: '#0f172a', mb: 2, px: 1 }}>
              Recent Activity
            </Typography>
            <Box
              sx={{
                bgcolor: 'white',
                borderRadius: '1.5rem',
                border: '1px solid #f1f5f9',
                overflow: 'hidden',
              }}
            >
              {events.slice(0, 3).map((event, index) => (
                <motion.div
                  key={event.id}
                  whileHover={{ backgroundColor: '#f8fafc' }}
                  onClick={() => navigate(`/events/${event.id}`)}
                  style={{
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    borderBottom: index < 2 ? '1px solid #f1f5f9' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 3,
                      bgcolor: '#dbeafe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2563eb',
                    }}
                  >
                    <AnimatedCalendar size={20} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                      {event.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.625rem',
                        color: '#94a3b8',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      {format(new Date(event.startTime), 'MMM d')}
                    </Typography>
                  </Box>
                  <AnimatedChevronRight size={18} className="text-slate-300" />
                </motion.div>
              ))}
              {events.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography sx={{ color: '#94a3b8' }}>No activity yet</Typography>
                </Box>
              )}
            </Box>
          </motion.div>
        </Box>

        {/* Settings */}
        <Box sx={{ px: 3, mt: 4 }}>
          <motion.div variants={itemVariants}>
            <Typography sx={{ fontWeight: 700, color: '#0f172a', mb: 2, px: 1 }}>
              Settings
            </Typography>
            <Box
              sx={{
                bgcolor: 'white',
                borderRadius: '1.5rem',
                border: '1px solid #f1f5f9',
                overflow: 'hidden',
              }}
            >
              {settingsItems.map((item, index) => (
                <motion.div
                  key={item.label}
                  whileHover={{ backgroundColor: '#f8fafc', x: 4 }}
                  onClick={item.onClick}
                  style={{
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    borderBottom: index < settingsItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Box sx={{ color: '#64748b' }}>{item.icon}</Box>
                  <Typography sx={{ flex: 1, fontWeight: 600, color: '#475569' }}>
                    {item.label}
                  </Typography>
                  <AnimatedChevronRight size={18} className="text-slate-300" />
                </motion.div>
              ))}
            </Box>
          </motion.div>
        </Box>

        {/* Logout */}
        <Box sx={{ px: 3, mt: 4 }}>
          <motion.div variants={itemVariants}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              style={{
                backgroundColor: 'white',
                border: '1px solid #fecaca',
                borderRadius: 24,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: '#ef4444',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <AnimatedLogOut size={20} />
              登出帳號
            </motion.div>
          </motion.div>
        </Box>
      </motion.div>
    </Box>
  );
}

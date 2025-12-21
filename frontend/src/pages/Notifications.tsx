import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AnimatedArrowLeft,
  AnimatedTrash,
  AnimatedCalendar,
  AnimatedZap,
} from '../components/AnimatedIcons';
import { UserPlus, Megaphone } from 'lucide-react';

interface Notification {
  id: number;
  type: 'event_invite' | 'event_update' | 'friend_request' | 'poke' | 'reminder';
  title: string;
  message: string;
  time: string;
  read: boolean;
  eventId?: number;
}

const mockNotifications: Notification[] = [
  {
    id: 1,
    type: 'event_invite',
    title: '活動邀請',
    message: '小明邀請你參加「週五火鍋聚會」',
    time: '5 分鐘前',
    read: false,
    eventId: 1,
  },
  {
    id: 2,
    type: 'event_update',
    title: '活動更新',
    message: '「聖誕派對」的集合地點已更改',
    time: '30 分鐘前',
    read: false,
    eventId: 2,
  },
  {
    id: 3,
    type: 'poke',
    title: '有人戳你',
    message: '小華在「週末登山」中戳了你一下！',
    time: '1 小時前',
    read: true,
    eventId: 3,
  },
  {
    id: 4,
    type: 'friend_request',
    title: '好友申請',
    message: '阿強想加你為好友',
    time: '2 小時前',
    read: true,
  },
];

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'event_invite':
      return <AnimatedCalendar size={18} />;
    case 'event_update':
      return <Megaphone size={18} />;
    case 'friend_request':
      return <UserPlus size={18} />;
    case 'poke':
      return <AnimatedZap size={18} animate />;
    case 'reminder':
      return <AnimatedCalendar size={18} />;
    default:
      return <AnimatedCalendar size={18} />;
  }
};

const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'event_invite':
      return { bg: '#dbeafe', color: '#2563eb' };
    case 'event_update':
      return { bg: '#fef3c7', color: '#d97706' };
    case 'friend_request':
      return { bg: '#dcfce7', color: '#16a34a' };
    case 'poke':
      return { bg: '#fee2e2', color: '#dc2626' };
    case 'reminder':
      return { bg: '#e0e7ff', color: '#4f46e5' };
    default:
      return { bg: '#f1f5f9', color: '#64748b' };
  }
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  }),
  exit: {
    opacity: 0,
    x: -100,
    transition: { duration: 0.2 },
  },
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDelete = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id);
    if (notification.eventId) {
      navigate(`/events/${notification.eventId}`);
    } else if (notification.type === 'friend_request') {
      navigate('/social');
    }
  };

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: 'calc(100vh - 140px)', pb: 12 }}>
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #f1f5f9',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: '#f8fafc',
            border: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            cursor: 'pointer',
          }}
        >
          <AnimatedArrowLeft size={20} />
        </motion.div>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 900, color: '#0f172a', fontSize: '1.25rem' }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Typography sx={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }}>
              {unreadCount} unread
            </Typography>
          )}
        </Box>
        {unreadCount > 0 && (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Typography
              onClick={handleMarkAllAsRead}
              sx={{
                color: '#2563eb',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Mark all read
            </Typography>
          </motion.div>
        )}
      </motion.div>

      {/* Notifications List */}
      <Box sx={{ p: 2 }}>
        {notifications.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {notifications.map((notification, index) => {
              const colors = getNotificationColor(notification.type);
              return (
                <motion.div
                  key={notification.id}
                  custom={index}
                  variants={listItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  whileHover={{ scale: 1.01, x: 4 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    backgroundColor: notification.read ? 'white' : 'rgba(37, 99, 235, 0.03)',
                    padding: 16,
                    borderRadius: 24,
                    border: `1px solid ${notification.read ? '#f1f5f9' : 'rgba(37, 99, 235, 0.1)'}`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    cursor: 'pointer',
                    marginBottom: 12,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 44,
                      height: 44,
                      bgcolor: colors.bg,
                      color: colors.color,
                      borderRadius: 3,
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                        {notification.title}
                      </Typography>
                      {!notification.read && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#2563eb',
                          }}
                        />
                      )}
                    </Box>
                    <Typography
                      sx={{
                        color: '#64748b',
                        fontSize: '0.8rem',
                        mb: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {notification.message}
                    </Typography>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.625rem', fontWeight: 600 }}>
                      {notification.time}
                    </Typography>
                  </Box>
                  <motion.div
                    whileHover={{ scale: 1.2, backgroundColor: '#fee2e2' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#cbd5e1',
                    }}
                  >
                    <AnimatedTrash size={16} />
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', paddingTop: 80, paddingBottom: 80 }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Typography sx={{ fontSize: '4rem', mb: 2 }}>🔔</Typography>
            </motion.div>
            <Typography sx={{ fontWeight: 700, color: '#64748b' }}>No notifications</Typography>
            <Typography sx={{ color: '#94a3b8', mt: 1 }}>
              We'll let you know when something happens
            </Typography>
          </motion.div>
        )}
      </Box>
    </Box>
  );
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Button,
  CircularProgress,
} from '@mui/material';
import { ArrowLeft, Trash2, Calendar, Zap } from 'lucide-react';
import { UserPlus, Megaphone, Check, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useFriends } from '../hooks/useFriends';
import { Notification } from '../types/notification';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'event_invite':
    case 'EVENT_INVITE':
    case 'EVENT_UPDATE':
      return <Calendar size={18} />;
    case 'event_update':
      return <Megaphone size={18} />;
    case 'friend_request':
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
      return <UserPlus size={18} />;
    case 'poke':
    case 'POKE':
      return <Zap size={18} />;
    default:
      return <Calendar size={18} />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'event_invite':
    case 'EVENT_INVITE':
      return { bg: '#dbeafe', color: '#2563eb' };
    case 'event_update':
    case 'EVENT_UPDATE':
      return { bg: '#fef3c7', color: '#d97706' };
    case 'friend_request':
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
      return { bg: '#dcfce7', color: '#16a34a' };
    case 'poke':
    case 'POKE':
      return { bg: '#fee2e2', color: '#dc2626' };
    default:
      return { bg: '#f1f5f9', color: '#64748b' };
  }
};


const formatTimestamp = (dateString: string) => {
  try {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: zhTW,
    });
  } catch {
    return '';
  }
};

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, loading, loadNotifications, markAsRead, markAllAsRead, deleteNotification, unreadCount } =
    useNotifications(user?.userId);
  const { acceptRequest, rejectRequest } = useFriends();

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, loadNotifications]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    switch (notification.type) {
      case 'FRIEND_ACCEPTED':
        navigate('/friends');
        break;
      case 'NEW_MESSAGE':
        if (notification.data?.groupId) {
          navigate(`/chat/group/${notification.data.groupId}`);
        } else if (notification.data?.senderId) {
          navigate(`/chat/user/${notification.data.senderId}`);
        }
        break;
      case 'EVENT_INVITE':
      case 'EVENT_UPDATE':
      case 'POKE':
        if (notification.data?.eventId) {
          navigate(`/events/${notification.data.eventId}`);
        }
        break;
      default:
        break;
    }
  };

  const handleAcceptFriendRequest = async (notification: Notification) => {
    if (notification.data?.requestId) {
      await acceptRequest(notification.data.requestId);
      loadNotifications();
    }
  };

  const handleRejectFriendRequest = async (notification: Notification) => {
    if (notification.data?.requestId) {
      await rejectRequest(notification.data.requestId);
      loadNotifications();
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <CircularProgress />
      </Box>
    );
  }

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
          <ArrowLeft size={20} />
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
              onClick={markAllAsRead}
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
              const isFriendRequest = notification.type === 'FRIEND_REQUEST';
              
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
                  onClick={() => !isFriendRequest && handleNotificationClick(notification)}
                  style={{
                    backgroundColor: notification.read ? 'white' : 'rgba(37, 99, 235, 0.03)',
                    padding: 16,
                    borderRadius: 24,
                    border: `1px solid ${notification.read ? '#f1f5f9' : 'rgba(37, 99, 235, 0.1)'}`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    cursor: isFriendRequest ? 'default' : 'pointer',
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
                      {notification.body}
                    </Typography>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.625rem', fontWeight: 600 }}>
                      {formatTimestamp(notification.createdAt)}
                    </Typography>

                    {/* Friend Request Actions */}
                    {isFriendRequest && (
                      <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Check size={16} />}
                          onClick={() => handleAcceptFriendRequest(notification)}
                          sx={{
                            borderRadius: 3,
                            bgcolor: '#22c55e',
                            '&:hover': { bgcolor: '#16a34a' },
                            textTransform: 'none',
                            fontWeight: 700,
                          }}
                        >
                          接受
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<X size={16} />}
                          onClick={() => handleRejectFriendRequest(notification)}
                          sx={{
                            borderRadius: 3,
                            borderColor: '#e2e8f0',
                            color: '#64748b',
                            textTransform: 'none',
                            fontWeight: 700,
                          }}
                        >
                          拒絕
                        </Button>
                      </Box>
                    )}
                  </Box>
                  <motion.div
                    whileHover={{ scale: 1.2, backgroundColor: '#fee2e2' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={16} />
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
            <Typography sx={{ fontWeight: 700, color: '#64748b' }}>沒有通知</Typography>
            <Typography sx={{ color: '#94a3b8', mt: 1 }}>
              所有通知都會顯示在這裡
            </Typography>
          </motion.div>
        )}
      </Box>
    </Box>
  );
}

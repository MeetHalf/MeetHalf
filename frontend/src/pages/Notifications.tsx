import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Event as EventIcon,
  PersonAdd as PersonAddIcon,
  Campaign as CampaignIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { Zap as ZapIcon } from 'lucide-react';

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
      return <EventIcon sx={{ fontSize: 18 }} />;
    case 'event_update':
      return <CampaignIcon sx={{ fontSize: 18 }} />;
    case 'friend_request':
      return <PersonAddIcon sx={{ fontSize: 18 }} />;
    case 'poke':
      return <ZapIcon size={18} />;
    case 'reminder':
      return <EventIcon sx={{ fontSize: 18 }} />;
    default:
      return <EventIcon sx={{ fontSize: 18 }} />;
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
      <Box
        sx={{
          bgcolor: 'white',
          borderBottom: '1px solid #f1f5f9',
          px: 2,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          onClick={() => navigate(-1)}
          sx={{
            width: 48,
            height: 48,
            borderRadius: 4,
            bgcolor: '#f8fafc',
            border: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            cursor: 'pointer',
            '&:active': { transform: 'scale(0.9)' },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </Box>
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
        )}
      </Box>

      {/* Notifications List */}
      <Box sx={{ p: 2 }}>
        {notifications.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {notifications.map((notification) => {
              const colors = getNotificationColor(notification.type);
              return (
                <Box
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    bgcolor: notification.read ? 'white' : 'rgba(37, 99, 235, 0.03)',
                    p: 2,
                    borderRadius: '1.5rem',
                    border: '1px solid',
                    borderColor: notification.read ? '#f1f5f9' : 'rgba(37, 99, 235, 0.1)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:active': { transform: 'scale(0.98)' },
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
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: '#2563eb',
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
                  <Box
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#cbd5e1',
                      '&:hover': { bgcolor: '#fee2e2', color: '#ef4444' },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 12 }}>
            <Typography sx={{ fontSize: '4rem', mb: 2 }}>🔔</Typography>
            <Typography sx={{ fontWeight: 700, color: '#64748b' }}>
              No notifications
            </Typography>
            <Typography sx={{ color: '#94a3b8', mt: 1 }}>
              We'll let you know when something happens
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

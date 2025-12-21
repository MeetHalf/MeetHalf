import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Event as EventIcon,
  PersonAdd as PersonAddIcon,
  Campaign as CampaignIcon,
  TouchApp as PokeIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface Notification {
  id: number;
  type: 'event_invite' | 'event_update' | 'friend_request' | 'poke' | 'reminder';
  title: string;
  message: string;
  time: string;
  read: boolean;
  eventId?: number;
}

// 模擬通知數據
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
  {
    id: 5,
    type: 'reminder',
    title: '活動提醒',
    message: '「週五火鍋聚會」將在 30 分鐘後開始',
    time: '昨天',
    read: true,
    eventId: 1,
  },
];

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'event_invite':
      return <EventIcon />;
    case 'event_update':
      return <CampaignIcon />;
    case 'friend_request':
      return <PersonAddIcon />;
    case 'poke':
      return <PokeIcon />;
    case 'reminder':
      return <EventIcon />;
    default:
      return <EventIcon />;
  }
};

const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'event_invite':
      return { bg: '#dbeafe', color: '#3b82f6' };
    case 'event_update':
      return { bg: '#fef3c7', color: '#f59e0b' };
    case 'friend_request':
      return { bg: '#dcfce7', color: '#22c55e' };
    case 'poke':
      return { bg: '#fee2e2', color: '#ef4444' };
    case 'reminder':
      return { bg: '#e0e7ff', color: '#6366f1' };
    default:
      return { bg: '#f1f5f9', color: '#64748b' };
  }
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDelete = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
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
    <Box sx={{ bgcolor: '#f8fafc', minHeight: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: 'white', 
        borderBottom: '1px solid',
        borderColor: 'divider',
        px: 2, 
        py: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
            通知中心
          </Typography>
          {unreadCount > 0 && (
            <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>
              {unreadCount} 則未讀通知
            </Typography>
          )}
        </Box>
        {unreadCount > 0 && (
          <Button 
            size="small" 
            onClick={handleMarkAllAsRead}
            sx={{ color: '#3b82f6', fontWeight: 600 }}
          >
            全部標為已讀
          </Button>
        )}
      </Box>

      {/* Notifications List */}
      <Box sx={{ p: 2 }}>
        {notifications.length > 0 ? (
          <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
            <List disablePadding>
              {notifications.map((notification, index) => {
                const colors = getNotificationColor(notification.type);
                return (
                  <Box key={notification.id}>
                    <ListItem
                      onClick={() => handleNotificationClick(notification)}
                      sx={{
                        py: 2,
                        cursor: 'pointer',
                        bgcolor: notification.read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                        '&:hover': { bgcolor: '#f8fafc' },
                      }}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.id);
                          }}
                          sx={{ color: '#94a3b8' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: colors.bg, color: colors.color }}>
                          {getNotificationIcon(notification.type)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {notification.title}
                            </Typography>
                            {!notification.read && (
                              <Box sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: '#3b82f6',
                              }} />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography 
                              sx={{ 
                                color: '#64748b', 
                                fontSize: '0.875rem',
                                mb: 0.5,
                              }}
                            >
                              {notification.message}
                            </Typography>
                            <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                              {notification.time}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < notifications.length - 1 && <Divider />}
                  </Box>
                );
              })}
            </List>
          </Paper>
        ) : (
          <Box sx={{ textAlign: 'center', py: 12 }}>
            <Typography sx={{ fontSize: '4rem', mb: 2 }}>🔔</Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#64748b' }}>
              沒有通知
            </Typography>
            <Typography sx={{ color: '#94a3b8', mt: 1 }}>
              當有新活動或好友申請時會在這裡顯示
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}


import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Button,
  IconButton,
  Paper,
  Chip,
  CircularProgress,
  Fade,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  Message as MessageIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useFriends } from '../hooks/useFriends';
import { Notification } from '../types/notification';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, loading, loadNotifications, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications(user?.userId);
  const { acceptRequest, rejectRequest } = useFriends();

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, loadNotifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'FRIEND_REQUEST':
      case 'FRIEND_ACCEPTED':
        return <PersonAddIcon />;
      case 'EVENT_INVITE':
      case 'EVENT_UPDATE':
        return <EventIcon />;
      case 'NEW_MESSAGE':
        return <MessageIcon />;
      default:
        return <NotificationsIcon />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
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
        if (notification.data?.eventId) {
          navigate(`/events/${notification.data.eventId}`);
        }
        break;
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
      loadNotifications(); // Reload to refresh the list
    }
  };

  const handleRejectFriendRequest = async (notification: Notification) => {
    if (notification.data?.requestId) {
      await rejectRequest(notification.data.requestId);
      loadNotifications(); // Reload to refresh the list
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

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Fade in={true} timeout={600}>
          <Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                通知
              </Typography>
              {notifications.some((n) => !n.read) && (
                <Button size="small" onClick={markAllAsRead}>
                  全部標為已讀
                </Button>
              )}
            </Box>
          </Box>
        </Fade>

        {/* Notifications List */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : notifications.length > 0 ? (
          <Fade in={true} timeout={800}>
            <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
              {notifications.map((notification) => (
                <Paper
                  key={notification.id}
                  elevation={notification.read ? 0 : 2}
                  sx={{
                    mb: 1,
                    bgcolor: notification.read ? 'transparent' : 'primary.50',
                  }}
                >
                  <ListItem
                    alignItems="flex-start"
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: notification.read ? 'grey.400' : 'primary.main',
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: notification.read ? 'normal' : 'bold',
                            }}
                          >
                            {notification.title}
                          </Typography>
                          {!notification.read && (
                            <Chip
                              label="新"
                              size="small"
                              color="primary"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              mb: 1,
                              cursor: notification.type !== 'FRIEND_REQUEST' ? 'pointer' : 'default',
                            }}
                            onClick={() => {
                              if (notification.type !== 'FRIEND_REQUEST') {
                                handleNotificationClick(notification);
                              }
                            }}
                          >
                            {notification.body}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {formatTimestamp(notification.createdAt)}
                          </Typography>

                          {/* Friend Request Actions */}
                          {notification.type === 'FRIEND_REQUEST' && (
                            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<CheckIcon />}
                                onClick={() => handleAcceptFriendRequest(notification)}
                              >
                                接受
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<CloseIcon />}
                                onClick={() => handleRejectFriendRequest(notification)}
                              >
                                拒絕
                              </Button>
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                </Paper>
              ))}
            </List>
          </Fade>
        ) : (
          <Fade in={true} timeout={800}>
            <Box sx={{ textAlign: 'center', py: 12 }}>
              <Typography variant="h1" sx={{ fontSize: '4rem', mb: 2 }}>
                🔔
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                沒有通知
              </Typography>
              <Typography variant="body1" color="text.secondary">
                所有通知都會顯示在這裡
              </Typography>
            </Box>
          </Fade>
        )}
      </Container>
    </Box>
  );
}


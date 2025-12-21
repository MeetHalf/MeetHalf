import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Button,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  Chip,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  History as HistoryIcon,
  Notifications as NotificationsIcon,
  Lock as LockIcon,
  Info as InfoIcon,
  Logout as LogoutIcon,
  ChevronRight as ChevronRightIcon,
  EmojiEvents as TrophyIcon,
  AccessTime as TimeIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { eventsApi, Event } from '../api/events';

// 模擬徽章數據
const badges = [
  { id: 1, emoji: '🏆', name: '準時王', desc: '連續 10 次準時到達' },
  { id: 2, emoji: '⚡', name: '閃電俠', desc: '最快到達 5 次' },
  { id: 3, emoji: '🎯', name: '精準定位', desc: '分享位置超過 20 次' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await eventsApi.getEvents();
        setEvents(response.events);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // 計算統計數據
  const stats = {
    totalEvents: events.length,
    onTimeRate: 85, // 模擬數據
    firstPlace: 3, // 模擬數據
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: 'calc(100vh - 140px)', pb: 4 }}>
      {/* Header with Avatar */}
      <Box sx={{ 
        bgcolor: 'white', 
        pt: 4, 
        pb: 3, 
        px: 3,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <IconButton onClick={() => navigate('/settings')}>
            <SettingsIcon />
          </IconButton>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Avatar
            sx={{
              width: 100,
              height: 100,
              bgcolor: '#3b82f6',
              fontSize: '2.5rem',
              mb: 2,
              border: '4px solid white',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            {user?.name?.[0]?.toUpperCase() || '👤'}
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
            {user?.name || '訪客用戶'}
          </Typography>
          <Typography sx={{ color: '#64748b', mt: 0.5 }}>
            {user?.email || '未登入'}
          </Typography>
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ px: 2, mt: 3 }}>
        <Paper sx={{ 
          borderRadius: 4, 
          p: 3,
          display: 'flex',
          justifyContent: 'space-around',
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#3b82f6' }}>
              {stats.totalEvents}
            </Typography>
            <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mt: 0.5 }}>
              活動總數
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#22c55e' }}>
              {stats.onTimeRate}%
            </Typography>
            <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mt: 0.5 }}>
              準時率
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#f59e0b' }}>
              🥇{stats.firstPlace}
            </Typography>
            <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mt: 0.5 }}>
              冠軍次數
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Badges */}
      <Box sx={{ px: 2, mt: 3 }}>
        <Typography sx={{ fontWeight: 700, color: '#1e293b', mb: 2, px: 1 }}>
          成就徽章
        </Typography>
        <Paper sx={{ borderRadius: 4, p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
            {badges.map((badge) => (
              <Box
                key={badge.id}
                sx={{
                  minWidth: 100,
                  textAlign: 'center',
                  p: 2,
                  borderRadius: 3,
                  bgcolor: '#f8fafc',
                }}
              >
                <Typography sx={{ fontSize: '2rem', mb: 1 }}>{badge.emoji}</Typography>
                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                  {badge.name}
                </Typography>
              </Box>
            ))}
            <Box
              sx={{
                minWidth: 100,
                textAlign: 'center',
                p: 2,
                borderRadius: 3,
                bgcolor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed #e2e8f0',
              }}
            >
              <Typography sx={{ fontSize: '1.5rem', mb: 1, opacity: 0.5 }}>🔒</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                更多徽章
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Recent Events */}
      <Box sx={{ px: 2, mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 1 }}>
          <Typography sx={{ fontWeight: 700, color: '#1e293b' }}>
            最近活動
          </Typography>
          <Button 
            size="small" 
            onClick={() => navigate('/events')}
            sx={{ color: '#3b82f6', fontWeight: 600 }}
          >
            查看全部
          </Button>
        </Box>
        <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
          <List disablePadding>
            {events.slice(0, 3).map((event, index) => (
              <ListItem
                key={event.id}
                divider={index < 2}
                onClick={() => navigate(`/events/${event.id}`)}
                sx={{ py: 2, cursor: 'pointer', '&:hover': { bgcolor: '#f8fafc' } }}
              >
                <ListItemIcon>
                  <Box sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: event.status === 'ended' ? '#f1f5f9' : '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <EventIcon sx={{ 
                      color: event.status === 'ended' ? '#94a3b8' : '#3b82f6',
                      fontSize: 20,
                    }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: 600 }}>{event.name}</Typography>
                  }
                  secondary={new Date(event.startTime).toLocaleDateString('zh-TW')}
                />
                <Chip
                  label={event.status === 'ended' ? '已結束' : 
                         event.status === 'ongoing' ? '進行中' : '即將開始'}
                  size="small"
                  sx={{
                    bgcolor: event.status === 'ended' ? '#f1f5f9' : 
                             event.status === 'ongoing' ? '#dcfce7' : '#dbeafe',
                    color: event.status === 'ended' ? '#64748b' : 
                           event.status === 'ongoing' ? '#16a34a' : '#3b82f6',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                />
              </ListItem>
            ))}
            {events.length === 0 && (
              <ListItem sx={{ py: 4, justifyContent: 'center' }}>
                <Typography sx={{ color: '#94a3b8' }}>尚無活動記錄</Typography>
              </ListItem>
            )}
          </List>
        </Paper>
      </Box>

      {/* Settings Menu */}
      <Box sx={{ px: 2, mt: 3 }}>
        <Typography sx={{ fontWeight: 700, color: '#1e293b', mb: 2, px: 1 }}>
          設定
        </Typography>
        <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
          <List disablePadding>
            <ListItem 
              onClick={() => navigate('/notifications')}
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f8fafc' } }}
            >
              <ListItemIcon>
                <NotificationsIcon sx={{ color: '#64748b' }} />
              </ListItemIcon>
              <ListItemText primary="通知設定" />
              <ChevronRightIcon sx={{ color: '#94a3b8' }} />
            </ListItem>
            <Divider />
            <ListItem sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f8fafc' } }}>
              <ListItemIcon>
                <LockIcon sx={{ color: '#64748b' }} />
              </ListItemIcon>
              <ListItemText primary="隱私設定" />
              <ChevronRightIcon sx={{ color: '#94a3b8' }} />
            </ListItem>
            <Divider />
            <ListItem sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f8fafc' } }}>
              <ListItemIcon>
                <InfoIcon sx={{ color: '#64748b' }} />
              </ListItemIcon>
              <ListItemText primary="關於 MeetHalf" />
              <ChevronRightIcon sx={{ color: '#94a3b8' }} />
            </ListItem>
          </List>
        </Paper>
      </Box>

      {/* Logout Button */}
      <Box sx={{ px: 2, mt: 4 }}>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            py: 1.5,
            borderRadius: 3,
            fontWeight: 600,
          }}
        >
          登出帳號
        </Button>
      </Box>
    </Box>
  );
}


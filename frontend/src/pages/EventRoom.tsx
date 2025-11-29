import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Container,
  Chip,
  Paper,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { getMockEventById, getMockMembersByEventId } from '../mocks/eventData';
import type { Event, EventMember } from '../types/events';

export default function EventRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [members, setMembers] = useState<EventMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // 載入 Mock Data
  useEffect(() => {
    if (!id) {
      setError('找不到聚會 ID');
      setLoading(false);
      return;
    }

    // 模擬 API 載入延遲
    setTimeout(() => {
      const mockEvent = getMockEventById(id);
      const mockMembers = getMockMembersByEventId(id);

      if (!mockEvent) {
        setError('找不到此聚會');
        setLoading(false);
        return;
      }

      setEvent(mockEvent);
      setMembers(mockMembers);
      setLoading(false);
    }, 500);
  }, [id]);

  // 倒數計時邏輯
  useEffect(() => {
    if (!event) return;

    const updateCountdown = () => {
      const now = new Date();
      const eventTime = new Date(event.datetime);
      const diff = eventTime.getTime() - now.getTime();

      if (diff <= 0) {
        // 聚會已開始或結束
        const afterMinutes = Math.abs(diff) / 1000 / 60;
        if (afterMinutes > event.timeWindow.after) {
          setTimeRemaining('聚會已結束');
        } else {
          setTimeRemaining(`聚會進行中（已開始 ${Math.floor(afterMinutes)} 分鐘）`);
        }
      } else {
        // 聚會尚未開始
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeRemaining(`${days} 天 ${hours} 小時`);
        } else if (hours > 0) {
          setTimeRemaining(`${hours} 小時 ${minutes} 分鐘`);
        } else if (minutes > 0) {
          setTimeRemaining(`${minutes} 分 ${seconds} 秒`);
        } else {
          setTimeRemaining(`${seconds} 秒`);
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [event]);

  // 取得狀態顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'primary';
      case 'ongoing':
        return 'success';
      case 'ended':
        return 'default';
      default:
        return 'default';
    }
  };

  // 取得狀態文字
  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming':
        return '即將開始';
      case 'ongoing':
        return '進行中';
      case 'ended':
        return '已結束';
      default:
        return status;
    }
  };

  // Loading 狀態
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Error 狀態
  if (error || !event) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || '無法載入聚會資訊'}
        </Alert>
        <Typography
          variant="body2"
          sx={{ cursor: 'pointer', color: 'primary.main' }}
          onClick={() => navigate('/events')}
        >
          ← 返回聚會列表
        </Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: 'calc(100vh - 64px)', py: 3 }}>
      <Container maxWidth="lg">
        {/* 聚會資訊卡片 */}
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          {/* 狀態標籤 */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Chip
              label={getStatusText(event.status)}
              color={getStatusColor(event.status)}
              size="small"
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
            />
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              ID: {event.id}
            </Typography>
          </Box>

          {/* 聚會標題 */}
          <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 2 }}>
            {event.title}
          </Typography>

          {/* 倒數計時 */}
          <Box
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              borderRadius: 2,
              p: 2,
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TimeIcon />
              <Typography variant="h6">倒數計時</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
              {timeRemaining || '載入中...'}
            </Typography>
          </Box>

          {/* 聚會時間 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TimeIcon fontSize="small" />
            <Typography variant="body1">
              {new Date(event.datetime).toLocaleString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                weekday: 'short',
              })}
            </Typography>
          </Box>

          {/* 集合地點 */}
          {event.meetingPoint && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
              <LocationIcon fontSize="small" sx={{ mt: 0.5 }} />
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {event.meetingPoint.name}
                </Typography>
                {event.meetingPoint.address && (
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {event.meetingPoint.address}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {/* 成員數量 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon fontSize="small" />
            <Typography variant="body1">{members.length} 位成員</Typography>
          </Box>
        </Paper>

        {/* 提示訊息 */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            ⚡ 這是 Phase 1 的基本版本，地圖、成員列表等功能將在後續 Phase 中加入。
          </Typography>
        </Alert>

        {/* 成員預覽 */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon />
            參加成員
          </Typography>
          
          {members.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              目前還沒有成員加入
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {members.map((member) => (
                <Box
                  key={member.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'background.default',
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: member.isGuest ? 'warning.main' : 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  >
                    {member.nickname?.charAt(0) || '?'}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {member.nickname}
                      {member.isGuest && (
                        <Chip label="Guest" size="small" sx={{ ml: 1, height: 20 }} />
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {member.arrivalTime
                        ? '✅ 已到達'
                        : member.shareLocation
                        ? '📍 分享位置中'
                        : '🚶 前往中'}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}


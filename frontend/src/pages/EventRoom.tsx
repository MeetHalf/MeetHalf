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
    <Box sx={{ bgcolor: '#fafafa', minHeight: 'calc(100vh - 64px)', py: 4 }}>
      <Container maxWidth="md">
        {/* 聚會資訊卡片 - 極簡風格 */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 3,
            borderRadius: 3,
            bgcolor: 'white',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* 狀態標籤 */}
          <Box sx={{ mb: 3 }}>
            <Chip
              label={getStatusText(event.status)}
              size="small"
              sx={{
                bgcolor: event.status === 'ongoing' ? '#e8f5e9' : '#f5f5f5',
                color: event.status === 'ongoing' ? '#2e7d32' : 'text.secondary',
                fontWeight: 500,
                border: 'none',
              }}
            />
          </Box>

          {/* 聚會標題 - 大標題 */}
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 600,
              mb: 4,
              fontSize: { xs: '2rem', sm: '2.5rem' },
              color: '#1a1a1a',
              letterSpacing: '-0.02em',
            }}
          >
            {event.title}
          </Typography>

          {/* 倒數計時 - 簡約卡片 */}
          <Box
            sx={{
              bgcolor: '#f8f9fa',
              borderRadius: 2,
              p: 3,
              mb: 4,
              textAlign: 'center',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mb: 1,
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              倒數計時
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#1a1a1a',
                fontSize: { xs: '1.5rem', sm: '2rem' },
              }}
            >
              {timeRemaining || '載入中...'}
            </Typography>
          </Box>

          {/* 聚會詳情 - 極簡列表 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* 聚會時間 */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <TimeIcon sx={{ color: 'text.secondary', fontSize: 20, mt: 0.3 }} />
              <Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5, fontSize: '0.75rem' }}>
                  時間
                </Typography>
                <Typography variant="body1" sx={{ color: '#1a1a1a', fontWeight: 500 }}>
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
            </Box>

            {/* 集合地點 */}
            {event.meetingPoint && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <LocationIcon sx={{ color: 'text.secondary', fontSize: 20, mt: 0.3 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5, fontSize: '0.75rem' }}>
                    地點
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#1a1a1a', fontWeight: 500 }}>
                    {event.meetingPoint.name}
                  </Typography>
                  {event.meetingPoint.address && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      {event.meetingPoint.address}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* 成員數量 */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <PeopleIcon sx={{ color: 'text.secondary', fontSize: 20, mt: 0.3 }} />
              <Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5, fontSize: '0.75rem' }}>
                  參加人數
                </Typography>
                <Typography variant="body1" sx={{ color: '#1a1a1a', fontWeight: 500 }}>
                  {members.length} 位成員
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* 成員預覽 - 極簡風格 */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            bgcolor: 'white',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              mb: 3,
              fontWeight: 600,
              color: '#1a1a1a',
              letterSpacing: '-0.01em',
            }}
          >
            參加成員
          </Typography>
          
          {members.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
              目前還沒有成員加入
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {members.map((member, index) => (
                <Box
                  key={member.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 2.5,
                    borderTop: index === 0 ? 'none' : '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {/* Avatar */}
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666',
                      fontWeight: 600,
                      fontSize: '1.1rem',
                      border: '2px solid white',
                      flexShrink: 0,
                    }}
                  >
                    {member.nickname?.charAt(0) || '?'}
                  </Box>
                  
                  {/* 成員資訊 */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 500,
                        color: '#1a1a1a',
                        mb: 0.3,
                      }}
                    >
                      {member.nickname}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.875rem',
                      }}
                    >
                      {member.arrivalTime
                        ? '已到達'
                        : member.shareLocation
                        ? '分享位置中'
                        : '前往中'}
                    </Typography>
                  </Box>

                  {/* 狀態指示器 */}
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: member.arrivalTime
                        ? '#4caf50'
                        : member.shareLocation
                        ? '#2196f3'
                        : '#bdbdbd',
                      flexShrink: 0,
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        {/* 底部提示 */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            Phase 1 基本版本 • 地圖與即時功能開發中
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}


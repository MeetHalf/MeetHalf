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
  LinearProgress,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { getMockEventById, getMockMembersByEventId } from '../mocks/eventData';
import { useEventProgress } from '../hooks/useEventProgress';
import type { Event, EventMember } from '../types/events';

export default function EventRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [members, setMembers] = useState<EventMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 使用進度條 hook（始終調用，內部處理 null）
  const progress = useEventProgress(event);

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
      // 排序成員：已到達 → 分享位置中 → 前往中
      const sortedMembers = [...mockMembers].sort((a, b) => {
        if (a.arrivalTime && !b.arrivalTime) return -1;
        if (!a.arrivalTime && b.arrivalTime) return 1;
        if (!a.arrivalTime && !b.arrivalTime) {
          if (a.shareLocation && !b.shareLocation) return -1;
          if (!a.shareLocation && b.shareLocation) return 1;
        }
        return 0;
      });
      setMembers(sortedMembers);
      setLoading(false);
    }, 500);
  }, [id]);

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

          {/* 聚會標題 */}
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 600,
              mb: 3,
              fontSize: { xs: '1.75rem', sm: '2.25rem' },
              color: '#1a1a1a',
              letterSpacing: '-0.02em',
            }}
          >
            {event.name}
          </Typography>

          {/* 進度條區域 */}
          {progress && (
            <Box sx={{ mb: 4 }}>
              {/* 標籤 */}
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: 'text.secondary',
                  mb: 1,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                {progress.label}
              </Typography>

              {/* 進度條 */}
              <Box
                sx={{
                  position: 'relative',
                  height: 10,
                  bgcolor: '#e0e0e0',
                  borderRadius: 10,
                  overflow: 'hidden',
                  mb: 0.75,
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${progress.progress * 100}%`,
                    bgcolor: progress.color,
                    borderRadius: 10,
                    transition: 'width 0.5s ease-out',
                  }}
                />
              </Box>

              {/* 時間描述 */}
              {progress.description && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    textAlign: 'right',
                  }}
                >
                  {progress.description}
                </Typography>
              )}
            </Box>
          )}

          {/* 聚會詳情 - 緊湊列表 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* 聚會時間 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TimeIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
              <Typography variant="body2" sx={{ color: '#1a1a1a', fontWeight: 500, fontSize: '0.875rem' }}>
                {new Date(event.startTime).toLocaleString('zh-TW', {
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
            {(event.meetingPointName || event.meetingPointAddress) && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <LocationIcon sx={{ color: 'text.secondary', fontSize: 18, mt: 0.25 }} />
                <Box>
                  {event.meetingPointName && (
                    <Typography variant="body2" sx={{ color: '#1a1a1a', fontWeight: 500, fontSize: '0.875rem' }}>
                      {event.meetingPointName}
                    </Typography>
                  )}
                  {event.meetingPointAddress && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                      {event.meetingPointAddress}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* 成員數量 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PeopleIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
              <Typography variant="body2" sx={{ color: '#1a1a1a', fontWeight: 500, fontSize: '0.875rem' }}>
                {members.length} 位成員
              </Typography>
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
              mb: 0.5,
              fontWeight: 600,
              color: '#1a1a1a',
              letterSpacing: '-0.01em',
            }}
          >
            參加成員
          </Typography>

          {/* 排序說明 */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: 'text.secondary',
              mb: 3,
              fontSize: '0.75rem',
            }}
          >
            依到達狀態排序：已到達 → 分享位置中 → 前往中
          </Typography>
          
          {members.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
              目前還沒有成員加入
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {members.map((member, index) => {
                // 定義狀態
                const getMemberStatus = () => {
                  if (member.arrivalTime) {
                    return { text: '已到達', color: '#4caf50' };
                  }
                  if (member.shareLocation) {
                    return { text: '分享位置中', color: '#2196f3' };
                  }
                  return { text: '前往中', color: '#bdbdbd' };
                };
                const status = getMemberStatus();

                return (
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
                          fontSize: '0.8125rem',
                        }}
                      >
                        {status.text}
                      </Typography>
                    </Box>

                    {/* 狀態指示器 */}
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: status.color,
                        flexShrink: 0,
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          )}
        </Paper>

        {/* 底部提示 - 卡片樣式 */}
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            py: 2,
            px: 3,
            borderRadius: 2,
            bgcolor: '#f5f5f5',
            border: '1px solid',
            borderColor: '#e0e0e0',
            textAlign: 'center',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
              fontWeight: 500,
            }}
          >
            📍 Phase 1 基本版本 • 地圖與即時功能開發中
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}


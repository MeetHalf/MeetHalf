import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Container,
  Chip,
  Paper,
  Collapse,
  IconButton,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { getMockEventById, getMockMembersByEventId } from '../mocks/eventData';
import { useEventProgress } from '../hooks/useEventProgress';
import MapContainer from '../components/MapContainer';
import type { Event, EventMember, TravelMode } from '../types/events';

export default function EventRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [members, setMembers] = useState<EventMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberListExpanded, setMemberListExpanded] = useState(true);

  // 加入聚會相關狀態
  const [hasJoined, setHasJoined] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null);
  const [joinForm, setJoinForm] = useState({
    nickname: '',
    shareLocation: true,
    travelMode: 'transit' as TravelMode,
  });
  const [joining, setJoining] = useState(false);

  // 「我到了」相關狀態
  const [hasArrived, setHasArrived] = useState(false);
  const [marking, setMarking] = useState(false);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info',
  });

  // 使用進度條 hook（始終調用，內部處理 null）
  const progress = useEventProgress(event);

  // 載入 Mock Data
  useEffect(() => {
    if (!id) {
      setError('找不到聚會 ID');
      setLoading(false);
      return;
    }

    // 檢查 localStorage 是否已加入此聚會
    const storageKey = `event_${id}_member`;
    const storedMember = localStorage.getItem(storageKey);
    let savedMemberData = null;
    
    if (storedMember) {
      try {
        savedMemberData = JSON.parse(storedMember);
        setHasJoined(true);
        setCurrentMemberId(savedMemberData.memberId);
        setHasArrived(!!savedMemberData.arrivalTime);
      } catch (e) {
        console.error('Failed to parse stored member data:', e);
      }
    }

    // 模擬 API 載入延遲
    setTimeout(() => {
      const mockEvent = getMockEventById(id);
      let mockMembers = getMockMembersByEventId(id);

      if (!mockEvent) {
        setError('找不到此聚會');
        setLoading(false);
        return;
      }

      setEvent(mockEvent);
      
      // 如果 localStorage 有成員數據，將其恢復到成員列表中
      if (savedMemberData) {
        // 檢查成員列表中是否已存在該成員
        const memberExists = mockMembers.some(m => m.id === savedMemberData.memberId);
        
        if (!memberExists) {
          // 從 localStorage 恢復成員信息
          const restoredMember: EventMember = {
            id: savedMemberData.memberId,
            eventId: Number(id),
            userId: savedMemberData.userId || `guest_${savedMemberData.memberId}`,
            nickname: savedMemberData.nickname || '我',
            shareLocation: savedMemberData.shareLocation !== false,
            travelMode: savedMemberData.travelMode || 'transit',
            lat: savedMemberData.lat,
            lng: savedMemberData.lng,
            address: savedMemberData.address,
            arrivalTime: savedMemberData.arrivalTime,
            createdAt: savedMemberData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          mockMembers = [...mockMembers, restoredMember];
        }
      }
      
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

  // 加入聚會
  const handleJoinEvent = async () => {
    if (!event || !id) return;
    
    if (!joinForm.nickname.trim()) {
      setSnackbar({ open: true, message: '請輸入暱稱', severity: 'error' });
      return;
    }

    setJoining(true);
    
    try {
      // TODO: 改用真實 API
      // const response = await eventsApi.joinEvent(Number(id), joinForm);
      
      // 模擬 API 延遲
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock response
      const newMemberId = members.length + 1;
      const newMember: EventMember = {
        id: newMemberId,
        eventId: Number(id),
        userId: `guest_${Date.now()}`,
        nickname: joinForm.nickname,
        shareLocation: joinForm.shareLocation,
        travelMode: joinForm.travelMode,
        lat: undefined,
        lng: undefined,
        address: undefined,
        arrivalTime: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // 儲存到 localStorage（完整成員信息）
      const storageKey = `event_${id}_member`;
      localStorage.setItem(storageKey, JSON.stringify({
        memberId: newMemberId,
        userId: `guest_${Date.now()}`,
        nickname: joinForm.nickname,
        shareLocation: joinForm.shareLocation,
        travelMode: joinForm.travelMode,
        guestToken: `mock_guest_token_${Date.now()}`,
        arrivalTime: null,
        createdAt: new Date().toISOString(),
      }));
      
      setHasJoined(true);
      setCurrentMemberId(newMemberId);
      
      // 添加新成員並重新排序
      const updatedMembers = [...members, newMember].sort((a, b) => {
        if (a.arrivalTime && !b.arrivalTime) return -1;
        if (!a.arrivalTime && b.arrivalTime) return 1;
        if (!a.arrivalTime && !b.arrivalTime) {
          if (a.shareLocation && !b.shareLocation) return -1;
          if (!a.shareLocation && b.shareLocation) return 1;
        }
        return 0;
      });
      
      setMembers(updatedMembers);
      setSnackbar({ open: true, message: '成功加入聚會！', severity: 'success' });
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: err instanceof Error ? err.message : '加入失敗，請稍後再試', 
        severity: 'error' 
      });
    } finally {
      setJoining(false);
    }
  };

  // 標記「我到了」
  const handleMarkArrival = async () => {
    if (!event || !id || !currentMemberId) return;
    
    setMarking(true);
    
    try {
      // TODO: 改用真實 API
      // const response = await eventsApi.markArrival(Number(id));
      
      // 模擬 API 延遲
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 更新本地狀態
      setHasArrived(true);
      const arrivalTime = new Date().toISOString();
      
      // 更新 localStorage
      const storageKey = `event_${id}_member`;
      const storedMember = localStorage.getItem(storageKey);
      if (storedMember) {
        const memberData = JSON.parse(storedMember);
        memberData.arrivalTime = arrivalTime;
        localStorage.setItem(storageKey, JSON.stringify(memberData));
      }
      
      // 更新成員列表並重新排序
      const updatedMembers = members.map(m => 
        m.id === currentMemberId 
          ? { ...m, arrivalTime } 
          : m
      ).sort((a, b) => {
        if (a.arrivalTime && !b.arrivalTime) return -1;
        if (!a.arrivalTime && b.arrivalTime) return 1;
        if (!a.arrivalTime && !b.arrivalTime) {
          if (a.shareLocation && !b.shareLocation) return -1;
          if (!a.shareLocation && b.shareLocation) return 1;
        }
        return 0;
      });
      
      setMembers(updatedMembers);
      
      setSnackbar({ open: true, message: '✅ 已標記到達！', severity: 'success' });
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: err instanceof Error ? err.message : '標記失敗，請稍後再試', 
        severity: 'error' 
      });
    } finally {
      setMarking(false);
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

  // Memoize 地圖中心點，避免重新渲染
  const mapCenter = useMemo(() => {
    if (event?.meetingPointLat && event?.meetingPointLng) {
      return { lat: event.meetingPointLat, lng: event.meetingPointLng };
    }
    return undefined;
  }, [event?.meetingPointLat, event?.meetingPointLng]);

  // Memoize 地圖標記，避免重新渲染
  const mapMarkers = useMemo(() => {
    const markers = [];

    // 集合地點標記
    if (event?.meetingPointLat && event?.meetingPointLng) {
      markers.push({
        lat: event.meetingPointLat,
        lng: event.meetingPointLng,
        title: event.meetingPointName || '集合地點',
        label: '📍',
      });
    }

    // 成員位置標記
    members
      .filter((m) => m.lat && m.lng && m.shareLocation)
      .forEach((m) => {
        markers.push({
          lat: m.lat!,
          lng: m.lng!,
          title: m.nickname || '成員',
          label: m.arrivalTime ? '✅' : (m.nickname?.charAt(0) || '?'),
        });
      });

    return markers;
  }, [event?.meetingPointLat, event?.meetingPointLng, event?.meetingPointName, members]);

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

  // 未加入狀態 - 顯示聚會預覽和加入表單
  if (!hasJoined) {
    return (
      <Box sx={{ bgcolor: '#fafafa', minHeight: 'calc(100vh - 64px)', py: 4 }}>
        <Container maxWidth="md">
          {/* 聚會預覽卡片 */}
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
            <Chip
              label={getStatusText(event.status)}
              size="small"
              sx={{
                mb: 3,
                bgcolor: event.status === 'ongoing' ? '#e8f5e9' : '#f5f5f5',
                color: event.status === 'ongoing' ? '#2e7d32' : 'text.secondary',
                fontWeight: 500,
              }}
            />
            
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 3, color: '#1a1a1a' }}>
              你被邀請參加：{event.name}
            </Typography>

            {/* 聚會詳情 */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
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

              {event.meetingPointName && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <LocationIcon sx={{ color: 'text.secondary', fontSize: 18, mt: 0.25 }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: '#1a1a1a', fontWeight: 500, fontSize: '0.875rem' }}>
                      {event.meetingPointName}
                    </Typography>
                    {event.meetingPointAddress && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        {event.meetingPointAddress}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <PeopleIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: '#1a1a1a', fontWeight: 500, fontSize: '0.875rem' }}>
                  {members.length} 位成員已加入
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* 加入表單 */}
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
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: '#1a1a1a' }}>
              加入聚會
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="你的暱稱"
                placeholder="例如：小明"
                value={joinForm.nickname}
                onChange={(e) => setJoinForm({ ...joinForm, nickname: e.target.value })}
                fullWidth
                required
              />

              <FormControl fullWidth>
                <InputLabel>交通方式</InputLabel>
                <Select
                  value={joinForm.travelMode}
                  onChange={(e) => setJoinForm({ ...joinForm, travelMode: e.target.value as TravelMode })}
                  label="交通方式"
                >
                  <MenuItem value="driving">🚗 開車</MenuItem>
                  <MenuItem value="transit">🚇 大眾運輸</MenuItem>
                  <MenuItem value="walking">🚶 步行</MenuItem>
                  <MenuItem value="bicycling">🚴 騎車</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={joinForm.shareLocation}
                    onChange={(e) => setJoinForm({ ...joinForm, shareLocation: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      分享我的位置
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      我們會在聚會前後 30 分鐘內追蹤你的位置
                    </Typography>
                  </Box>
                }
              />

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleJoinEvent}
                disabled={joining}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                {joining ? <CircularProgress size={24} /> : '加入聚會'}
              </Button>
            </Box>
          </Paper>

          {/* Snackbar */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            message={snackbar.message}
          />
        </Container>
      </Box>
    );
  }

  // 已加入狀態 - 顯示完整 EventRoom
  return (
    <Box sx={{ bgcolor: '#fafafa', minHeight: 'calc(100vh - 64px)', py: 4, pb: 10 }}>
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

        {/* 地圖區塊 */}
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            borderRadius: 3,
            bgcolor: 'white',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <MapContainer center={mapCenter} markers={mapMarkers} />
        </Paper>

        {/* 成員預覽 - 極簡風格（可收合） */}
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            borderRadius: 3,
            bgcolor: 'white',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* 標題列 - 可點擊收合 */}
          <Box
            sx={{
              px: 4,
              pt: 4,
              pb: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onClick={() => setMemberListExpanded(!memberListExpanded)}
          >
            <Box>
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
                  fontSize: '0.75rem',
                }}
              >
                依到達狀態排序：已到達 → 分享位置中 → 前往中
              </Typography>
            </Box>

            {/* 展開/收合按鈕 */}
            <IconButton
              sx={{
                transform: memberListExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s',
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>

          {/* 可收合的成員列表 */}
          <Collapse in={memberListExpanded}>
            <Box sx={{ px: 4, pb: 4 }}>
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
                const isCurrentUser = member.id === currentMemberId;

                return (
                  <Box
                    key={member.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      py: 2.5,
                      px: 2,
                      mx: -2,
                      borderTop: index === 0 ? 'none' : '1px solid',
                      borderColor: 'divider',
                      bgcolor: isCurrentUser ? '#e3f2fd' : 'transparent',
                      borderRadius: isCurrentUser ? 2 : 0,
                    }}
                  >
                    {/* Avatar */}
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: isCurrentUser ? status.color : '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isCurrentUser ? 'white' : '#666',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        border: `2px solid ${isCurrentUser ? 'white' : '#e0e0e0'}`,
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
                        {isCurrentUser && (
                          <Chip
                            label="你"
                            size="small"
                            sx={{
                              ml: 1,
                              height: 20,
                              fontSize: '0.7rem',
                              bgcolor: '#1976d2',
                              color: 'white',
                            }}
                          />
                        )}
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
            </Box>
          </Collapse>
        </Paper>

        {/* 「我到了」按鈕 - 成員列表下方 */}
        {!hasArrived && (
          <Paper
            elevation={0}
            sx={{
              mt: 3,
              p: 3,
              borderRadius: 3,
              bgcolor: 'white',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleMarkArrival}
              disabled={marking}
              startIcon={marking ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <CheckIcon />}
              sx={{
                py: 2,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1.125rem',
                fontWeight: 600,
                bgcolor: '#4caf50',
                '&:hover': {
                  bgcolor: '#45a049',
                },
                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
              }}
            >
              {marking ? '標記中...' : '我到了！'}
            </Button>
          </Paper>
        )}

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
            📍 EventRoom 完整版 • Guest 加入 + 地圖顯示 + 到達標記
          </Typography>
        </Paper>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
        />
      </Container>
    </Box>
  );
}


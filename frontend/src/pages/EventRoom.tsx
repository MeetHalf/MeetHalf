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
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  TouchApp as PokeIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { eventsApi, type Event as ApiEvent, type Member, type TravelMode } from '../api/events';
import { useEventProgress } from '../hooks/useEventProgress';
import { usePusher } from '../hooks/usePusher';
import { requestNotificationPermission, showPokeNotification } from '../lib/notifications';
import { initializeBeamsClient, subscribeToInterest, unsubscribeFromInterest } from '../lib/pusherBeams';
import type { PokeEvent, EventEndedEvent, MemberArrivedEvent, MemberJoinedEvent, LocationUpdateEvent } from '../types/events';
import MapContainer from '../components/MapContainer';
import EventResultPopup from '../components/EventResultPopup';

export default function EventRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
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
  
  // 戳人相關狀態
  const [pokingMemberId, setPokingMemberId] = useState<number | null>(null);
  
  // 結果彈出視窗
  const [showResultPopup, setShowResultPopup] = useState(false);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info',
  });

  // 請求通知權限並初始化 Pusher Beams
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        // Request notification permission
        const permission = await requestNotificationPermission();
        console.log('[EventRoom] Notification permission status:', {
          permission,
          granted: permission === 'granted',
          denied: permission === 'denied',
          default: permission === 'default',
        });
        
        if (permission === 'granted') {
          console.log('[EventRoom] ✓ Notification permission granted');
          
          // Initialize Pusher Beams client (this will also register Service Worker)
          const client = await initializeBeamsClient();
          if (client) {
            console.log('[EventRoom] ✓ Pusher Beams client initialized');
          } else {
            console.warn('[EventRoom] ⚠️ Failed to initialize Pusher Beams client');
          }
        } else if (permission === 'denied') {
          console.warn('[EventRoom] ⚠️ Notification permission denied by user');
        } else {
          console.log('[EventRoom] Notification permission is default (not yet requested)');
        }
      } catch (err) {
        console.error('[EventRoom] Failed to setup notifications:', err);
      }
    };
    
    setupNotifications();
  }, []);

  // 訂閱 Pusher Beams Device Interest（當用戶已加入活動時）
  useEffect(() => {
    if (!event || !currentMemberId) {
      return;
    }

    // Add a delay to ensure initialization is complete
    const subscribeToPushNotifications = async () => {
      try {
        // Wait a bit to ensure Pusher Beams is fully initialized
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Subscribe to device interest: event-{eventId}-member-{memberId}
        const interest = `event-${event.id}-member-${currentMemberId}`;
        console.log('[EventRoom] Attempting to subscribe to interest:', interest);
        
        const success = await subscribeToInterest(interest);
        
        if (success) {
          console.log('[EventRoom] ✓ Successfully subscribed to push notifications:', interest);
          
          // Verify subscription
          const { getSubscribedInterests } = await import('../lib/pusherBeams');
          const interests = await getSubscribedInterests();
          console.log('[EventRoom] Current subscribed interests:', interests);
        } else {
          console.warn('[EventRoom] ⚠️ Failed to subscribe to push notifications');
          console.warn('[EventRoom] Please check:');
          console.warn('  1. Service Worker is registered');
          console.warn('  2. Notification permission is granted');
          console.warn('  3. Pusher Beams client is initialized');
        }
      } catch (error) {
        console.error('[EventRoom] Error subscribing to push notifications:', error);
      }
    };

    subscribeToPushNotifications();

    // Cleanup: unsubscribe when component unmounts or member/event changes
    return () => {
      if (event && currentMemberId) {
        const interest = `event-${event.id}-member-${currentMemberId}`;
        unsubscribeFromInterest(interest).catch((error) => {
          console.error('[EventRoom] Error unsubscribing from push notifications:', error);
        });
      }
    };
  }, [event, currentMemberId]);

  // 整合 Pusher - 監聽 poke 事件
  usePusher({
    channelName: event ? `event-${event.id}` : null,
    eventName: 'poke',
    onEvent: (data: PokeEvent) => {
      console.log('[EventRoom] Received poke event:', {
        data,
        currentMemberId,
        toMemberId: data.toMemberId,
        matches: currentMemberId === data.toMemberId,
      });
      
      // 僅在收到 poke 事件且 toMemberId 匹配當前用戶的 memberId 時顯示通知
      if (currentMemberId && data.toMemberId === currentMemberId) {
        console.log('[EventRoom] Showing poke notification:', {
          fromNickname: data.fromNickname,
          count: data.count,
        });
        showPokeNotification(data.fromNickname, data.count);
        
        // 顯示 Snackbar 提示
        setSnackbar({
          open: true,
          message: `👆 ${data.fromNickname} 戳了你${data.count > 1 ? ` (${data.count} 次)` : ''}！`,
          severity: 'info',
        });
      } else {
        // 即使不是戳自己，也顯示誰戳了誰（可選，讓用戶知道活動中的互動）
        if (data.fromMemberId !== currentMemberId) {
          // 找到被戳的成員名稱
          const targetMember = members.find(m => m.id === data.toMemberId);
          const targetNickname = targetMember?.nickname || '某人';
          
          // 只在 Console 記錄，不顯示通知（避免打擾）
          console.log('[EventRoom] Poke event (not for you):', {
            from: data.fromNickname,
            to: targetNickname,
          });
        }
      }
    },
    onConnected: () => {
      console.log('[EventRoom] Pusher connected successfully');
    },
    onError: (error) => {
      console.error('[EventRoom] Pusher error:', error);
    },
    debug: true, // Enable debug logging
  });

  // 整合 Pusher - 監聽 member-joined 事件（成員加入）
  usePusher({
    channelName: event ? `event-${event.id}` : null,
    eventName: 'member-joined',
    onEvent: (data: MemberJoinedEvent) => {
      console.log('[EventRoom] Received member-joined event:', data);
      
      // 檢查成員是否已經存在（避免重複添加）
      const memberExists = members.some(m => m.id === data.memberId);
      if (memberExists) {
        console.log('[EventRoom] Member already exists, skipping:', data.memberId);
        return;
      }
      
      // 添加新成員到列表
      const newMember: Member = {
        id: data.memberId,
        userId: data.userId || null,
        eventId: event!.id,
        nickname: data.nickname,
        shareLocation: data.shareLocation,
        travelMode: data.travelMode || 'driving',
        lat: null,
        lng: null,
        address: null,
        arrivalTime: null,
        createdAt: data.createdAt,
        updatedAt: data.createdAt,
      };
      
      setMembers((prevMembers) => {
        const updatedMembers = [...prevMembers, newMember];
        
        // 重新排序：已到達的成員排在前面，然後是分享位置的，最後是其他
        return updatedMembers.sort((a, b) => {
          if (a.arrivalTime && !b.arrivalTime) return -1;
          if (!a.arrivalTime && b.arrivalTime) return 1;
          if (!a.arrivalTime && !b.arrivalTime) {
            if (a.shareLocation && !b.shareLocation) return -1;
            if (!a.shareLocation && b.shareLocation) return 1;
          }
          return 0;
        });
      });
      
      // 更新 event 中的成員資訊
      setEvent((prevEvent) => {
        if (!prevEvent) return null;
        return {
          ...prevEvent,
          members: [...(prevEvent.members || []), newMember],
        };
      });
      
      // 顯示通知（如果不是當前用戶）
      if (currentMemberId !== data.memberId) {
        setSnackbar({
          open: true,
          message: `👋 ${data.nickname} 加入了聚會！`,
          severity: 'info',
        });
      }
    },
    onConnected: () => {
      console.log('[EventRoom] Pusher connected for member-joined');
    },
    onError: (error) => {
      console.error('[EventRoom] Pusher error for member-joined:', error);
    },
    debug: true,
  });

  // 整合 Pusher - 監聽 member-arrived 事件（成員到達）
  usePusher({
    channelName: event ? `event-${event.id}` : null,
    eventName: 'member-arrived',
    onEvent: (data: MemberArrivedEvent) => {
      console.log('[EventRoom] Received member-arrived event:', data);
      
      // 更新成員列表：將到達的成員標記為已到達
      setMembers((prevMembers) => {
        const updatedMembers = prevMembers.map((member) => {
          if (member.id === data.memberId) {
            return {
              ...member,
              arrivalTime: data.arrivalTime,
            };
          }
          return member;
        });
        
        // 重新排序：已到達的成員排在前面
        return updatedMembers.sort((a, b) => {
          if (a.arrivalTime && !b.arrivalTime) return -1;
          if (!a.arrivalTime && b.arrivalTime) return 1;
          if (!a.arrivalTime && !b.arrivalTime) {
            if (a.shareLocation && !b.shareLocation) return -1;
            if (!a.shareLocation && b.shareLocation) return 1;
          }
          return 0;
        });
      });
      
      // 更新 event 中的成員資訊
      setEvent((prevEvent) => {
        if (!prevEvent) return null;
        return {
          ...prevEvent,
          members: prevEvent.members.map((member) => {
            if (member.id === data.memberId) {
              return {
                ...member,
                arrivalTime: data.arrivalTime,
              };
            }
            return member;
          }),
        };
      });
      
      // 顯示通知（如果不是當前用戶）
      if (currentMemberId !== data.memberId) {
        const statusEmoji = data.status === 'early' ? '⚡' : data.status === 'ontime' ? '✅' : '⏰';
        setSnackbar({
          open: true,
          message: `${statusEmoji} ${data.nickname} 已到達！`,
          severity: 'success',
        });
      }
    },
    onConnected: () => {
      console.log('[EventRoom] Pusher connected for member-arrived');
    },
    onError: (error) => {
      console.error('[EventRoom] Pusher error for member-arrived:', error);
    },
    debug: true,
  });

  // 整合 Pusher - 監聽 location-update 事件（位置更新）
  usePusher({
    channelName: event ? `event-${event.id}` : null,
    eventName: 'location-update',
    onEvent: (data: LocationUpdateEvent) => {
      console.log('[EventRoom] Received location-update event:', data);
      
      // 更新成員列表中的位置資訊
      setMembers((prevMembers) => {
        return prevMembers.map((member) => {
          if (member.id === data.memberId) {
            return {
              ...member,
              lat: data.lat,
              lng: data.lng,
            };
          }
          return member;
        });
      });
      
      // 更新 event 中的成員位置資訊
      setEvent((prevEvent) => {
        if (!prevEvent) return null;
        return {
          ...prevEvent,
          members: prevEvent.members.map((member) => {
            if (member.id === data.memberId) {
              return {
                ...member,
                lat: data.lat,
                lng: data.lng,
              };
            }
            return member;
          }),
        };
      });
      
      // 注意：地圖上的標記會自動更新，因為 MapContainer 使用 members prop
      console.log('[EventRoom] Member location updated on map');
    },
    onConnected: () => {
      console.log('[EventRoom] Pusher connected for location-update');
    },
    onError: (error) => {
      console.error('[EventRoom] Pusher error for location-update:', error);
    },
    debug: true,
  });

  // 整合 Pusher - 監聽 event-ended 事件
  usePusher({
    channelName: event ? `event-${event.id}` : null,
    eventName: 'event-ended',
    onEvent: (data: EventEndedEvent) => {
      console.log('[EventRoom] Received event-ended event:', data);
      setEvent((prevEvent) => (prevEvent ? { ...prevEvent, status: 'ended' } : null));
      setSnackbar({ 
        open: true, 
        message: '🎊 聚會已結束！查看排行榜結果', 
        severity: 'info' 
      });
      // 5 秒後自動顯示結果彈出視窗
      setTimeout(() => {
        setShowResultPopup(true);
      }, 5000);
    },
    onError: (error) => {
      console.error('[EventRoom] Pusher event-ended error:', error);
    },
    debug: true,
  });

  // 使用進度條 hook（始終調用，內部處理 null）
  const progress = useEventProgress(event);

  // 檢查 event 是否已結束（用於顯示「查看結果」按鈕）
  const isEventEnded = useMemo(() => {
    if (!event) return false;
    if (event.status === 'ended') return true;
    // 如果現在時間超過 endTime，也視為已結束
    const now = new Date();
    const endTime = new Date(event.endTime);
    return now > endTime;
  }, [event]);

  // 載入 Event 數據
  useEffect(() => {
    if (!id) {
      setError('找不到聚會 ID');
      setLoading(false);
      return;
    }

    // 檢查 localStorage 是否已加入此聚會
    const storageKey = `event_${id}_member`;
    const storedMember = localStorage.getItem(storageKey);
    let savedMemberData: any = null;
    
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

    // 呼叫真實 API
    const fetchEvent = async () => {
      try {
        const response = await eventsApi.getEvent(parseInt(id));

        if (!response || !response.event) {
          setError('找不到此聚會');
          setLoading(false);
          return;
        }

        setEvent(response.event);
        
        // 檢查當前用戶是否是成員
        if (savedMemberData && savedMemberData.memberId) {
          const currentMember = response.event.members.find(m => m.id === savedMemberData.memberId);
          if (currentMember) {
            setHasJoined(true);
            setCurrentMemberId(currentMember.id);
            setHasArrived(!!currentMember.arrivalTime);
            
            // 更新 localStorage 中的數據（確保與 API 同步）
            localStorage.setItem(storageKey, JSON.stringify({
              ...savedMemberData,
              arrivalTime: currentMember.arrivalTime,
              lat: currentMember.lat,
              lng: currentMember.lng,
              address: currentMember.address,
              shareLocation: currentMember.shareLocation,
              travelMode: currentMember.travelMode,
            }));
          } else {
            // 如果成員不存在，清除 localStorage
            localStorage.removeItem(storageKey);
            setHasJoined(false);
            setCurrentMemberId(null);
            setHasArrived(false);
          }
        }
        
        // 排序成員：已到達 → 分享位置中 → 前往中
        const sortedMembers = (response.event.members || []).sort((a, b) => {
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
      } catch (err: any) {
        console.error('載入聚會失敗:', err);
        setError(err.response?.data?.message || '載入聚會失敗');
        setLoading(false);
      }
    };

    fetchEvent();
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
      // 使用真實 API
      const response = await eventsApi.joinEvent(Number(id), {
        nickname: joinForm.nickname.trim(),
        shareLocation: joinForm.shareLocation,
        travelMode: joinForm.travelMode,
      });
      
      const { member, guestToken } = response;
      
      // 儲存到 localStorage（完整成員信息 + guest token）
      const storageKey = `event_${id}_member`;
      localStorage.setItem(storageKey, JSON.stringify({
        memberId: member.id,
        userId: member.userId,
        nickname: member.nickname || joinForm.nickname,
        shareLocation: member.shareLocation,
        travelMode: member.travelMode || joinForm.travelMode,
        guestToken: guestToken, // 保存真實的 guest token
        arrivalTime: member.arrivalTime,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
      }));
      
      setHasJoined(true);
      setCurrentMemberId(member.id);
      
      // 重新獲取 event 以獲取最新成員列表（包含新加入的成員）
      const eventResponse = await eventsApi.getEvent(Number(id));
      const updatedMembers = (eventResponse.event.members || []).sort((a, b) => {
        if (a.arrivalTime && !b.arrivalTime) return -1;
        if (!a.arrivalTime && b.arrivalTime) return 1;
        if (!a.arrivalTime && !b.arrivalTime) {
          if (a.shareLocation && !b.shareLocation) return -1;
          if (!a.shareLocation && b.shareLocation) return 1;
        }
        return 0;
      });
      
      setMembers(updatedMembers);
      setEvent(eventResponse.event);
      
      setSnackbar({ open: true, message: '成功加入聚會！', severity: 'success' });
    } catch (err: any) {
      console.error('加入聚會失敗:', err);
      const errorMessage = err.response?.data?.message || err.message || '加入失敗，請稍後再試';
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
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
      // 使用真實 API
      const response = await eventsApi.markArrival(Number(id));
      
      // 更新本地狀態
      setHasArrived(true);
      
      // 更新 localStorage
      const storageKey = `event_${id}_member`;
      const storedMember = localStorage.getItem(storageKey);
      if (storedMember) {
        const memberData = JSON.parse(storedMember);
        memberData.arrivalTime = response.arrivalTime;
        localStorage.setItem(storageKey, JSON.stringify(memberData));
      }
      
      // 重新獲取 event 以獲取最新成員列表
      const eventResponse = await eventsApi.getEvent(Number(id));
      const updatedMembers = (eventResponse.event.members || []).sort((a, b) => {
        if (a.arrivalTime && !b.arrivalTime) return -1;
        if (!a.arrivalTime && b.arrivalTime) return 1;
        if (!a.arrivalTime && !b.arrivalTime) {
          if (a.shareLocation && !b.shareLocation) return -1;
          if (!a.shareLocation && b.shareLocation) return 1;
        }
        return 0;
      });
      
      setMembers(updatedMembers);
      setEvent(eventResponse.event);
      
      const statusEmoji = response.status === 'early' ? '⚡' : response.status === 'ontime' ? '✅' : '⏰';
      setSnackbar({ 
        open: true, 
        message: `${statusEmoji} 已標記到達！${response.status === 'late' ? ` (遲到 ${response.lateMinutes} 分鐘)` : ''}`, 
        severity: 'success' 
      });
    } catch (err: any) {
      console.error('標記到達失敗:', err);
      const errorMessage = err.response?.data?.message || err.message || '標記失敗，請稍後再試';
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' 
      });
    } finally {
      setMarking(false);
    }
  };

  // 戳人
  const handlePokeMember = async (targetMemberId: number) => {
    if (!event || !id || !currentMemberId || targetMemberId === currentMemberId) {
      console.log('[EventRoom] Cannot poke:', {
        hasEvent: !!event,
        eventId: id,
        currentMemberId,
        targetMemberId,
        reason: !event ? 'no event' : !id ? 'no id' : !currentMemberId ? 'no currentMemberId' : 'self poke',
      });
      return;
    }
    
    console.log('[EventRoom] Poking member:', {
      eventId: id,
      currentMemberId,
      targetMemberId,
      timestamp: new Date().toISOString(),
    });
    
    setPokingMemberId(targetMemberId);
    
    try {
      const response = await eventsApi.pokeMember(Number(id), targetMemberId);
      
      console.log('[EventRoom] ✓ Poke API response:', response);
      
      const targetMember = members.find(m => m.id === targetMemberId);
      const targetNickname = targetMember?.nickname || '成員';
      
      setSnackbar({ 
        open: true, 
        message: `👆 已戳 ${targetNickname}！(${response.pokeCount}/3 次)`, 
        severity: 'success' 
      });
    } catch (err: any) {
      console.error('[EventRoom] ✗ Poke API error:', {
        error: err,
        message: err?.message,
        response: err?.response?.data,
        eventId: id,
        targetMemberId,
      });
      const errorMessage = err.response?.data?.message || err.message || '戳人失敗，請稍後再試';
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' 
      });
    } finally {
      setPokingMemberId(null);
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

              {/* 主揪資訊 */}
              {(() => {
                // 嘗試從 members 中找到 owner 的 member 記錄
                const ownerMember = event.members?.find(m => m.userId === event.ownerId);
                const ownerDisplayName = ownerMember?.nickname || 
                  (event.ownerId.includes('_') 
                    ? event.ownerId.split('_')[0] 
                    : event.ownerId);
                
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <PersonIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: '#1a1a1a', fontWeight: 500, fontSize: '0.875rem' }}>
                      主揪：{ownerDisplayName}
                    </Typography>
                  </Box>
                );
              })()}
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
              mb: 1,
              fontSize: { xs: '1.75rem', sm: '2.25rem' },
              color: '#1a1a1a',
              letterSpacing: '-0.02em',
            }}
          >
            {event.name}
          </Typography>

          {/* 主揪資訊 */}
          {(() => {
            // 嘗試從 members 中找到 owner 的 member 記錄
            const ownerMember = event.members?.find(m => m.userId === event.ownerId);
            const ownerDisplayName = ownerMember?.nickname || 
              (event.ownerId.includes('_') 
                ? event.ownerId.split('_')[0] 
                : event.ownerId);
            
            return (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: 'text.secondary',
                  mb: 3,
                  fontSize: '0.875rem',
                }}
              >
                主揪：{ownerDisplayName}
              </Typography>
            );
          })()}

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
                const isOwner = event && member.userId === event.ownerId;

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
                      bgcolor: isOwner && isCurrentUser ? '#fff8e1' : isCurrentUser ? '#e3f2fd' : isOwner ? '#fff8e1' : 'transparent',
                      borderRadius: isCurrentUser || isOwner ? 2 : 0,
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
                        {isOwner && (
                          <Chip
                            label="主揪"
                            size="small"
                            sx={{
                              ml: 1,
                              height: 20,
                              fontSize: '0.7rem',
                              bgcolor: '#ff9800',
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        )}
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

                    {/* 戳人按鈕（不能戳自己） */}
                    {!isCurrentUser && hasJoined && (
                      <IconButton
                        size="small"
                        onClick={() => handlePokeMember(member.id)}
                        disabled={pokingMemberId === member.id}
                        sx={{
                          color: '#ff6b6b',
                          '&:hover': {
                            bgcolor: '#ffe0e0',
                            transform: 'scale(1.1)',
                          },
                          transition: 'all 0.2s',
                        }}
                        title="戳一下"
                      >
                        <PokeIcon />
                      </IconButton>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
            </Box>
          </Collapse>
        </Paper>

        {/* 「我到了」按鈕 - 成員列表下方 */}
        {!hasArrived && !isEventEnded && (
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

        {/* 「查看結果」按鈕 - 聚會結束後顯示 */}
        {isEventEnded && (
          <Paper
            elevation={0}
            sx={{
              mt: 3,
              p: 2.5,
              borderRadius: 2,
              bgcolor: 'white',
              border: '1px solid',
              borderColor: '#E5E9F0',
            }}
          >
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => setShowResultPopup(true)}
              startIcon={<TrophyIcon sx={{ fontSize: 20 }} />}
              sx={{
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                borderColor: 'primary.main',
                color: 'primary.main',
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  borderColor: 'primary.dark',
                  bgcolor: 'primary.light',
                  color: 'primary.dark',
                },
              }}
            >
              查看排行榜結果
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

        {/* EventResultPopup */}
        {id && (
          <EventResultPopup
            open={showResultPopup}
            onClose={() => setShowResultPopup(false)}
            eventId={Number(id)}
          />
        )}
      </Container>
    </Box>
  );
}


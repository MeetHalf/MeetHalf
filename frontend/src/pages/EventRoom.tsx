import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { eventsApi, type Event as ApiEvent, type Member, type TravelMode, type MemberETA } from '../api/events';
import { useEventProgress } from '../hooks/useEventProgress';
import { usePusher } from '../hooks/usePusher';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { showPokeNotification } from '../lib/notifications';
import { initializeBeamsClient, subscribeToInterest, unsubscribeFromInterest } from '../lib/pusherBeams';
import { LOCATION_CONFIG } from '../config/location';
import type { PokeEvent, EventEndedEvent, MemberArrivedEvent, MemberJoinedEvent, LocationUpdateEvent } from '../types/events';
import MapContainer from '../components/MapContainer';
import EventResultPopup from '../components/EventResultPopup';

export default function EventRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth(); // 獲取當前登入用戶信息
  
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberListExpanded, setMemberListExpanded] = useState(true);
  
  // 新 UI 相關狀態
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

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
  
  // ETA 相關狀態
  const [membersETA, setMembersETA] = useState<Map<number, MemberETA['eta']>>(new Map());
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info',
  });

  // 通知權限狀態
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'denied'
  );
  const [requestingPermission, setRequestingPermission] = useState(false);

  // 檢查通知權限狀態（不自動請求）
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      // 如果已經有權限，初始化 Pusher Beams
      if (Notification.permission === 'granted') {
        console.log('[EventRoom] ✓ Notification permission granted 已經啟用通知囉！');
        initializeBeamsClient().then((client) => {
          if (client) {
            console.log('[EventRoom] ✓ Pusher Beams client initialized 已經初始化 Pusher Beams 囉！');
          } else {
            console.warn('[EventRoom] ⚠️ Failed to initialize Pusher Beams client');
          }
        });
      }
    }
  }, []);

  // 處理通知權限請求（必須由用戶點擊觸發）
  const handleRequestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      setSnackbar({
        open: true,
        message: '您的瀏覽器不支援通知功能',
        severity: 'error',
      });
      return;
    }

    if (Notification.permission === 'granted') {
      setSnackbar({
        open: true,
        message: '通知權限已啟用',
        severity: 'success',
      });
      return;
    }

    // 即使權限是 'denied'，也嘗試再次請求（某些瀏覽器可能會重新考慮）
    // 如果仍然是 'denied'，我們會顯示更詳細的說明
    setRequestingPermission(true);
    try {
      // 直接調用 Notification.requestPermission()，即使當前狀態是 'denied'
      // 這允許瀏覽器有機會重新考慮（例如用戶清除了瀏覽器數據後）
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        console.log('[EventRoom] ✓ Notification permission granted');
        
        // Initialize Pusher Beams client
        const client = await initializeBeamsClient();
        if (client) {
          console.log('[EventRoom] ✓ Pusher Beams client initialized');
          setSnackbar({
            open: true,
            message: '通知權限已啟用！您將收到聚會相關通知。',
            severity: 'success',
          });
        } else {
          console.warn('[EventRoom] ⚠️ Failed to initialize Pusher Beams client');
          setSnackbar({
            open: true,
            message: '通知權限已啟用，但初始化通知服務失敗',
            severity: 'error',
          });
        }
      } else if (permission === 'denied') {
        console.warn('[EventRoom] ⚠️ Notification permission denied by user');
        // 提供更詳細的說明，告訴用戶如何在瀏覽器設置中啟用
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isChrome = /Chrome/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && !isChrome;
        const isFirefox = /Firefox/.test(navigator.userAgent);
        
        let instructions = '';
        if (isIOS) {
          instructions = '請前往「設定」>「Safari」>「網站設定」>「通知」，然後允許此網站的通知。';
        } else if (isChrome) {
          instructions = '請點擊網址列左側的鎖頭圖示，然後將「通知」設為「允許」。';
        } else if (isSafari) {
          instructions = '請前往「Safari」>「偏好設定」>「網站」>「通知」，然後允許此網站的通知。';
        } else if (isFirefox) {
          instructions = '請點擊網址列左側的圖示，然後將「通知」設為「允許」。';
        } else {
          instructions = '請在瀏覽器設定中搜尋「通知」或「網站權限」，然後允許此網站的通知。';
        }
        
        setSnackbar({
          open: true,
          message: `通知權限被拒絕。${instructions}`,
          severity: 'error',
        });
      } else {
        // permission === 'default' (理論上不應該發生，因為我們剛剛請求了)
        setSnackbar({
          open: true,
          message: '通知權限狀態未知，請重新整理頁面後再試。',
          severity: 'error',
        });
      }
    } catch (err) {
      console.error('[EventRoom] Failed to request notification permission:', err);
      setSnackbar({
        open: true,
        message: '請求通知權限時發生錯誤',
        severity: 'error',
      });
    } finally {
      setRequestingPermission(false);
    }
  };

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
      
      // 如果是當前用戶到達，更新 hasArrived 狀態
      if (currentMemberId === data.memberId) {
        setHasArrived(true);
        
        // 更新 localStorage
        if (id) {
          const storageKey = `event_${id}_member`;
          const storedMember = localStorage.getItem(storageKey);
          if (storedMember) {
            const memberData = JSON.parse(storedMember);
            memberData.arrivalTime = data.arrivalTime;
            localStorage.setItem(storageKey, JSON.stringify(memberData));
          }
        }
      } else {
        // 顯示通知（如果不是當前用戶）
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

  // 位置追蹤 hook
  const currentMember = members.find(m => m.id === currentMemberId);
  useLocationTracking({
    enabled: hasJoined && (currentMember?.shareLocation || false),
    eventId: Number(id || 0),
    shareLocation: currentMember?.shareLocation || false,
    hasJoined,
    startTime: event?.startTime || '',
    endTime: event?.endTime || '',
    onError: (error: any) => {
      // 只在開發模式或非 400 錯誤時記錄詳細錯誤
      const isValidationError = error?.response?.status === 400;
      const errorMessage = error?.response?.data?.message || error?.message || '位置追蹤錯誤';
      
      if (!isValidationError || import.meta.env.DEV) {
        console.error('[EventRoom] Location tracking error:', {
          error,
          status: error?.response?.status,
          message: errorMessage,
          code: error?.response?.data?.code,
        });
      }
      
      // 只在非驗證錯誤或開發模式下顯示錯誤提示（避免打擾用戶）
      if (!isValidationError || import.meta.env.DEV) {
        setSnackbar({
          open: true,
          message: `位置追蹤錯誤: ${errorMessage}`,
          severity: 'error',
        });
      }
    },
    onLocationUpdate: (lat, lng) => {
      // 立即更新当前用户的位置，让地图立即显示
      if (currentMemberId) {
        console.log('[EventRoom] Immediately updating current member location on map', {
          memberId: currentMemberId,
          lat,
          lng,
        });
        
        setMembers((prevMembers) => {
          return prevMembers.map((member) => {
            if (member.id === currentMemberId) {
              return {
                ...member,
                lat,
                lng,
              };
            }
            return member;
          });
        });
        
        // 同时更新 event 中的成员位置
        setEvent((prevEvent) => {
          if (!prevEvent) return null;
          return {
            ...prevEvent,
            members: prevEvent.members.map((member) => {
              if (member.id === currentMemberId) {
                return {
                  ...member,
                  lat,
                  lng,
                };
              }
              return member;
            }),
          };
        });
      }
    },
  });

  // 定期更新 ETA
  useEffect(() => {
    if (!event || !id || !event.meetingPointLat || !event.meetingPointLng) {
      return;
    }

    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3;

    const updateETA = async () => {
      try {
        const response = await eventsApi.getMembersETA(Number(id));
        const etaMap = new Map<number, MemberETA['eta']>();
        response.members.forEach((member) => {
          etaMap.set(member.memberId, member.eta);
        });
        setMembersETA(etaMap);
        consecutiveFailures = 0; // 重置失敗計數
      } catch (error: any) {
        consecutiveFailures++;
        
        // 檢查是否為網絡錯誤（後端不可用）
        const isNetworkError = 
          error?.code === 'ERR_NETWORK' ||
          error?.code === 'ERR_CONNECTION_REFUSED' ||
          error?.code === 'ERR_EMPTY_RESPONSE' ||
          error?.message?.includes('Network Error') ||
          error?.message?.includes('Connection refused');
        
        // 如果是網絡錯誤且連續失敗次數較少，靜默處理（避免 Console 噪音）
        if (isNetworkError && consecutiveFailures <= MAX_CONSECUTIVE_FAILURES) {
          // 只在開發模式下記錄第一次失敗
          if (consecutiveFailures === 1 && import.meta.env.DEV) {
            console.warn('[EventRoom] Backend unavailable, ETA updates paused');
          }
          return;
        }
        
        // 其他錯誤或連續失敗過多時才記錄
        console.error('[EventRoom] Failed to update ETA:', error);
      }
    };

    // 立即更新一次
    updateETA();

    // 定期更新
    const interval = setInterval(updateETA, LOCATION_CONFIG.ETA_UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [event, id]);

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

    // 等待 auth 載入完成後再檢查（避免在 user 未載入時檢查）
    if (authLoading) {
      return;
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
        
        // 檢查當前用戶是否是成員（優先檢查 localStorage，然後檢查已登入用戶）
        let currentMember: Member | undefined;
        
        // 方法 1: 檢查 localStorage 中的 guest member
        if (savedMemberData && savedMemberData.memberId) {
          currentMember = response.event.members.find(m => m.id === savedMemberData.memberId);
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
          }
        }
        
        // 方法 2: 如果沒有找到 guest member，檢查已登入用戶是否在 members 列表中
        if (!currentMember && user?.userId) {
          currentMember = response.event.members.find(m => m.userId === user.userId);
          if (currentMember) {
            console.log('[EventRoom] Found logged-in user in members list:', {
              userId: user.userId,
              memberId: currentMember.id,
              nickname: currentMember.nickname,
            });
            setHasJoined(true);
            setCurrentMemberId(currentMember.id);
            setHasArrived(!!currentMember.arrivalTime);
            
            // 將已登入用戶的 member 資料也保存到 localStorage（方便後續使用）
            localStorage.setItem(storageKey, JSON.stringify({
              memberId: currentMember.id,
              userId: currentMember.userId,
              nickname: currentMember.nickname,
              shareLocation: currentMember.shareLocation,
              travelMode: currentMember.travelMode,
              arrivalTime: currentMember.arrivalTime,
              lat: currentMember.lat,
              lng: currentMember.lng,
              address: currentMember.address,
              createdAt: currentMember.createdAt,
              updatedAt: currentMember.updatedAt,
            }));
          }
        }
        
        // 如果都沒有找到，確保狀態正確
        if (!currentMember) {
          setHasJoined(false);
          setCurrentMemberId(null);
          setHasArrived(false);
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
  }, [id, user, authLoading]);

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
        const eta = membersETA.get(m.id);
        const etaText = eta ? `約 ${eta.duration}` : '';
        const title = m.arrivalTime 
          ? `${m.nickname || '成員'} - 已到達`
          : `${m.nickname || '成員'}${etaText ? ` - ${etaText}` : ''}`;
        
        markers.push({
          lat: m.lat!,
          lng: m.lng!,
          title,
          label: m.arrivalTime ? '✅' : (m.nickname?.charAt(0) || '?'),
          avatarUrl: m.avatar || undefined,
        });
      });

    return markers;
  }, [event?.meetingPointLat, event?.meetingPointLng, event?.meetingPointName, members, membersETA]);

  // 計算兩點間距離（公尺）- Haversine 公式
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // 地球半徑（公尺）
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // 計算用戶與集合地點的距離
  const distanceToMeetingPoint = useMemo(() => {
    const myMember = members.find(m => m.id === currentMemberId);
    if (!myMember?.lat || !myMember?.lng || !event?.meetingPointLat || !event?.meetingPointLng) {
      return null;
    }
    return calculateDistance(
      myMember.lat, myMember.lng,
      event.meetingPointLat, event.meetingPointLng
    );
  }, [members, currentMemberId, event?.meetingPointLat, event?.meetingPointLng]);

  // 距離門檻：100 公尺內才能標記到達
  const ARRIVAL_THRESHOLD = 100;
  const canMarkArrival = distanceToMeetingPoint !== null && distanceToMeetingPoint <= ARRIVAL_THRESHOLD;

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

  // 已加入狀態 - 顯示完整 EventRoom（新 UI）
  // 取得主揪資訊
  const ownerMember = event.members?.find(m => m.userId === event.ownerId);
  const ownerDisplayName = ownerMember?.nickname || 
    (event.ownerId.includes('_') 
      ? event.ownerId.split('_')[0] 
      : event.ownerId);

  return (
    <Box sx={{ 
      position: 'fixed', 
      inset: 0, 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: '#f1f5f9',
      overflow: 'hidden',
      zIndex: 1200  // 高於 MUI AppBar 的 1100，完全覆蓋 Navbar
    }}>
      {/* 全屏地圖背景 */}
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MapContainer center={mapCenter} markers={mapMarkers} fullscreen />
      </Box>

      {/* 浮動 Header */}
      <Box sx={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        p: 2, 
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <Box sx={{ 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          mb: 2,
        }}>
          {/* 返回按鈕 */}
          <IconButton
            onClick={() => navigate('/events')}
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(12px)',
              borderRadius: 3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.4)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
              '&:active': { transform: 'scale(0.9)' },
              transition: 'all 0.2s',
            }}
          >
            <ArrowBackIcon sx={{ color: '#475569' }} />
          </IconButton>

          {/* 可展開的聚會資訊 Pill */}
          <Box
            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transition: 'all 0.3s ease-in-out',
              cursor: 'pointer',
              width: isInfoExpanded ? '80%' : 'auto',
              maxWidth: isInfoExpanded ? 400 : 'none',
              p: isInfoExpanded ? 2.5 : 1.5,
              px: isInfoExpanded ? 2.5 : 2,
              bgcolor: isInfoExpanded ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.8)',
              borderRadius: isInfoExpanded ? 4 : 6,
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          >
            {!isInfoExpanded ? (
              // 收合狀態
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ 
                  width: 8, 
                  height: 8, 
                  bgcolor: event.status === 'ongoing' ? '#3b82f6' : '#94a3b8',
                  borderRadius: '50%',
                  animation: event.status === 'ongoing' ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                  },
                }} />
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                  {event.name}
                </Typography>
                <TimeIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                  {format(new Date(event.startTime), 'HH:mm')}
                </Typography>
              </Box>
            ) : (
              // 展開狀態
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ 
                      fontSize: '0.625rem', 
                      fontWeight: 800, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.1em',
                      color: '#3b82f6',
                      mb: 0.5,
                    }}>
                      {event.status === 'ongoing' ? '進行中' : event.status === 'upcoming' ? '即將開始' : '已結束'}
                    </Typography>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>
                      {event.name}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: '50%', 
                    bgcolor: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                  }}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {/* 地點 */}
                  {event.meetingPointName && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ 
                        width: 32, height: 32, 
                        bgcolor: '#dbeafe', 
                        borderRadius: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <LocationIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                          {event.meetingPointName}
                        </Typography>
                        {event.meetingPointAddress && (
                          <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>
                            {event.meetingPointAddress}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                  
                  {/* 時間 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ 
                      width: 32, height: 32, 
                      bgcolor: '#ffedd5', 
                      borderRadius: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <TimeIcon sx={{ fontSize: 16, color: '#f97316' }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                        {format(new Date(event.startTime), 'HH:mm')} – {format(new Date(event.endTime), 'HH:mm')}
                      </Typography>
                      <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>
                        {format(new Date(event.startTime), 'yyyy/MM/dd (EEEE)', { locale: zhTW })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* 主揪 + 分享 */}
                <Box sx={{ 
                  pt: 2, 
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ 
                      width: 24, height: 24, 
                      borderRadius: '50%', 
                      bgcolor: '#dbeafe',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.5rem', fontWeight: 700,
                    }}>
                      {ownerDisplayName.charAt(0).toUpperCase()}
                    </Box>
                    <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: '#94a3b8' }}>
                      主揪：{ownerDisplayName}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<ShareIcon sx={{ fontSize: 12 }} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(window.location.href);
                      setSnackbar({ open: true, message: '已複製連結！', severity: 'success' });
                    }}
                    sx={{ 
                      fontSize: '0.625rem', 
                      fontWeight: 800, 
                      color: '#3b82f6',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      minWidth: 'auto',
                      p: 0.5,
                    }}
                  >
                    分享連結
                  </Button>
                </Box>
              </Box>
            )}
          </Box>

          {/* 排行榜按鈕 */}
          <IconButton
            onClick={() => setShowResultPopup(true)}
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(12px)',
              borderRadius: 3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.4)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
              '&:active': { transform: 'scale(0.9)' },
              transition: 'all 0.2s',
            }}
          >
            <TrophyIcon sx={{ color: '#3b82f6' }} />
          </IconButton>
        </Box>
      </Box>

      {/* 底部成員抽屜 */}
      <Box sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        bgcolor: 'white',
        borderRadius: '24px 24px 0 0',
        boxShadow: '0 -20px 50px rgba(0,0,0,0.1)',
        transition: 'height 0.5s ease-out',
        height: isDrawerOpen ? '75%' : 120,
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* 抽屜手柄 */}
        <Box 
          onClick={() => setDrawerOpen(!isDrawerOpen)} 
          sx={{ 
            width: '100%', 
            py: 1.5,
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <Box sx={{ width: 48, height: 4, bgcolor: '#e2e8f0', borderRadius: 2 }} />
        </Box>

        {/* 抽屜標題區 */}
        <Box sx={{ 
          px: 3, 
          pb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>
            成員列表
          </Typography>
          
          {/* 頭像預覽 */}
          <Box sx={{ display: 'flex', ml: 'auto' }}>
            {members.slice(0, 3).map((m, idx) => (
              <Box
                key={m.id}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '2px solid white',
                  bgcolor: m.arrivalTime ? '#22c55e' : '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: m.arrivalTime ? 'white' : '#64748b',
                  ml: idx > 0 ? -1.5 : 0,
                }}
              >
                {m.nickname?.charAt(0)?.toUpperCase() || '?'}
              </Box>
            ))}
            {members.length > 3 && (
              <Box sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '2px solid white',
                bgcolor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.625rem',
                fontWeight: 700,
                color: '#94a3b8',
                ml: -1.5,
              }}>
                +{members.length - 3}
              </Box>
            )}
          </Box>
        </Box>

        {/* 成員列表（可滾動） */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 3, pb: 2 }}>
          {members.length === 0 ? (
            <Typography sx={{ color: '#94a3b8', textAlign: 'center', py: 4 }}>
              目前還沒有成員加入
            </Typography>
          ) : (
            members.map((member) => {
              const isCurrentUser = member.id === currentMemberId;
              const isOwner = event && member.userId === event.ownerId;
              const eta = membersETA.get(member.id);

              return (
                <Box
                  key={member.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: member.arrivalTime ? '#dcfce7' : '#f1f5f9',
                    bgcolor: member.arrivalTime ? '#f0fdf4' : 'white',
                    mb: 1.5,
                  }}
                >
                  {/* 頭像 */}
                  <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: member.arrivalTime ? '#22c55e' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: member.arrivalTime ? 'white' : '#64748b',
                    flexShrink: 0,
                  }}>
                    {member.nickname?.charAt(0)?.toUpperCase() || '?'}
                  </Box>

                  {/* 成員資訊 */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                      <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>
                        {member.nickname}
                      </Typography>
                      {isOwner && (
                        <Chip
                          label="主揪"
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.625rem',
                            bgcolor: '#ff9800',
                            color: 'white',
                            fontWeight: 700,
                          }}
                        />
                      )}
                      {isCurrentUser && (
                        <Chip
                          label="你"
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.625rem',
                            bgcolor: '#3b82f6',
                            color: 'white',
                            fontWeight: 700,
                          }}
                        />
                      )}
                    </Box>
                    <Typography sx={{ 
                      fontSize: '0.625rem', 
                      fontWeight: 800, 
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#94a3b8',
                    }}>
                      {member.arrivalTime 
                        ? `已到達 ${format(new Date(member.arrivalTime), 'HH:mm')}`
                        : eta 
                          ? `約 ${eta.duration} 抵達`
                          : '前往中...'
                      }
                    </Typography>
                  </Box>

                  {/* 戳人按鈕（只有已到達的用戶才能戳未到達且非自己的成員） */}
                  {hasArrived && !member.arrivalTime && !isCurrentUser && (
                    <IconButton
                      onClick={() => handlePokeMember(member.id)}
                      disabled={pokingMemberId === member.id}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: pokingMemberId === member.id ? '#f97316' : '#fef3c7',
                        color: pokingMemberId === member.id ? 'white' : '#f97316',
                        '&:hover': { bgcolor: '#fed7aa', color: '#ea580c' },
                        transition: 'all 0.2s',
                      }}
                    >
                      <PokeIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                </Box>
              );
            })
          )}
        </Box>

        {/* 「我到了」按鈕（固定在抽屜底部） */}
        <Box sx={{ 
          p: 3, 
          pt: 2,
          borderTop: '1px solid #e2e8f0',
          bgcolor: 'white',
        }}>
          {!hasArrived && !isEventEnded ? (
            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={!canMarkArrival || marking}
              onClick={handleMarkArrival}
              sx={{
                py: 2,
                borderRadius: 3,
                bgcolor: canMarkArrival ? '#2563eb' : '#94a3b8',
                fontWeight: 700,
                fontSize: '1rem',
                textTransform: 'none',
                boxShadow: canMarkArrival ? '0 8px 24px rgba(37, 99, 235, 0.4)' : 'none',
                border: '4px solid white',
                '&:hover': {
                  bgcolor: canMarkArrival ? '#1d4ed8' : '#94a3b8',
                },
                '&:active': { transform: 'scale(0.98)' },
                '&.Mui-disabled': {
                  bgcolor: '#94a3b8',
                  color: 'white',
                },
              }}
            >
              {marking ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : canMarkArrival ? (
                "I'M HERE 🏁"
              ) : distanceToMeetingPoint !== null ? (
                `距離 ${Math.round(distanceToMeetingPoint)}m`
              ) : (
                '等待位置資訊...'
              )}
            </Button>
          ) : hasArrived ? (
            <Box sx={{
              py: 2,
              px: 4,
              borderRadius: 3,
              bgcolor: '#22c55e',
              color: 'white',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '1rem',
            }}>
              ✓ 已到達
            </Box>
          ) : isEventEnded ? (
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={() => setShowResultPopup(true)}
              startIcon={<TrophyIcon />}
              sx={{
                py: 1.5,
                borderRadius: 3,
                fontWeight: 700,
                fontSize: '1rem',
                textTransform: 'none',
                borderWidth: 2,
                '&:hover': { borderWidth: 2 },
              }}
            >
              查看排行榜結果
            </Button>
          ) : null}
        </Box>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        sx={{ zIndex: 1300 }}
      />

      {/* EventResultPopup */}
      {id && (
        <EventResultPopup
          open={showResultPopup}
          onClose={() => setShowResultPopup(false)}
          eventId={Number(id)}
        />
      )}
    </Box>
  );
}

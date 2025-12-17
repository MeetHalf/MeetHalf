import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Trophy, 
  Clock, 
  MapPin, 
  Zap, 
  Crown,
  X,
  Users,
  Bell,
  BellOff,
  Check,
  Loader2,
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { eventsApi, type Event as ApiEvent, type Member, type TravelMode, type MemberETA } from '../api/events';
import { useEventProgress } from '../hooks/useEventProgress';
import { useEventChannel } from '../hooks/usePusher';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { requestNotificationPermission, showPokeNotification } from '../lib/notifications';
import { initializeBeamsClient, subscribeToInterest, unsubscribeFromInterest } from '../lib/pusherBeams';
import { LOCATION_CONFIG } from '../config/location';
import type { PokeEvent, EventEndedEvent, MemberArrivedEvent, MemberJoinedEvent, LocationUpdateEvent } from '../types/events';

import { IconButton, BottomDrawer, ExpandablePill, Avatar } from '../components/ui';
import MapContainer from '../components/MapContainer';
import EventResultPopup from '../components/EventResultPopup';

// Types
type TravelModeOption = 'driving' | 'transit' | 'walking' | 'bicycling';

const TRAVEL_MODE_OPTIONS: { value: TravelModeOption; label: string; emoji: string }[] = [
  { value: 'driving', label: '開車', emoji: '🚗' },
  { value: 'transit', label: '大眾運輸', emoji: '🚇' },
  { value: 'walking', label: '步行', emoji: '🚶' },
  { value: 'bicycling', label: '騎車', emoji: '🚴' },
];

export default function EventRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  // Core state
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Join state
  const [hasJoined, setHasJoined] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null);
  const [joinForm, setJoinForm] = useState({
    nickname: '',
    shareLocation: true,
    travelMode: 'transit' as TravelMode,
  });
  const [joining, setJoining] = useState(false);

  // Arrival state
  const [hasArrived, setHasArrived] = useState(false);
  const [marking, setMarking] = useState(false);
  
  // Poke state
  const [pokingMemberId, setPokingMemberId] = useState<number | null>(null);
  const [pokedId, setPokedId] = useState<number | null>(null);
  
  // Result popup
  const [showResultPopup, setShowResultPopup] = useState(false);
  
  // ETA
  const [membersETA, setMembersETA] = useState<Map<number, MemberETA['eta']>>(new Map());
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info',
  });

  // Notification
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'denied'
  );
  const [requestingPermission, setRequestingPermission] = useState(false);

  // Progress hook
  const progress = useEventProgress(
    event?.startTime ? new Date(event.startTime) : null,
    event?.endTime ? new Date(event.endTime) : null
  );

  const isEventEnded = event?.status === 'ended';

  // Get owner display name
  const getOwnerDisplayName = () => {
    if (!event) return '未知';
    const ownerMember = event.members?.find(m => m.userId === event.ownerId);
    return ownerMember?.nickname || 
      (event.ownerId.includes('_') ? event.ownerId.split('_')[0] : event.ownerId);
  };

  // Notification permission check
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        initializeBeamsClient().then((client) => {
          if (client) console.log('[EventRoom] ✓ Pusher Beams client initialized');
        });
      }
    }
  }, []);

  // Request notification permission
  const handleRequestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      setSnackbar({ open: true, message: '您的瀏覽器不支援通知功能', severity: 'error' });
      return;
    }

    if (Notification.permission === 'granted') {
      setSnackbar({ open: true, message: '通知權限已啟用', severity: 'success' });
      return;
    }

    if (Notification.permission === 'denied') {
      setSnackbar({ open: true, message: '通知權限已被拒絕。請在瀏覽器設定中重新啟用。', severity: 'error' });
      return;
    }

    setRequestingPermission(true);
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        const client = await initializeBeamsClient();
        setSnackbar({
          open: true,
          message: client ? '通知權限已啟用！' : '通知權限已啟用，但初始化通知服務失敗',
          severity: client ? 'success' : 'error',
        });
      } else {
        setSnackbar({ open: true, message: '通知權限被拒絕', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: '請求通知權限時發生錯誤', severity: 'error' });
    } finally {
      setRequestingPermission(false);
    }
  };

  // Subscribe to Pusher Beams
  useEffect(() => {
    if (!event || !currentMemberId) return;

    const subscribeToPushNotifications = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const eventInterest = `event-${event.id}`;
        await subscribeToInterest(eventInterest);
        console.log('[EventRoom] ✓ Subscribed to push notifications:', eventInterest);
      } catch (error) {
        console.error('[EventRoom] Failed to subscribe to push notifications:', error);
      }
    };

    subscribeToPushNotifications();

    return () => {
      const eventInterest = `event-${event.id}`;
      unsubscribeFromInterest(eventInterest).catch(console.error);
    };
  }, [event?.id, currentMemberId]);

  // Location tracking
  useLocationTracking({
    eventId: event?.id ?? 0,
    memberId: currentMemberId ?? 0,
    startTime: event?.startTime ? new Date(event.startTime) : null,
    endTime: event?.endTime ? new Date(event.endTime) : null,
    enabled: hasJoined && joinForm.shareLocation && !hasArrived && !!event && !!currentMemberId,
    onLocationUpdate: (lat, lng) => {
      // Update local state immediately
      if (currentMemberId) {
        setMembers(prev => prev.map(m => 
          m.id === currentMemberId ? { ...m, lat, lng } : m
        ));
      }
    },
    onError: (error) => {
      console.error('[EventRoom] Location tracking error:', error);
    },
  });

  // Pusher realtime updates
  const { connectionState, channel } = useEventChannel(
    hasJoined && event ? `private-event-${event.id}` : null
  );

  // Pusher event handlers
  useEffect(() => {
    if (!channel || !event) return;

    const handleLocationUpdate = (data: LocationUpdateEvent) => {
      setMembers(prev => prev.map(m => 
        m.id === data.memberId ? { ...m, lat: data.lat, lng: data.lng } : m
      ));
    };

    const handleMemberJoined = (data: MemberJoinedEvent) => {
      setMembers(prev => {
        if (prev.find(m => m.id === data.member.id)) return prev;
        return [...prev, data.member];
      });
      if (data.member.id !== currentMemberId) {
        setSnackbar({ open: true, message: `${data.member.nickname} 加入了聚會！`, severity: 'info' });
      }
    };

    const handleMemberArrived = (data: MemberArrivedEvent) => {
      setMembers(prev => prev.map(m => 
        m.id === data.memberId ? { ...m, arrivalTime: data.arrivalTime } : m
      ));
      const member = members.find(m => m.id === data.memberId);
      if (member && data.memberId !== currentMemberId) {
        setSnackbar({ open: true, message: `${member.nickname} 已到達！`, severity: 'success' });
      }
    };

    const handlePoke = (data: PokeEvent) => {
      if (data.toMemberId === currentMemberId) {
        showPokeNotification(data.fromNickname);
        setSnackbar({ open: true, message: `${data.fromNickname} 戳了你一下！`, severity: 'info' });
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      }
    };

    const handleEventEnded = (_data: EventEndedEvent) => {
      setEvent(prev => prev ? { ...prev, status: 'ended' } : null);
      setSnackbar({ open: true, message: '聚會已結束！查看排行榜！', severity: 'info' });
      setShowResultPopup(true);
    };

    channel.bind('location-update', handleLocationUpdate);
    channel.bind('member-joined', handleMemberJoined);
    channel.bind('member-arrived', handleMemberArrived);
    channel.bind('poke', handlePoke);
    channel.bind('event-ended', handleEventEnded);

    return () => {
      channel.unbind('location-update', handleLocationUpdate);
      channel.unbind('member-joined', handleMemberJoined);
      channel.unbind('member-arrived', handleMemberArrived);
      channel.unbind('poke', handlePoke);
      channel.unbind('event-ended', handleEventEnded);
    };
  }, [channel, event, currentMemberId, members]);

  // Fetch event data
  useEffect(() => {
    if (!id || authLoading) return;

    const fetchEvent = async () => {
      try {
        const response = await eventsApi.getEvent(Number(id));
        setEvent(response.event);

        // Check if user has joined
        const storageKey = `event_${id}_member`;
        const storedMember = localStorage.getItem(storageKey);
        
        let currentMember: Member | undefined;

        if (storedMember) {
          const memberData = JSON.parse(storedMember);
          currentMember = response.event.members?.find(m => m.id === memberData.memberId);
          if (currentMember) {
            setHasJoined(true);
            setCurrentMemberId(currentMember.id);
            setHasArrived(!!currentMember.arrivalTime);
            setJoinForm(prev => ({
              ...prev,
              nickname: currentMember?.nickname || '',
              shareLocation: currentMember?.shareLocation ?? true,
              travelMode: currentMember?.travelMode || 'transit',
            }));
          }
        }

        // Check if logged-in user is in members
        if (!currentMember && user?.userId) {
          currentMember = response.event.members?.find(m => m.userId === user.userId);
          if (currentMember) {
            setHasJoined(true);
            setCurrentMemberId(currentMember.id);
            setHasArrived(!!currentMember.arrivalTime);
            localStorage.setItem(storageKey, JSON.stringify({
              memberId: currentMember.id,
              userId: currentMember.userId,
              nickname: currentMember.nickname,
              shareLocation: currentMember.shareLocation,
              travelMode: currentMember.travelMode,
            }));
          }
        }

        // Sort members
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
        setError(err.response?.data?.message || '載入聚會失敗');
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, user, authLoading]);

  // Join event
  const handleJoinEvent = async () => {
    if (!event || !id || !joinForm.nickname.trim()) {
      setSnackbar({ open: true, message: '請輸入暱稱', severity: 'error' });
      return;
    }

    setJoining(true);
    try {
      const response = await eventsApi.joinEvent(Number(id), {
        nickname: joinForm.nickname.trim(),
        shareLocation: joinForm.shareLocation,
        travelMode: joinForm.travelMode,
      });
      
      const { member, guestToken } = response;
      
      localStorage.setItem(`event_${id}_member`, JSON.stringify({
        memberId: member.id,
        userId: member.userId,
        nickname: member.nickname || joinForm.nickname,
        shareLocation: member.shareLocation,
        travelMode: member.travelMode || joinForm.travelMode,
        guestToken,
      }));
      
      setHasJoined(true);
      setCurrentMemberId(member.id);
      
      const eventResponse = await eventsApi.getEvent(Number(id));
      const updatedMembers = (eventResponse.event.members || []).sort((a, b) => {
        if (a.arrivalTime && !b.arrivalTime) return -1;
        if (!a.arrivalTime && b.arrivalTime) return 1;
        return 0;
      });
      
      setMembers(updatedMembers);
      setEvent(eventResponse.event);
      setSnackbar({ open: true, message: '成功加入聚會！', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || '加入失敗，請稍後再試', 
        severity: 'error' 
      });
    } finally {
      setJoining(false);
    }
  };

  // Mark arrival
  const handleMarkArrival = async () => {
    if (!event || !id || !currentMemberId) return;
    
    setMarking(true);
    try {
      const response = await eventsApi.markArrival(Number(id));
      setHasArrived(true);
      
      const storageKey = `event_${id}_member`;
      const storedMember = localStorage.getItem(storageKey);
      if (storedMember) {
        const memberData = JSON.parse(storedMember);
        memberData.arrivalTime = response.arrivalTime;
        localStorage.setItem(storageKey, JSON.stringify(memberData));
      }
      
      const eventResponse = await eventsApi.getEvent(Number(id));
      const updatedMembers = (eventResponse.event.members || []).sort((a, b) => {
        if (a.arrivalTime && !b.arrivalTime) return -1;
        if (!a.arrivalTime && b.arrivalTime) return 1;
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
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || '標記失敗，請稍後再試', 
        severity: 'error' 
      });
    } finally {
      setMarking(false);
    }
  };

  // Poke member
  const handlePokeMember = async (targetMemberId: number) => {
    if (!event || !id || !currentMemberId || targetMemberId === currentMemberId) return;
    
    setPokingMemberId(targetMemberId);
    setPokedId(targetMemberId);
    
    try {
      const response = await eventsApi.pokeMember(Number(id), targetMemberId);
      const targetMember = members.find(m => m.id === targetMemberId);
      setSnackbar({ 
        open: true, 
        message: `⚡ 已戳 ${targetMember?.nickname || '成員'}！(${response.pokeCount}/3 次)`, 
        severity: 'success' 
      });
    } catch (err: any) {
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || '戳人失敗', 
        severity: 'error' 
      });
    } finally {
      setPokingMemberId(null);
      setTimeout(() => setPokedId(null), 1000);
    }
  };

  // Map markers
  const mapCenter = useMemo(() => {
    if (event?.meetingPointLat && event?.meetingPointLng) {
      return { lat: event.meetingPointLat, lng: event.meetingPointLng };
    }
    return undefined;
  }, [event?.meetingPointLat, event?.meetingPointLng]);

  const mapMarkers = useMemo(() => {
    const markers = [];

    if (event?.meetingPointLat && event?.meetingPointLng) {
      markers.push({
        lat: event.meetingPointLat,
        lng: event.meetingPointLng,
        title: event.meetingPointName || '集合地點',
        label: '📍',
      });
    }

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
        });
      });

    return markers;
  }, [event, members, membersETA]);

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-md">
          <p className="text-red-600 font-medium mb-4">{error || '無法載入聚會資訊'}</p>
          <button
            onClick={() => navigate('/events')}
            className="text-blue-600 font-medium hover:text-blue-700"
          >
            ← 返回聚會列表
          </button>
        </div>
      </div>
    );
  }

  // Not joined state - Join form
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-slate-50 pb-8">
        {/* Header */}
        <header className="px-6 pt-10 pb-6 bg-white border-b border-slate-100">
          <button
            onClick={() => navigate('/events')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">返回</span>
          </button>
          <h1 className="text-2xl font-black text-slate-900 mb-1">加入聚會</h1>
          <p className="text-slate-400 text-sm font-medium">填寫資料後加入聚會</p>
        </header>

        <main className="p-6 space-y-6">
          {/* Event Preview Card */}
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
            <span className={`
              text-[10px] font-black uppercase tracking-widest mb-2 inline-block
              ${event.status === 'ongoing' ? 'text-green-500' : 'text-slate-400'}
            `}>
              {event.status === 'ongoing' ? '進行中' : event.status === 'upcoming' ? '即將開始' : '已結束'}
            </span>
            
            <h2 className="text-xl font-black text-slate-900 mb-4">{event.name}</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                  <Clock size={16} />
                </div>
                <span className="text-sm font-medium">
                  {format(new Date(event.startTime), 'yyyy/MM/dd HH:mm (E)', { locale: zhTW })}
                </span>
              </div>
              
              {event.meetingPointName && (
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <span className="text-sm font-medium">{event.meetingPointName}</span>
                    {event.meetingPointAddress && (
                      <p className="text-[10px] text-slate-400">{event.meetingPointAddress}</p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                  <Users size={16} />
                </div>
                <span className="text-sm font-medium">{members.length} 位成員已加入</span>
              </div>
              
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                  <Crown size={16} />
                </div>
                <span className="text-sm font-medium">主揪：{getOwnerDisplayName()}</span>
              </div>
            </div>
          </div>

          {/* Join Form */}
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-6">填寫你的資料</h3>
            
            <div className="space-y-5">
              {/* Nickname */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">你的暱稱</label>
                <input
                  type="text"
                  placeholder="例如：小明"
                  value={joinForm.nickname}
                  onChange={(e) => setJoinForm({ ...joinForm, nickname: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              
              {/* Travel Mode */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">交通方式</label>
                <div className="grid grid-cols-2 gap-2">
                  {TRAVEL_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setJoinForm({ ...joinForm, travelMode: option.value })}
                      className={`
                        p-3 rounded-xl border-2 text-sm font-medium transition-all
                        ${joinForm.travelMode === option.value 
                          ? 'border-blue-500 bg-blue-50 text-blue-600' 
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }
                      `}
                    >
                      {option.emoji} {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Share Location */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={joinForm.shareLocation}
                    onChange={(e) => setJoinForm({ ...joinForm, shareLocation: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                  />
                  <div>
                    <span className="block text-sm font-bold text-slate-700">分享我的位置</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      我們會在聚會前後 30 分鐘內追蹤你的位置
                    </span>
                  </div>
                </label>
              </div>
              
              {/* Join Button */}
              <button
                onClick={handleJoinEvent}
                disabled={joining}
                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/30 disabled:opacity-50 active:scale-95 transition-all"
              >
                {joining ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  '加入聚會'
                )}
              </button>
            </div>
          </div>
        </main>

        {/* Snackbar */}
        {snackbar.open && (
          <div className="fixed bottom-6 left-6 right-6 z-50">
            <div className={`
              p-4 rounded-2xl shadow-lg text-white font-medium text-center
              ${snackbar.severity === 'success' ? 'bg-green-500' : snackbar.severity === 'error' ? 'bg-red-500' : 'bg-blue-500'}
            `}>
              {snackbar.message}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Joined state - Full EventRoom
  return (
    <div className="fixed inset-0 flex flex-col bg-slate-100 overflow-hidden">
      {/* Full-screen Map */}
      <div className="absolute inset-0 z-0">
        <MapContainer center={mapCenter} markers={mapMarkers} fullScreen={true} />
      </div>

      {/* Floating Header */}
      <div className="absolute top-0 left-0 w-full p-4 z-20 flex flex-col items-center safe-top">
        <div className="w-full flex justify-between items-start mb-4">
          {/* Back Button */}
          <IconButton
            icon={ArrowLeft}
            onClick={() => navigate('/events')}
            className="bg-white/80 backdrop-blur-md border-white/40"
          />
          
          {/* Expandable Event Info Pill */}
          <ExpandablePill
            eventName={event.name}
            startTime={event.startTime}
            endTime={event.endTime}
            meetingPointName={event.meetingPointName}
            meetingPointAddress={event.meetingPointAddress}
            ownerName={getOwnerDisplayName()}
            onShareClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setSnackbar({ open: true, message: '已複製連結！', severity: 'success' });
            }}
          />
          
          {/* Trophy/Result Button */}
          <IconButton
            icon={Trophy}
            onClick={() => setShowResultPopup(true)}
            className="bg-white/80 backdrop-blur-md border-white/40 text-blue-600"
          />
        </div>

        {/* Notification Permission Alert */}
        {notificationPermission !== 'granted' && (
          <div className="w-full max-w-sm">
            <div className={`
              flex items-center gap-3 p-3 rounded-2xl backdrop-blur-xl
              ${notificationPermission === 'denied' 
                ? 'bg-red-50/90 border border-red-200' 
                : 'bg-white/90 border border-white/40'
              }
            `}>
              {notificationPermission === 'denied' ? (
                <BellOff size={18} className="text-red-500" />
              ) : (
                <Bell size={18} className="text-slate-500" />
              )}
              <span className="text-xs font-medium text-slate-600 flex-1">
                {notificationPermission === 'denied' 
                  ? '通知已被拒絕' 
                  : '啟用通知以接收提醒'
                }
              </span>
              {notificationPermission !== 'denied' && (
                <button
                  onClick={handleRequestNotificationPermission}
                  disabled={requestingPermission}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-wider"
                >
                  {requestingPermission ? '...' : '啟用'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Arrival Button */}
      <div className="absolute bottom-32 left-0 w-full flex justify-center z-10 pointer-events-none">
        {!hasArrived && !isEventEnded ? (
          <button 
            onClick={handleMarkArrival}
            disabled={marking}
            className="bg-blue-600 text-white px-10 py-4 rounded-full font-black shadow-2xl shadow-blue-500/40 border-4 border-white active:scale-90 transition-all pointer-events-auto disabled:opacity-70"
          >
            {marking ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              "I'M HERE 🏁"
            )}
          </button>
        ) : hasArrived ? (
          <div className="bg-green-500 text-white px-8 py-4 rounded-full font-black shadow-lg border-4 border-white flex items-center gap-2 pointer-events-auto">
            <Crown size={20} fill="currentColor" /> ARRIVED
          </div>
        ) : null}
      </div>

      {/* Bottom Drawer - Member List */}
      <BottomDrawer
        title="The Squad"
        rightElement={
          <div className="flex -space-x-3">
            {members.slice(0, 3).map(m => (
              <div 
                key={m.id} 
                className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold"
              >
                {m.nickname?.charAt(0).toUpperCase() || '?'}
              </div>
            ))}
            {members.length > 3 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                +{members.length - 3}
              </div>
            )}
          </div>
        }
      >
        {/* Member Grid */}
        <div className="grid grid-cols-2 gap-4 pb-10">
          {members.map(m => {
            const isCurrentUser = m.id === currentMemberId;
            const isOwner = m.userId === event.ownerId;
            
            return (
              <div 
                key={m.id} 
                className={`
                  p-4 rounded-3xl border transition-all
                  ${m.arrivalTime ? 'bg-green-50 border-green-100' : 'bg-white border-slate-100'}
                  ${pokedId === m.id ? 'animate-shake' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-3">
                  <Avatar
                    name={m.nickname || '?'}
                    size="lg"
                    isArrived={!!m.arrivalTime}
                    isCurrentUser={isCurrentUser}
                  />
                  
                  {/* Poke Button */}
                  {!isCurrentUser && !m.arrivalTime && (
                    <button 
                      onClick={() => handlePokeMember(m.id)}
                      disabled={pokingMemberId === m.id}
                      className={`
                        w-10 h-10 rounded-xl flex items-center justify-center transition-all
                        ${pokedId === m.id 
                          ? 'bg-orange-500 text-white' 
                          : 'bg-slate-50 text-slate-400 hover:bg-orange-50 hover:text-orange-500'
                        }
                        disabled:opacity-50
                      `}
                    >
                      <Zap size={16} />
                    </button>
                  )}
                </div>
                
                <div className="font-bold text-slate-900 truncate">
                  {m.nickname} {isCurrentUser && '(You)'}
                  {isOwner && (
                    <span className="ml-1 text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-black">
                      主揪
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {m.arrivalTime 
                    ? `Arrived ${format(new Date(m.arrivalTime), 'HH:mm')}` 
                    : 'En Route...'
                  }
                </div>
              </div>
            );
          })}
        </div>
      </BottomDrawer>

      {/* Snackbar */}
      {snackbar.open && (
        <div 
          className="fixed bottom-28 left-4 right-4 z-50 animate-bounce-subtle"
          onClick={() => setSnackbar({ ...snackbar, open: false })}
        >
          <div className={`
            p-4 rounded-2xl shadow-lg text-white font-medium text-center cursor-pointer
            ${snackbar.severity === 'success' ? 'bg-green-500' : snackbar.severity === 'error' ? 'bg-red-500' : 'bg-blue-500'}
          `}>
            {snackbar.message}
          </div>
        </div>
      )}

      {/* Event Result Popup */}
      {id && (
        <EventResultPopup
          open={showResultPopup}
          onClose={() => setShowResultPopup(false)}
          eventId={Number(id)}
        />
      )}
    </div>
  );
}

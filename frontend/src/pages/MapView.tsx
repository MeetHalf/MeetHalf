import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  AccessTime as TimeIcon,
  ChevronRight as ChevronRightIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { format, isBefore, isAfter } from 'date-fns';
import MapContainer from '../components/MapContainer';
import { eventsApi, Event } from '../api/events';

type EventStatus = 'ongoing' | 'upcoming' | 'ended';

const getEventStatus = (event: Event): EventStatus => {
  const now = new Date();
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);

  if (isAfter(now, endTime)) return 'ended';
  if (isBefore(now, startTime)) return 'upcoming';
  return 'ongoing';
};

export default function MapView() {
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Use React Query to fetch events (reuses cache from /events page)
  const {
    data: allEvents = [],
    isLoading: loading,
    error: queryError,
  } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await eventsApi.getEvents();
      return response.events;
    },
    staleTime: 30 * 1000, // 30 seconds - reuse cache from Events page
  });

  // Filter events to only show upcoming and ongoing events with location
  const events = useMemo(() => {
    return allEvents.filter((e) => {
      if (!e.meetingPointLat || !e.meetingPointLng) return false;
      const status = getEventStatus(e);
      return status === 'upcoming' || status === 'ongoing';
    });
  }, [allEvents]);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 優先以使用者目前位置為地圖中心；拒絕權限或瀏覽器不支援時沿用聚會位置 fallback。
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ lat: coords.latitude, lng: coords.longitude });
      },
      (error) => {
        // 定位是地圖的便利功能，失敗時不阻擋活動地圖顯示。
        console.warn('[MapView] Unable to get current location:', error.message);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  const mapCenter = useMemo(() => {
    if (userLocation) return userLocation;

    if (events.length === 0) {
      return { lat: 25.033, lng: 121.5654 };
    }

    const validEvents = events.filter((e) => e.meetingPointLat && e.meetingPointLng);
    if (validEvents.length === 0) {
      return { lat: 25.033, lng: 121.5654 };
    }

    const avgLat = validEvents.reduce((sum, e) => sum + (e.meetingPointLat || 0), 0) / validEvents.length;
    const avgLng = validEvents.reduce((sum, e) => sum + (e.meetingPointLng || 0), 0) / validEvents.length;

    return { lat: avgLat, lng: avgLng };
  }, [events, userLocation]);

  const markers = useMemo(() => {
    return events.map((event) => {
      const status = getEventStatus(event);
      return {
        id: event.id,
        lat: event.meetingPointLat!,
        lng: event.meetingPointLng!,
        title: event.name,
        label: status === 'ongoing' ? '🔴' : '📍',
        // 傳遞狀態資訊給 MapContainer，用於自定義圖標
        status,
      };
    });
  }, [events]);

  const handleMarkerClick = (markerId: number) => {
    const event = events.find((e) => e.id === markerId);
    if (event) {
      setSelectedEvent(event);
    }
  };

  const { ongoingCount } = useMemo(() => {
    const ongoing = events.filter((e) => getEventStatus(e) === 'ongoing').length;
    const upcoming = events.filter((e) => getEventStatus(e) === 'upcoming').length;
    return { ongoingCount: ongoing, upcomingCount: upcoming };
  }, [events]);

  // Show error if query failed
  if (queryError) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          p: 3,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          {queryError instanceof Error ? queryError.message : 'Failed to load events'}
        </Alert>
      </Box>
    );
  }

  // Show loading only if we don't have cached data
  if (loading && allEvents.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        width: '100%',
        bgcolor: '#dce8e1',
        overflow: 'hidden',
      }}
    >
      {/* Premium map chrome: the map stays dominant and controls remain quiet. */}
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 14, md: 18 },
          left: { xs: 14, md: 24 },
          right: { xs: 14, md: 24 },
          zIndex: 20,
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box
          onClick={() => navigate(-1)}
          sx={{
            width: 42,
            height: 42,
            bgcolor: 'rgba(250, 252, 255, 0.92)',
            backdropFilter: 'blur(18px)',
            borderRadius: '50%',
            boxShadow: '0 8px 22px rgba(23, 50, 83, 0.14)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#16375f',
            cursor: 'pointer',
            '&:active': { transform: 'scale(0.9)' },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </Box>

        <Box
          sx={{
            bgcolor: 'rgba(250, 252, 255, 0.92)',
            backdropFilter: 'blur(18px)',
            borderRadius: 3,
            px: 2,
            py: 1,
            boxShadow: '0 8px 22px rgba(23, 50, 83, 0.14)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
          }}
        >
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f28a25', boxShadow: '0 0 0 4px rgba(242, 138, 37, 0.14)' }} />
          <Typography sx={{ fontWeight: 800, color: '#16375f', fontSize: '0.8rem', letterSpacing: '-0.01em' }}>
            附近的聚會
          </Typography>
          {ongoingCount > 0 && (
            <Typography sx={{ color: '#f28a25', fontSize: '0.68rem', fontWeight: 800 }}>
              {ongoingCount} 個進行中
            </Typography>
          )}
        </Box>
      </Box>

      {/* Map */}
      <Box sx={{ height: '100%', width: '100%' }}>
        {events.length > 0 ? (
          <MapContainer
            center={mapCenter}
            zoom={12}
            markers={markers}
            onMarkerClick={handleMarkerClick}
            fullscreen={true}
          />
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: '#f1f5f9',
            }}
          >
            <Typography sx={{ fontSize: '4rem', mb: 2 }}>🗺️</Typography>
            <Typography sx={{ fontWeight: 700, color: '#64748b' }}>
              No active gatherings
            </Typography>
            <Typography sx={{ color: '#94a3b8', mt: 1 }}>
              Create one to see it on the map
            </Typography>
          </Box>
        )}
      </Box>

      {/* Selected Event Card */}
      {selectedEvent && (
        <Box
          sx={{
            position: 'absolute',
            bottom: { xs: 18, md: 26 },
            left: { xs: 14, md: '50%' },
            right: { xs: 14, md: 'auto' },
            width: { xs: 'auto', md: 420 },
            transform: { xs: 'none', md: 'translateX(-50%)' },
            zIndex: 20,
          }}
        >
          <Box
            sx={{
              bgcolor: 'rgba(250, 252, 255, 0.96)',
              backdropFilter: 'blur(22px)',
              borderRadius: 4,
              px: 2.25,
              py: 2,
              boxShadow: '0 18px 50px rgba(23, 50, 83, 0.22)',
              border: '1px solid rgba(255, 255, 255, 0.85)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    color: '#f28a25',
                    fontSize: '0.68rem',
                    fontWeight: 850,
                    letterSpacing: '0.02em',
                    mb: 0.75,
                  }}
                >
                  {getEventStatus(selectedEvent) === 'ongoing' ? '正在進行' : '即將開始'}
                </Box>
                <Typography sx={{ fontWeight: 850, color: '#16375f', fontSize: '1.2rem', letterSpacing: '-0.035em', mb: 0.7 }}>
                  {selectedEvent.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, color: '#62748e' }}>
                  <TimeIcon sx={{ fontSize: 14 }} />
                  <Typography sx={{ fontSize: '0.73rem', fontWeight: 650 }}>
                    {format(new Date(selectedEvent.startTime), 'h:mm a')}
                  </Typography>
                  <Typography sx={{ fontSize: '0.73rem' }}>·</Typography>
                  <Typography sx={{ fontSize: '0.73rem', fontWeight: 650 }}>
                    {selectedEvent._count?.members || selectedEvent.members?.length || 0} 位成員
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <Box
                  onClick={() => setSelectedEvent(null)}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: '#edf3f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#71839a',
                    cursor: 'pointer',
                    '&:active': { transform: 'scale(0.9)' },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </Box>
                <Box
                  onClick={() => navigate(`/events/${selectedEvent.id}`)}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: '#f28a25',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#16375f',
                    cursor: 'pointer',
                    boxShadow: '0 8px 18px rgba(242, 138, 37, 0.32)',
                    '&:active': { transform: 'scale(0.9)' },
                  }}
                >
                  <ChevronRightIcon />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

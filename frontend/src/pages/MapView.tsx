import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import MapContainer from '../components/MapContainer';
import { eventsApi, Event } from '../api/events';

export default function MapView() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await eventsApi.getEvents();
        // 只顯示有集合地點的進行中或即將開始的活動
        const eventsWithLocation = response.events.filter(
          (e) => e.meetingPointLat && e.meetingPointLng && e.status !== 'ended'
        );
        setEvents(eventsWithLocation);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // 計算地圖中心（所有活動的中心點）
  const mapCenter = useMemo(() => {
    if (events.length === 0) {
      // 預設台北市中心
      return { lat: 25.033, lng: 121.5654 };
    }
    
    const validEvents = events.filter(e => e.meetingPointLat && e.meetingPointLng);
    if (validEvents.length === 0) {
      return { lat: 25.033, lng: 121.5654 };
    }

    const avgLat = validEvents.reduce((sum, e) => sum + (e.meetingPointLat || 0), 0) / validEvents.length;
    const avgLng = validEvents.reduce((sum, e) => sum + (e.meetingPointLng || 0), 0) / validEvents.length;
    
    return { lat: avgLat, lng: avgLng };
  }, [events]);

  // 地圖標記
  const markers = useMemo(() => {
    return events.map((event) => ({
      id: event.id,
      lat: event.meetingPointLat!,
      lng: event.meetingPointLng!,
      title: event.name,
      label: event.status === 'ongoing' ? '🔴' : '📍',
    }));
  }, [events]);

  const handleMarkerClick = (markerId: number) => {
    const event = events.find(e => e.id === markerId);
    if (event) {
      setSelectedEvent(event);
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 'calc(100vh - 140px)' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      position: 'relative', 
      height: 'calc(100vh - 140px)',
      bgcolor: '#f8fafc',
    }}>
      {/* Header */}
      <Box sx={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        p: 2,
      }}>
        <Paper sx={{ 
          px: 3, 
          py: 2, 
          borderRadius: 4,
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
              活動地圖
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {events.length} 個活動進行中
            </Typography>
          </Box>
          <Chip 
            label="Live" 
            size="small"
            sx={{ 
              bgcolor: '#dcfce7', 
              color: '#16a34a', 
              fontWeight: 700,
              '& .MuiChip-label': { px: 1.5 },
            }}
          />
        </Paper>
      </Box>

      {/* 地圖 */}
      <Box sx={{ height: '100%' }}>
        {events.length > 0 ? (
          <MapContainer
            center={mapCenter}
            zoom={12}
            markers={markers}
            onMarkerClick={handleMarkerClick}
          />
        ) : (
          <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center',
            bgcolor: '#f1f5f9',
          }}>
            <Typography sx={{ fontSize: '4rem', mb: 2 }}>🗺️</Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#64748b' }}>
              目前沒有進行中的活動
            </Typography>
            <Typography sx={{ color: '#94a3b8', mt: 1 }}>
              建立新活動後會在地圖上顯示
            </Typography>
          </Box>
        )}
      </Box>

      {/* 選中的活動卡片 */}
      {selectedEvent && (
        <Box sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 20,
        }}>
          <Paper sx={{
            p: 3,
            borderRadius: 4,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip
                    label={selectedEvent.status === 'ongoing' ? '進行中' : '即將開始'}
                    size="small"
                    sx={{
                      bgcolor: selectedEvent.status === 'ongoing' ? '#dcfce7' : '#dbeafe',
                      color: selectedEvent.status === 'ongoing' ? '#16a34a' : '#3b82f6',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                    }}
                  />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                  {selectedEvent.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: '#64748b' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TimeIcon sx={{ fontSize: 16 }} />
                    <Typography variant="body2">
                      {format(new Date(selectedEvent.startTime), 'HH:mm', { locale: zhTW })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PeopleIcon sx={{ fontSize: 16 }} />
                    <Typography variant="body2">
                      {selectedEvent._count?.members || selectedEvent.members?.length || 0} 人
                    </Typography>
                  </Box>
                </Box>
                {selectedEvent.meetingPointName && (
                  <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>
                    📍 {selectedEvent.meetingPointName}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <IconButton 
                  size="small" 
                  onClick={() => setSelectedEvent(null)}
                  sx={{ color: '#94a3b8' }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={() => navigate(`/events/${selectedEvent.id}`)}
                  sx={{
                    bgcolor: '#3b82f6',
                    color: 'white',
                    '&:hover': { bgcolor: '#2563eb' },
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}


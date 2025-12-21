import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  AccessTime as TimeIcon,
  ChevronRight as ChevronRightIcon,
  ArrowBack as ArrowBackIcon,
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

  const mapCenter = useMemo(() => {
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
  }, [events]);

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
    const event = events.find((e) => e.id === markerId);
    if (event) {
      setSelectedEvent(event);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 140px)',
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
        height: 'calc(100vh - 140px)',
        bgcolor: '#f1f5f9',
      }}
    >
      {/* Floating Header */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box
          onClick={() => navigate(-1)}
          sx={{
            width: 48,
            height: 48,
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            borderRadius: 4,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569',
            cursor: 'pointer',
            '&:active': { transform: 'scale(0.9)' },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </Box>

        <Box
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            borderRadius: 10,
            px: 3,
            py: 1.5,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography sx={{ fontWeight: 900, color: '#0f172a', fontSize: '0.875rem' }}>
            {events.length} Active
          </Typography>
          <Box
            sx={{
              bgcolor: '#dcfce7',
              color: '#15803d',
              fontSize: '0.625rem',
              fontWeight: 900,
              px: 1,
              py: 0.25,
              borderRadius: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Live
          </Box>
        </Box>

        <Box sx={{ width: 48 }} /> {/* Spacer */}
      </Box>

      {/* Map */}
      <Box sx={{ height: '100%' }}>
        {events.length > 0 ? (
          <MapContainer
            center={mapCenter}
            zoom={12}
            markers={markers}
            onMarkerClick={handleMarkerClick}
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
            bottom: 100,
            left: 16,
            right: 16,
            zIndex: 20,
          }}
        >
          <Box
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              borderRadius: '2rem',
              p: 3,
              boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    display: 'inline-block',
                    bgcolor: selectedEvent.status === 'ongoing' ? '#dcfce7' : '#dbeafe',
                    color: selectedEvent.status === 'ongoing' ? '#15803d' : '#2563eb',
                    fontSize: '0.625rem',
                    fontWeight: 900,
                    px: 1,
                    py: 0.25,
                    borderRadius: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    mb: 1,
                  }}
                >
                  {selectedEvent.status === 'ongoing' ? 'Happening Now' : 'Upcoming'}
                </Box>
                <Typography sx={{ fontWeight: 900, color: '#0f172a', fontSize: '1.125rem', mb: 1 }}>
                  {selectedEvent.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#64748b' }}>
                  <TimeIcon sx={{ fontSize: 14 }} />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {format(new Date(selectedEvent.startTime), 'h:mm a')}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem' }}>•</Typography>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {selectedEvent._count?.members || selectedEvent.members?.length || 0} friends
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <Box
                  onClick={() => setSelectedEvent(null)}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    bgcolor: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
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
                    borderRadius: 3,
                    bgcolor: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
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

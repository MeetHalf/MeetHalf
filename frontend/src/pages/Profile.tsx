import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Divider,
  TextField,
  Button,
  Snackbar,
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { Settings, ChevronRight, Bell, Lock, Info, LogOut, Calendar, MapPin, Car, Bus, PersonStanding, Bike } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { eventsApi, Event } from '../api/events';
import { usersApi } from '../api/users';
import { format } from 'date-fns';
import { loadGoogleMaps } from '../lib/googleMapsLoader';

const travelModeOptions = [
  { value: 'driving', label: '開車', icon: Car, color: '#2563eb' },
  { value: 'transit', label: '大眾運輸', icon: Bus, color: '#10b981' },
  { value: 'walking', label: '步行', icon: PersonStanding, color: '#f59e0b' },
  { value: 'bicycling', label: '騎車', icon: Bike, color: '#8b5cf6' },
];

// 模擬徽章數據
const badges = [
  { id: 1, emoji: '🏆', name: '準時王' },
  { id: 2, emoji: '⚡', name: '閃電俠' },
  { id: 3, emoji: '🎯', name: '精準定位' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [defaultLocation, setDefaultLocation] = useState({
    lat: null as number | null,
    lng: null as number | null,
    address: '',
    name: '',
  });
  const [travelMode, setTravelMode] = useState<'driving' | 'transit' | 'walking' | 'bicycling'>('driving');
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await eventsApi.getEvents();
        setEvents(response.events);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await usersApi.getProfile();
        if (response.user) {
          setDefaultLocation({
            lat: response.user.defaultLat || null,
            lng: response.user.defaultLng || null,
            address: response.user.defaultAddress || '',
            name: response.user.defaultLocationName || '',
          });
          setTravelMode(response.user.defaultTravelMode || 'driving');
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsLoaded(true))
      .catch((err) => console.error('Failed to load Google Maps:', err));
  }, []);

  useEffect(() => {
    if (
      mapsLoaded &&
      autocompleteInputRef.current &&
      !autocompleteRef.current &&
      typeof google !== 'undefined' &&
      google.maps &&
      google.maps.places
    ) {
      const autocomplete = new google.maps.places.Autocomplete(autocompleteInputRef.current, {
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'tw' },
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          setDefaultLocation({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            address: place.formatted_address || '',
            name: place.name || place.formatted_address || '',
          });
        }
      });

      autocompleteRef.current = autocomplete;
    }
  }, [mapsLoaded]);

  const stats = {
    totalEvents: events.length,
    onTimeRate: 85,
    firstPlace: 3,
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSaveDefaultLocation = async () => {
    if (!defaultLocation.lat || !defaultLocation.lng) {
      setSnackbar({ open: true, message: '請選擇一個地點', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      await usersApi.updateProfile({
        defaultLat: defaultLocation.lat,
        defaultLng: defaultLocation.lng,
        defaultAddress: defaultLocation.address,
        defaultLocationName: defaultLocation.name,
        defaultTravelMode: travelMode,
      });
      setSnackbar({ open: true, message: '設定已儲存', severity: 'success' });
    } catch (error) {
      console.error('Failed to save default location:', error);
      setSnackbar({ open: true, message: '儲存失敗', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const settingsItems = [
    {
      icon: <Bell size={20} />,
      label: '通知設定',
      onClick: () => navigate('/notifications'),
    },
    {
      icon: <Lock size={20} />,
      label: '隱私設定',
      onClick: () => {},
    },
    {
      icon: <Info size={20} />,
      label: '關於 MeetHalf',
      onClick: () => {},
    },
  ];

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: 'calc(100vh - 140px)', pb: 12 }}>
      {/* Header with Avatar */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #f1f5f9', pt: 4, pb: 4, px: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Box
            onClick={() => navigate('/settings')}
            sx={{
              width: 40,
              height: 40,
              borderRadius: 3,
              bgcolor: '#f8fafc',
              border: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              '&:active': { transform: 'scale(0.9)' },
            }}
          >
            <Settings size={20} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Avatar
            sx={{
              width: 100,
              height: 100,
              bgcolor: '#2563eb',
              fontSize: '2.5rem',
              mb: 2,
              border: '4px solid white',
              boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.3)',
            }}
          >
            {user?.name?.[0]?.toUpperCase() || '👤'}
          </Avatar>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
            {user?.name || '訪客用戶'}
          </Typography>
          <Typography sx={{ color: '#94a3b8', fontWeight: 500 }}>
            {user?.email || '未登入'}
          </Typography>
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ px: 3, mt: 3 }}>
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: '2rem',
            p: 3,
            border: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-around',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#2563eb' }}>
              {stats.totalEvents}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
              活動總數
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#22c55e' }}>
              {stats.onTimeRate}%
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
              準時率
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b' }}>
              🥇{stats.firstPlace}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
              冠軍
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Badges */}
      <Box sx={{ px: 3, mt: 4 }}>
        <Typography sx={{ fontWeight: 700, color: '#0f172a', mb: 2, px: 1 }}>
          Achievements
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {badges.map((badge) => (
            <Box
              key={badge.id}
              sx={{
                minWidth: 80,
                bgcolor: 'white',
                border: '1px solid #f1f5f9',
                borderRadius: 4,
                p: 2,
                textAlign: 'center',
                transition: 'transform 0.2s ease',
                '&:active': { transform: 'scale(0.95)' },
              }}
            >
              <Typography sx={{ fontSize: '2rem', mb: 1 }}>{badge.emoji}</Typography>
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#64748b' }}>
                {badge.name}
              </Typography>
            </Box>
          ))}
          <Box
            sx={{
              minWidth: 80,
              bgcolor: '#f8fafc',
              border: '2px dashed #e2e8f0',
              borderRadius: 4,
              p: 2,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ fontSize: '1.5rem', mb: 1, opacity: 0.5 }}>🔒</Typography>
            <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600 }}>
              More
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Recent Events */}
      <Box sx={{ px: 3, mt: 4 }}>
        <Typography sx={{ fontWeight: 700, color: '#0f172a', mb: 2, px: 1 }}>
          Recent Activity
        </Typography>
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: '1.5rem',
            border: '1px solid #f1f5f9',
            overflow: 'hidden',
          }}
        >
          {events.slice(0, 3).map((event, index) => (
            <Box
              key={event.id}
              onClick={() => navigate(`/events/${event.id}`)}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderBottom: index < 2 ? '1px solid #f1f5f9' : 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                '&:hover': { bgcolor: '#f8fafc' },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 3,
                  bgcolor: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                }}
              >
                <Calendar size={20} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                  {event.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.625rem',
                    color: '#94a3b8',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {format(new Date(event.startTime), 'MMM d')}
                </Typography>
              </Box>
              <ChevronRight size={18} style={{ color: '#cbd5e1' }} />
            </Box>
          ))}
          {events.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: '#94a3b8' }}>No activity yet</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Default Location & Travel Mode */}
      <Box sx={{ px: 3, mt: 4 }}>
        <Typography sx={{ fontWeight: 700, color: '#0f172a', mb: 2, px: 1 }}>
          預設設定
        </Typography>
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: '1.5rem',
            border: '1px solid #f1f5f9',
            p: 3,
          }}
        >
          {/* Default Location */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <MapPin size={20} style={{ color: '#2563eb' }} />
              <Typography sx={{ fontWeight: 600, color: '#475569' }}>
                預設出發點
              </Typography>
            </Box>
            <TextField
              inputRef={autocompleteInputRef}
              fullWidth
              placeholder="搜尋地點..."
              value={defaultLocation.name || defaultLocation.address}
              onChange={(e) =>
                setDefaultLocation((prev) => ({ ...prev, name: e.target.value }))
              }
              sx={{ mb: 1 }}
              size="small"
            />
            {defaultLocation.lat && defaultLocation.lng && (
              <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mb: 1 }}>
                已選擇：{defaultLocation.name || defaultLocation.address}
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Default Travel Mode */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontWeight: 600, color: '#475569', mb: 2 }}>
              預設交通方式
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#64748b', mb: 2 }}>
              系統將依此計算預估到達時間
            </Typography>
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={travelMode}
                onChange={(e) => setTravelMode(e.target.value as any)}
              >
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  {travelModeOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <FormControlLabel
                        key={option.value}
                        value={option.value}
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Icon size={16} style={{ color: option.color }} />
                            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                              {option.label}
                            </Typography>
                          </Box>
                        }
                        sx={{
                          bgcolor: travelMode === option.value ? '#f0f9ff' : 'transparent',
                          border: `2px solid ${
                            travelMode === option.value ? option.color : '#e2e8f0'
                          }`,
                          borderRadius: 2,
                          m: 0,
                          p: 1,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: '#f8fafc',
                            borderColor: option.color,
                          },
                        }}
                      />
                    );
                  })}
                </Box>
              </RadioGroup>
            </FormControl>
          </Box>

          <Button
            variant="contained"
            fullWidth
            onClick={handleSaveDefaultLocation}
            disabled={saving || !defaultLocation.lat}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {saving ? '儲存中...' : '儲存設定'}
          </Button>
        </Box>
      </Box>

      {/* Settings */}
      <Box sx={{ px: 3, mt: 4 }}>
        <Typography sx={{ fontWeight: 700, color: '#0f172a', mb: 2, px: 1 }}>
          Settings
        </Typography>
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: '1.5rem',
            border: '1px solid #f1f5f9',
            overflow: 'hidden',
          }}
        >
          {settingsItems.map((item, index) => (
            <Box
              key={item.label}
              onClick={item.onClick}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderBottom: index < settingsItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { bgcolor: '#f8fafc' },
              }}
            >
              <Box sx={{ color: '#64748b' }}>{item.icon}</Box>
              <Typography sx={{ flex: 1, fontWeight: 600, color: '#475569' }}>
                {item.label}
              </Typography>
              <ChevronRight size={18} style={{ color: '#cbd5e1' }} />
            </Box>
          ))}
        </Box>
      </Box>

      {/* Logout */}
      <Box sx={{ px: 3, mt: 4 }}>
        <Box
          onClick={handleLogout}
          sx={{
            bgcolor: 'white',
            border: '1px solid #fecaca',
            borderRadius: '1.5rem',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            color: '#ef4444',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            '&:active': { transform: 'scale(0.98)' },
          }}
        >
          <LogOut size={20} />
          登出帳號
        </Box>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

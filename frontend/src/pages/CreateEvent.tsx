import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { eventsApi, calculateTempMidpoint } from '../api/events';
import { friendsApi } from '../api/friends';
import { usersApi } from '../api/users';
import { Friend } from '../types/friend';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete,
  Chip,
  Avatar,
  Collapse,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  Close as CloseIcon,
  LocationOn as LocationIcon,
  PersonAdd as PersonAddIcon,
  Calculate as CalculateIcon,
  DirectionsCar as CarIcon,
  DirectionsTransit as TransitIcon,
  DirectionsWalk as WalkIcon,
  DirectionsBike as BikeIcon,
  AccessTime as TimeIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { Trash2 } from 'lucide-react';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { zhTW } from 'date-fns/locale';
import { loadGoogleMaps } from '../lib/googleMapsLoader';
import MapContainer from '../components/MapContainer';

// Interface for invited friend with editable departure point
interface InvitedFriend extends Friend {
  editableLat: number | null;
  editableLng: number | null;
  editableAddress: string | null;
  editableLocationName: string | null;
  editableTravelMode?: 'driving' | 'transit' | 'walking' | 'bicycling' | 'motorcycling';
  estimatedDuration?: string;
  estimatedDurationValue?: number;
  estimatedDistance?: string;
}

// Interface for dummy member (virtual member for MeetHalf calculation)
interface DummyMember {
  id: string; // Temporary ID (using Date.now() + random)
  nickname: string;
  editableLat: number | null;
  editableLng: number | null;
  editableAddress: string | null;
  editableLocationName: string | null;
  travelMode: 'driving' | 'transit' | 'walking' | 'bicycling' | 'motorcycling';
  estimatedDuration?: string;
  estimatedDurationValue?: number;
  estimatedDistance?: string;
}

interface PlaceTravelTime {
  duration: string;
  durationValue?: number;
  distance: string;
  travelMode: string;
  routeMode?: string;
}

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    startTime: new Date(), // 今天
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 今天 + 2小時
    useMeetHalf: false,
    meetingPointName: '',
    meetingPointAddress: '',
    meetingPointLat: null as number | null,
    meetingPointLng: null as number | null,
    // 主辦信息（用於自動加入活動）
    ownerNickname: user?.name || '',
    ownerTravelMode: 'transit' as 'driving' | 'transit' | 'walking' | 'bicycling' | 'motorcycling',
    ownerShareLocation: true,
    // 主辦出發點（可編輯）
    ownerLat: null as number | null,
    ownerLng: null as number | null,
    ownerAddress: null as string | null,
    ownerLocationName: null as string | null,
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [eventId, setEventId] = useState<number | null>(null);
  const [shareToken, setShareToken] = useState('');
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  // Ref for owner departure point autocomplete
  const ownerAutocompleteInputRef = useRef<HTMLInputElement>(null);
  const ownerAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  // Refs for dummy member autocomplete inputs
  const dummyAutocompleteRefs = useRef<Map<string, google.maps.places.Autocomplete | null>>(new Map());
  const dummyInputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  
  // Refs for friend autocomplete inputs
  const friendAutocompleteRefs = useRef<Map<string, google.maps.places.Autocomplete | null>>(new Map());
  const friendInputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  
  // Friends invitation state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invitedFriends, setInvitedFriends] = useState<InvitedFriend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  
  // Dummy members state (for MeetHalf calculation)
  const [dummyMembers, setDummyMembers] = useState<DummyMember[]>([]);
  
  // Midpoint calculation state
  const [calculatingMidpoint, setCalculatingMidpoint] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendedPlaces, setRecommendedPlaces] = useState<any[]>([]);
  const [midpointData, setMidpointData] = useState<any>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [placeTravelTimes, setPlaceTravelTimes] = useState<Record<string, PlaceTravelTime[]>>({});
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });

  // Load Google Maps API on mount
  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        setMapsLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to load Google Maps:', err);
        setSnackbar({ open: true, message: 'Google Maps 載入失敗', severity: 'error' });
      });
  }, []);

  // Load friends list and current user profile on mount (only for authenticated users)
  useEffect(() => {
    if (user) {
      loadFriends();
      loadUserProfile();
    }
  }, [user]);

  const loadFriends = async () => {
    try {
      setLoadingFriends(true);
      const response = await friendsApi.getFriends();
      setFriends(response.friends);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const { user: profile } = await usersApi.getProfile();
      // Update owner info with profile defaults
      if (profile) {
        setFormData(prev => ({
          ...prev,
          ownerNickname: profile.name || prev.ownerNickname,
          ownerTravelMode: (profile.defaultTravelMode as 'driving' | 'transit' | 'walking' | 'bicycling' | 'motorcycling') || prev.ownerTravelMode,
          ownerLat: profile.defaultLat || null,
          ownerLng: profile.defaultLng || null,
          ownerAddress: profile.defaultAddress || null,
          ownerLocationName: profile.defaultLocationName || null,
        }));
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  // Handle friend selection
  const handleFriendsChange = (_event: any, newValue: Friend[]) => {
    const newInvitedFriends: InvitedFriend[] = newValue.map(friend => {
      // Check if friend already in the list (to preserve editable fields)
      const existing = invitedFriends.find(f => f.userId === friend.userId);
      if (existing) {
        return existing;
      }
      // New friend - initialize with their default location and travel mode
      return {
        ...friend,
        editableLat: friend.defaultLat || null,
        editableLng: friend.defaultLng || null,
        editableAddress: friend.defaultAddress || null,
        editableLocationName: friend.defaultLocationName || null,
        editableTravelMode: (friend.defaultTravelMode as 'driving' | 'transit' | 'walking' | 'bicycling' | 'motorcycling') || 'transit',
      };
    });
    setInvitedFriends(newInvitedFriends);
  };


  // Add dummy member
  const handleAddDummyMember = () => {
    const dummyId = `dummy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const dummyNumber = dummyMembers.length + 1;
    const newDummy: DummyMember = {
      id: dummyId,
      nickname: `假人 ${dummyNumber}`,
      editableLat: null,
      editableLng: null,
      editableAddress: null,
      editableLocationName: null,
      travelMode: 'transit',
    };
    setDummyMembers(prev => [...prev, newDummy]);
  };

  // Update dummy member
  const handleUpdateDummyMember = (id: string, updates: Partial<DummyMember>) => {
    setDummyMembers(prev =>
      prev.map(dummy => (dummy.id === id ? { ...dummy, ...updates } : dummy))
    );
  };

  // Remove dummy member
  const handleRemoveDummyMember = (id: string) => {
    setDummyMembers(prev => prev.filter(d => d.id !== id));
  };

  // Calculate travel times for invited friends when meeting point is selected
  useEffect(() => {
    if (formData.meetingPointLat && formData.meetingPointLng && invitedFriends.length > 0 && mapsLoaded) {
      calculateTravelTimes();
    }
  }, [formData.meetingPointLat, formData.meetingPointLng, invitedFriends.length, mapsLoaded]);

  // Calculate travel times for dummy members when meeting point is selected
  useEffect(() => {
    if (formData.meetingPointLat && formData.meetingPointLng && dummyMembers.length > 0 && mapsLoaded) {
      calculateDummyTravelTimes();
    }
  }, [formData.meetingPointLat, formData.meetingPointLng, dummyMembers.length, mapsLoaded]);

  // Owner estimated travel time state
  const [ownerEstimatedDuration, setOwnerEstimatedDuration] = useState<string>('');
  const [ownerEstimatedDistance, setOwnerEstimatedDistance] = useState<string>('');

  // Calculate travel time for owner when meeting point is selected
  useEffect(() => {
    if (formData.meetingPointLat && formData.meetingPointLng && formData.ownerLat && formData.ownerLng && mapsLoaded) {
      calculateOwnerTravelTime();
    } else {
      setOwnerEstimatedDuration('');
      setOwnerEstimatedDistance('');
    }
  }, [formData.meetingPointLat, formData.meetingPointLng, formData.ownerLat, formData.ownerLng, formData.ownerTravelMode, mapsLoaded]);

  const calculateTravelTimes = async () => {
    if (!formData.meetingPointLat || !formData.meetingPointLng || !window.google?.maps) return;

    const updatedFriends = await Promise.all(
      invitedFriends.map(async (friend) => {
        if (!friend.editableLat || !friend.editableLng) {
          return { ...friend, estimatedDuration: '未設定出發點', estimatedDistance: '-' };
        }

        try {
          const directionsService = new google.maps.DirectionsService();
          const travelModeMap: Record<string, google.maps.TravelMode> = {
            driving: google.maps.TravelMode.DRIVING,
            transit: google.maps.TravelMode.TRANSIT,
            walking: google.maps.TravelMode.WALKING,
            bicycling: google.maps.TravelMode.BICYCLING,
            motorcycling: google.maps.TravelMode.DRIVING,
          };
          const friendTravelMode = friend.editableTravelMode || 'transit';
          const result = await directionsService.route({
            origin: { lat: friend.editableLat, lng: friend.editableLng },
            destination: { lat: formData.meetingPointLat!, lng: formData.meetingPointLng! },
            travelMode: travelModeMap[friendTravelMode] || google.maps.TravelMode.TRANSIT,
          });

          if (result.routes.length > 0 && result.routes[0].legs.length > 0) {
            const leg = result.routes[0].legs[0];
            return {
              ...friend,
              estimatedDuration: leg.duration?.text || 'N/A',
              estimatedDurationValue: leg.duration?.value || 0,
              estimatedDistance: leg.distance?.text || 'N/A',
            };
          }
        } catch (error) {
          console.error(`Failed to calculate travel time for ${friend.name}:`, error);
        }

        return { ...friend, estimatedDuration: '計算失敗', estimatedDistance: '-' };
      })
    );

    setInvitedFriends(updatedFriends);
  };

  const calculateDummyTravelTimes = async () => {
    if (!formData.meetingPointLat || !formData.meetingPointLng || !window.google?.maps) return;

    const updatedDummies = await Promise.all(
      dummyMembers.map(async (dummy) => {
        if (!dummy.editableLat || !dummy.editableLng) {
          return { ...dummy, estimatedDuration: '未設定出發點', estimatedDistance: '-' };
        }

        try {
          const directionsService = new google.maps.DirectionsService();
          const travelModeMap: Record<string, google.maps.TravelMode> = {
            driving: google.maps.TravelMode.DRIVING,
            transit: google.maps.TravelMode.TRANSIT,
            walking: google.maps.TravelMode.WALKING,
            bicycling: google.maps.TravelMode.BICYCLING,
            motorcycling: google.maps.TravelMode.DRIVING,
          };
          
          const result = await directionsService.route({
            origin: { lat: dummy.editableLat, lng: dummy.editableLng },
            destination: { lat: formData.meetingPointLat!, lng: formData.meetingPointLng! },
            travelMode: travelModeMap[dummy.travelMode] || google.maps.TravelMode.TRANSIT,
          });

          if (result.routes.length > 0 && result.routes[0].legs.length > 0) {
            const leg = result.routes[0].legs[0];
            return {
              ...dummy,
              estimatedDuration: leg.duration?.text || 'N/A',
              estimatedDurationValue: leg.duration?.value || 0,
              estimatedDistance: leg.distance?.text || 'N/A',
            };
          }
        } catch (error) {
          console.error(`Failed to calculate travel time for ${dummy.nickname}:`, error);
        }

        return { ...dummy, estimatedDuration: '計算失敗', estimatedDistance: '-' };
      })
    );

    setDummyMembers(updatedDummies);
  };

  // Estimate travel time to each recommended place, not only to the geometric midpoint.
  useEffect(() => {
    if (!mapsLoaded || recommendedPlaces.length === 0 || !window.google?.maps) return;

    const locations = [
      ...(formData.ownerLat != null && formData.ownerLng != null
        ? [{ lat: formData.ownerLat, lng: formData.ownerLng, travelMode: formData.ownerTravelMode }]
        : []),
      ...invitedFriends
        .filter((friend) => friend.editableLat != null && friend.editableLng != null)
        .map((friend) => ({ lat: friend.editableLat!, lng: friend.editableLng!, travelMode: friend.editableTravelMode || 'transit' })),
      ...dummyMembers
        .filter((dummy) => dummy.editableLat != null && dummy.editableLng != null)
        .map((dummy) => ({ lat: dummy.editableLat!, lng: dummy.editableLng!, travelMode: dummy.travelMode })),
    ];

    if (locations.length === 0) return;

    let cancelled = false;
    const travelModeMap: Record<string, google.maps.TravelMode> = {
      driving: google.maps.TravelMode.DRIVING,
      transit: google.maps.TravelMode.TRANSIT,
      walking: google.maps.TravelMode.WALKING,
      bicycling: google.maps.TravelMode.BICYCLING,
      motorcycling: google.maps.TravelMode.DRIVING,
    };

    const loadPlaceTimes = async () => {
      const entries = await Promise.all(recommendedPlaces.map(async (place, index) => {
        const key = place.place_id || String(index);
        if (place.lat == null || place.lng == null) return [key, []] as const;
        const times = await Promise.all(locations.map(async (location) => {
          const requestedMode = travelModeMap[location.travelMode] || google.maps.TravelMode.TRANSIT;
          const modesToTry = requestedMode === google.maps.TravelMode.DRIVING
            ? [requestedMode]
            : [requestedMode, google.maps.TravelMode.DRIVING, google.maps.TravelMode.WALKING];

          for (const mode of modesToTry) {
            try {
              const result = await new google.maps.DirectionsService().route({
                origin: { lat: location.lat, lng: location.lng },
                destination: { lat: place.lat, lng: place.lng },
                travelMode: mode,
              });
              const leg = result.routes[0]?.legs[0];
              if (leg) {
              return {
                duration: leg.duration?.text || '無法計算',
                durationValue: leg.duration?.value,
                distance: leg.distance?.text || '—',
                  travelMode: location.travelMode,
                  routeMode: mode,
                };
              }
            } catch {
              // Transit may have no route; try the next practical mode.
            }
          }

          return { duration: '無法計算', distance: '—', travelMode: location.travelMode };
        }));
        return [key, times] as const;
      }));

      if (!cancelled) setPlaceTravelTimes(Object.fromEntries(entries));
    };

    loadPlaceTimes();
    return () => { cancelled = true; };
  }, [mapsLoaded, recommendedPlaces, formData.ownerLat, formData.ownerLng, formData.ownerTravelMode, invitedFriends, dummyMembers]);

  // Rank places by travel-time fairness: minimize the gap between the fastest
  // and slowest member, then use total travel time as the tie breaker.
  const rankedRecommendedPlaces = useMemo(() => {
    const score = (place: any) => {
      const times = placeTravelTimes[place.place_id] || [];
      const values = times
        .map((time) => time.durationValue)
        .filter((value): value is number => typeof value === 'number');
      if (values.length < 2) return { spread: Number.POSITIVE_INFINITY, total: Number.POSITIVE_INFINITY };
      return {
        spread: Math.max(...values) - Math.min(...values),
        total: values.reduce((sum, value) => sum + value, 0),
      };
    };

    return [...recommendedPlaces].sort((a, b) => {
      const scoreA = score(a);
      const scoreB = score(b);
      return scoreA.spread - scoreB.spread || scoreA.total - scoreB.total;
    });
  }, [recommendedPlaces, placeTravelTimes]);

  const calculateOwnerTravelTime = async () => {
    if (!formData.meetingPointLat || !formData.meetingPointLng || !formData.ownerLat || !formData.ownerLng || !window.google?.maps) {
      setOwnerEstimatedDuration('');
      setOwnerEstimatedDistance('');
      return;
    }

    try {
      const directionsService = new google.maps.DirectionsService();
      const travelModeMap: Record<string, google.maps.TravelMode> = {
        driving: google.maps.TravelMode.DRIVING,
        transit: google.maps.TravelMode.TRANSIT,
        walking: google.maps.TravelMode.WALKING,
        bicycling: google.maps.TravelMode.BICYCLING,
        motorcycling: google.maps.TravelMode.DRIVING,
      };
      
      const result = await directionsService.route({
        origin: { lat: formData.ownerLat, lng: formData.ownerLng },
        destination: { lat: formData.meetingPointLat, lng: formData.meetingPointLng },
        travelMode: travelModeMap[formData.ownerTravelMode] || google.maps.TravelMode.TRANSIT,
      });

      if (result.routes.length > 0 && result.routes[0].legs.length > 0) {
        const leg = result.routes[0].legs[0];
        setOwnerEstimatedDuration(leg.duration?.text || 'N/A');
        setOwnerEstimatedDistance(leg.distance?.text || 'N/A');
      } else {
        setOwnerEstimatedDuration('計算失敗');
        setOwnerEstimatedDistance('-');
      }
    } catch (error) {
      console.error('Failed to calculate owner travel time:', error);
      setOwnerEstimatedDuration('計算失敗');
      setOwnerEstimatedDistance('-');
    }
  };

  // Calculate midpoint and recommend places
  const handleCalculateMidpoint = async () => {
    // Check if owner has departure point
    if (!formData.ownerLat || !formData.ownerLng) {
      setSnackbar({ open: true, message: '請設定你的出發點', severity: 'warning' });
      return;
    }

    if (invitedFriends.length === 0 && dummyMembers.length === 0) {
      setSnackbar({ open: true, message: '請至少邀請一位好友或新增一個假人', severity: 'warning' });
      return;
    }

    // Check if all invited friends have departure points
    const friendsWithoutLocation = invitedFriends.filter(f => !f.editableLat || !f.editableLng);
    if (friendsWithoutLocation.length > 0) {
      setSnackbar({ 
        open: true, 
        message: `${friendsWithoutLocation.map(f => f.name).join(', ')} 尚未設定出發點`, 
        severity: 'warning' 
      });
      return;
    }

    // Check if all dummy members have departure points
    const dummiesWithoutLocation = dummyMembers.filter(d => !d.editableLat || !d.editableLng);
    if (dummiesWithoutLocation.length > 0) {
      setSnackbar({ 
        open: true, 
        message: `${dummiesWithoutLocation.map(d => d.nickname).join(', ')} 尚未設定出發點`, 
        severity: 'warning' 
      });
      return;
    }

    setCalculatingMidpoint(true);
    
    // Clear previous results to force recalculation
    setMidpointData(null);
    setRecommendedPlaces([]);
    setPlaceTravelTimes({});
    setSelectedPlaceId(null);
    setShowRecommendations(false);
    
    // Clear selected meeting point if it was from a previous recommendation
    if (formData.useMeetHalf) {
      setFormData(prev => ({
        ...prev,
        meetingPointName: '',
        meetingPointAddress: '',
        meetingPointLat: null,
        meetingPointLng: null,
      }));
    }
    
    try {
      // Collect all locations (owner + invited friends + dummy members)
      const locations = [
        {
          lat: formData.ownerLat!,
          lng: formData.ownerLng!,
          travelMode: formData.ownerTravelMode,
        },
        ...invitedFriends.map(f => ({
          lat: f.editableLat!,
          lng: f.editableLng!,
          travelMode: (f.editableTravelMode || 'transit') as 'driving' | 'transit' | 'walking' | 'bicycling' | 'motorcycling',
        })),
        ...dummyMembers.map(d => ({
          lat: d.editableLat!,
          lng: d.editableLng!,
          travelMode: d.travelMode,
        })),
      ];

      // Add timestamp to force new API call (prevent caching)
      const response = await calculateTempMidpoint({
        locations,
        useMeetHalf: true,
      });

      // Set new results
      setMidpointData(response);
      setRecommendedPlaces(response.suggested_places || []);
      setShowRecommendations(true);
      setSnackbar({ open: true, message: '已計算推薦地點！', severity: 'success' });
    } catch (error) {
      console.error('Failed to calculate midpoint:', error);
      setSnackbar({ open: true, message: '中點計算失敗，請稍後再試', severity: 'error' });
    } finally {
      setCalculatingMidpoint(false);
    }
  };

  // Select a recommended place as meeting point
  const handleSelectRecommendedPlace = (place: any) => {
    if (place.lat == null || place.lng == null) {
      setSnackbar({ open: true, message: '此地點缺少座標，請選擇其他地點', severity: 'error' });
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      meetingPointName: place.name,
      meetingPointAddress: place.address,
      meetingPointLat: place.lat,
      meetingPointLng: place.lng,
    }));
    setSelectedPlaceId(place.place_id || null);
    setSnackbar({ open: true, message: `已選擇：${place.name}`, severity: 'success' });
  };

  // Open place in Google Maps
  const handleOpenInGoogleMaps = (e: React.MouseEvent, place: any) => {
    e.stopPropagation(); // Prevent card click event
    
    let mapsUrl = '';
    if (place.place_id) {
      // Use place_id if available (most accurate)
      mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
    } else if (place.lat && place.lng) {
      // Use coordinates if available
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
    } else if (place.address) {
      // Fallback to address search
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`;
    } else {
      setSnackbar({ open: true, message: '無法打開地圖：缺少地點資訊', severity: 'error' });
      return;
    }
    
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  // Initialize Google Places Autocomplete
  useEffect(() => {
    // Only initialize if:
    // 1. Not using MeetHalf
    // 2. Input ref is available
    // 3. Google Maps API is loaded
    // 4. Autocomplete not already initialized
    if (
      !formData.useMeetHalf &&
      mapsLoaded &&
      autocompleteInputRef.current &&
      !autocompleteRef.current &&
      typeof google !== 'undefined' &&
      google.maps &&
      google.maps.places
    ) {
      // Initialize Autocomplete
      const autocomplete = new google.maps.places.Autocomplete(autocompleteInputRef.current, {
        types: ['establishment', 'geocode'],
      });

      // Listen for place selection
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.geometry || !place.geometry.location) {
          setSnackbar({ open: true, message: '找不到該地點的位置資訊', severity: 'error' });
          return;
        }

        // Update form data with selected place (使用函數式更新避免閉包問題)
        setFormData((prev) => ({
          ...prev,
          meetingPointName: place.name || place.formatted_address || '',
          meetingPointAddress: place.formatted_address || '',
          meetingPointLat: place.geometry!.location!.lat(),
          meetingPointLng: place.geometry!.location!.lng(),
        }));

        setSnackbar({ open: true, message: '地點已選擇', severity: 'success' });
      });

      autocompleteRef.current = autocomplete;
    }

    // Cleanup when switching to MeetHalf mode
    if (formData.useMeetHalf && autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }
  }, [formData.useMeetHalf, mapsLoaded]);

  // Initialize Google Places Autocomplete for owner departure point
  useEffect(() => {
    if (!mapsLoaded || typeof google === 'undefined' || !google.maps || !google.maps.places) {
      return;
    }

    if (!ownerAutocompleteInputRef.current || ownerAutocompleteRef.current) {
      return;
    }

    try {
      const autocomplete = new google.maps.places.Autocomplete(ownerAutocompleteInputRef.current, {
        types: ['establishment', 'geocode'],
        fields: ['name', 'formatted_address', 'geometry', 'place_id'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.geometry || !place.geometry.location) {
          setSnackbar({ open: true, message: '找不到該地點的位置資訊', severity: 'error' });
          return;
        }

        setFormData(prev => ({
          ...prev,
          ownerLocationName: place.name || place.formatted_address || '',
          ownerAddress: place.formatted_address || '',
          ownerLat: place.geometry?.location?.lat() || null,
          ownerLng: place.geometry?.location?.lng() || null,
        }));

        setSnackbar({ open: true, message: '地點已選擇', severity: 'success' });
      });

      ownerAutocompleteRef.current = autocomplete;
    } catch (error) {
      console.error('Failed to initialize owner autocomplete:', error);
    }

    return () => {
      if (ownerAutocompleteRef.current && typeof google !== 'undefined' && google.maps) {
        google.maps.event.clearInstanceListeners(ownerAutocompleteRef.current);
        ownerAutocompleteRef.current = null;
      }
    };
  }, [mapsLoaded]);

  // Initialize Google Places Autocomplete for dummy members
  useEffect(() => {
    if (!formData.useMeetHalf || !mapsLoaded || typeof google === 'undefined' || !google.maps || !google.maps.places) {
      return;
    }

    // Initialize autocomplete for each dummy member input
    dummyMembers.forEach((dummy) => {
      const inputElement = dummyInputRefs.current.get(dummy.id);
      if (!inputElement) return;

      // Skip if already initialized
      if (dummyAutocompleteRefs.current.has(dummy.id)) return;

      try {
        const autocomplete = new google.maps.places.Autocomplete(inputElement, {
          types: ['establishment', 'geocode'],
          fields: ['name', 'formatted_address', 'geometry', 'place_id'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();

          if (!place.geometry || !place.geometry.location) {
            setSnackbar({ open: true, message: '找不到該地點的位置資訊', severity: 'error' });
            return;
          }

          handleUpdateDummyMember(dummy.id, {
            editableLocationName: place.name || place.formatted_address || '',
            editableAddress: place.formatted_address || '',
            editableLat: place.geometry.location.lat(),
            editableLng: place.geometry.location.lng(),
          });

          setSnackbar({ open: true, message: '地點已選擇', severity: 'success' });
        });

        dummyAutocompleteRefs.current.set(dummy.id, autocomplete);
      } catch (error) {
        console.error(`Failed to initialize autocomplete for dummy ${dummy.id}:`, error);
      }
    });

    // Cleanup: remove autocomplete for deleted dummy members
    const currentDummyIds = new Set(dummyMembers.map(d => d.id));
    dummyAutocompleteRefs.current.forEach((autocomplete, id) => {
      if (!currentDummyIds.has(id)) {
        if (autocomplete && typeof google !== 'undefined' && google.maps) {
          google.maps.event.clearInstanceListeners(autocomplete);
        }
        dummyAutocompleteRefs.current.delete(id);
      }
    });
  }, [formData.useMeetHalf, mapsLoaded, dummyMembers]);

  // Initialize Google Places Autocomplete for invited friends
  useEffect(() => {
    if (!mapsLoaded || typeof google === 'undefined' || !google.maps || !google.maps.places) {
      return;
    }

    // Initialize autocomplete for each friend input
    invitedFriends.forEach((friend) => {
      if (!friend.userId) return;
      
      const inputElement = friendInputRefs.current.get(friend.userId);
      if (!inputElement) return;

      // Skip if already initialized
      if (friendAutocompleteRefs.current.has(friend.userId)) return;

      try {
        const autocomplete = new google.maps.places.Autocomplete(inputElement, {
          types: ['establishment', 'geocode'],
          fields: ['name', 'formatted_address', 'geometry', 'place_id'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();

          if (!place.geometry || !place.geometry.location) {
            setSnackbar({ open: true, message: '找不到該地點的位置資訊', severity: 'error' });
            return;
          }

          setInvitedFriends(prev => prev.map(f =>
            f.userId === friend.userId
              ? {
                  ...f,
                  editableLocationName: place.name || place.formatted_address || '',
                  editableAddress: place.formatted_address || '',
                  editableLat: place.geometry!.location!.lat(),
                  editableLng: place.geometry!.location!.lng(),
                }
              : f
          ));

          setSnackbar({ open: true, message: '地點已選擇', severity: 'success' });
        });

        friendAutocompleteRefs.current.set(friend.userId, autocomplete);
      } catch (error) {
        console.error(`Failed to initialize autocomplete for friend ${friend.userId}:`, error);
      }
    });

    // Cleanup: remove autocomplete for removed friends
    const currentFriendIds = new Set(invitedFriends.map(f => f.userId).filter(Boolean));
    friendAutocompleteRefs.current.forEach((autocomplete, userId) => {
      if (!currentFriendIds.has(userId)) {
        if (autocomplete && typeof google !== 'undefined' && google.maps) {
          google.maps.event.clearInstanceListeners(autocomplete);
        }
        friendAutocompleteRefs.current.delete(userId);
      }
    });
  }, [mapsLoaded, invitedFriends]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setSnackbar({ open: true, message: '請輸入聚會名稱', severity: 'error' });
      return;
    }
    
    if (!Number.isFinite(formData.startTime?.getTime()) || !Number.isFinite(formData.endTime?.getTime()) || formData.startTime >= formData.endTime) {
      setSnackbar({ open: true, message: '結束時間必須晚於開始時間', severity: 'error' });
      return;
    }
    
    // 如果沒有使用 MeetHalf，則必須選擇地點
    if (!formData.useMeetHalf && (!formData.meetingPointName || formData.meetingPointLat == null || formData.meetingPointLng == null)) {
      setSnackbar({ open: true, message: '請選擇集合地點或使用 MeetHalf', severity: 'error' });
      return;
    }
    
    // 驗證主辦暱稱
    if (!formData.ownerNickname.trim()) {
      setSnackbar({ open: true, message: '請輸入你的暱稱', severity: 'error' });
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Prepare request data
      const requestData: any = {
        name: formData.name.trim(),
        startTime: formData.startTime.toISOString(),
        endTime: formData.endTime.toISOString(),
        useMeetHalf: formData.useMeetHalf,
        meetingPointName: formData.meetingPointName,
        meetingPointAddress: formData.meetingPointAddress,
        meetingPointLat: formData.meetingPointLat,
        meetingPointLng: formData.meetingPointLng,
        // 主辦信息（用於自動加入活動）
        ownerNickname: formData.ownerNickname.trim(),
        ownerTravelMode: formData.ownerTravelMode,
        ownerShareLocation: formData.ownerShareLocation,
        // 邀請好友 IDs
        invitedFriendIds: invitedFriends.map(f => f.userId),
      };
      
      // Only add ownerId for anonymous users
      // Authenticated users: backend will automatically use their userId from JWT
      if (!user) {
        // Anonymous user: generate guest ownerId
        const anonymousOwnerId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        requestData.ownerId = anonymousOwnerId;
      }
      // If user is authenticated, don't pass ownerId - backend will use JWT userId
      
      const response = await eventsApi.createEvent(requestData);
      
      const createdEventId = response.event.id;
      
      // 如果後端返回了 member 信息（主辦自動加入），保存到 localStorage
      if (response.member) {
        const storageKey = `event_${createdEventId}_member`;
        localStorage.setItem(storageKey, JSON.stringify({
          memberId: response.member.id,
          userId: response.member.userId,
          nickname: response.member.nickname,
          shareLocation: response.member.shareLocation,
          travelMode: response.member.travelMode,
          guestToken: response.guestToken || null,
          arrivalTime: response.member.arrivalTime,
          createdAt: response.member.createdAt,
          updatedAt: response.member.updatedAt,
        }));
      }
      
      // Get share token for the event (should be auto-generated by backend)
      try {
        const tokenResponse = await eventsApi.getShareToken(createdEventId);
        const createdShareUrl = `${window.location.origin}/invite/${tokenResponse.token}`;
        
        setEventId(createdEventId);
        setShareUrl(createdShareUrl);
        setShareToken(tokenResponse.token);
        setShareDialogOpen(true);
        setSnackbar({ open: true, message: '聚會建立成功！', severity: 'success' });
      } catch (tokenError: any) {
        console.error('Failed to get share token:', tokenError);
        // Fallback to old format if token retrieval fails
        const createdShareUrl = `${window.location.origin}/events/${createdEventId}`;
        setEventId(createdEventId);
        setShareUrl(createdShareUrl);
        setShareToken('');
        setShareDialogOpen(true);
        setSnackbar({ 
          open: true, 
          message: '聚會建立成功，但無法生成分享連結，請稍後重試', 
          severity: 'warning' 
        });
      }
    } catch (err: any) {
      console.error('建立聚會失敗:', err);
      console.error('錯誤詳情:', err.response?.data);
      
      const errorMessage = err.response?.data?.message || err.message || '建立失敗，請稍後再試';
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setSnackbar({ open: true, message: '連結已複製！', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: '複製失敗', severity: 'error' });
    }
  };

  // Copy token to clipboard
  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(shareToken);
      setSnackbar({ open: true, message: '邀請碼已複製！', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: '複製失敗', severity: 'error' });
    }
  };

  // Share using Web Share API
  const handleShare = async () => {
    console.log('[CreateEvent] handleShare called', { 
      hasShare: typeof navigator.share === 'function',
      shareUrl,
      shareToken 
    });
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: formData.name,
          text: `加入我的聚會：${formData.name}\n邀請碼：${shareToken}`,
          url: shareUrl,
        });
        // 分享成功（用戶選擇了分享方式）
        console.log('[CreateEvent] Share successful');
        setSnackbar({ open: true, message: '分享成功！', severity: 'success' });
      } catch (err: any) {
        console.log('[CreateEvent] Share error:', err.name, err.message);
        // 用戶取消分享（DOMException: "AbortError"）是正常的，不顯示錯誤
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
          // 如果分享失敗，回退到複製連結
          handleCopyLink();
        }
      }
    } else {
      console.log('[CreateEvent] Web Share API not supported, falling back to copy');
      // 不支援 Web Share API，回退到複製連結
      handleCopyLink();
    }
  };

  // Close dialog and navigate
  const handleCloseDialog = () => {
    setShareDialogOpen(false);
    if (eventId) {
      navigate(`/events/${eventId}`);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhTW}>
      <Box sx={{ bgcolor: '#F5F7FA', minHeight: 'calc(100vh - 64px)', py: { xs: 3, md: 5 } }}>
        <Container maxWidth="md">
          {/* 頁面標題 */}
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              p: { xs: 2.5, md: 3.25 },
              mb: 2.5,
              borderRadius: 3,
              bgcolor: '#142B52',
              boxShadow: '0 18px 36px rgba(20,43,82,.16)',
              '&:after': {
                content: '""',
                position: 'absolute',
                width: 180,
                height: 180,
                right: -75,
                top: -90,
                borderRadius: '50%',
                border: '1px solid rgba(242,138,37,.4)',
                boxShadow: '0 0 0 18px rgba(242,138,37,.05), 0 0 0 36px rgba(242,138,37,.04)',
              },
            }}
          >
            <Typography
              variant="h4"
              sx={{
                position: 'relative',
                zIndex: 1,
                fontWeight: 850,
                mb: 0.75,
                color: '#FFFFFF',
                letterSpacing: '-0.045em',
                fontSize: { xs: '2rem', md: '2.35rem' },
              }}
            >
              建立新聚會
            </Typography>
            <Typography variant="body2" sx={{ position: 'relative', zIndex: 1, color: '#B9C9DF', mb: 2.5 }}>
              先設定時間，再讓 MeetHalf 幫你找到大家都方便的地方。
            </Typography>

            <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 1, color: '#D9E5F5', fontSize: '0.72rem', fontWeight: 700 }}>
              <Box sx={{ width: 8, height: 8, bgcolor: '#F28A25', borderRadius: '50%', boxShadow: '0 0 0 4px rgba(242,138,37,.18)' }} />
              聚會設定
              <Box sx={{ flex: 1, height: 1, bgcolor: '#36517A', ml: 1 }} />
              <Box sx={{ color: '#FFB15C' }}>1 / 3</Box>
            </Box>
          </Box>

          {/* 表單 */}
          <Paper
            component="form"
            onSubmit={handleSubmit}
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              mt: 1,
              borderRadius: 3,
              bgcolor: '#FFFFFF',
              border: '1px solid #E4EAF2',
              boxShadow: '0 16px 40px rgba(20, 43, 82, 0.07)',
              '& .MuiTextField-root': { mb: 0 },
              '& .MuiOutlinedInput-root': {
                bgcolor: '#FBFCFE',
                '& fieldset': { borderColor: '#D9E2EE' },
                '&:hover fieldset': { borderColor: '#AFC3DD' },
                '&.Mui-focused fieldset': { borderColor: '#1769E8', borderWidth: 1.5 },
              },
              '& .MuiInputLabel-root': { color: '#71839A' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#1769E8' },
              '& .MuiFormHelperText-root': {
                mt: 0.75,
                mb: 0.25,
                lineHeight: 1.45,
                color: '#71839A',
              },
              '& .MuiFormControlLabel-root': {
                alignItems: 'flex-start',
                ml: 0,
                mr: 0,
                my: 0.75,
              },
              '& .MuiFormControlLabel-label': { pt: 0.25, lineHeight: 1.45 },
              '& .MuiDivider-root': { display: 'none' },
              '& .MuiCard-root': {
                borderRadius: 1.5,
                border: '1px solid #E4EAF2',
                bgcolor: '#F8FAFC',
                boxShadow: 'none',
              },
              '& .MuiCardContent-root': { p: 2, '&:last-child': { pb: 2 } },
              '& .MuiFormControl-root .MuiOutlinedInput-root': { bgcolor: '#FBFCFE' },
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* 聚會名稱 */}
              <TextField
                label="聚會名稱"
                placeholder="例如：週五火鍋聚會"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
                autoFocus
              />

              {/* 開始時間 */}
              <DateTimePicker
                label="開始時間"
                value={formData.startTime}
                onChange={(newValue) => {
                  if (newValue) {
                    setFormData({ ...formData, startTime: newValue });
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />

              {/* 結束時間 */}
              <DateTimePicker
                label="結束時間"
                value={formData.endTime}
                onChange={(newValue) => {
                  if (newValue) {
                    setFormData({ ...formData, endTime: newValue });
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />

              {/* 邀請好友區塊 (只對已登入用戶顯示) */}
              {user && (
                <>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonAddIcon fontSize="small" />
                      邀請好友參加
                    </Typography>
                    
                    {/* 好友選擇器 */}
                    <Autocomplete
                      multiple
                      options={friends}
                      getOptionLabel={(option) => option.name}
                      value={invitedFriends}
                      onChange={handleFriendsChange}
                      loading={loadingFriends}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="選擇要邀請的好友..."
                          variant="outlined"
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <PersonAddIcon sx={{ color: 'text.secondary', ml: 1, mr: 0.5 }} />
                                {params.InputProps.startAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            avatar={<Avatar src={option.avatar || undefined} alt={option.name} />}
                            label={option.name}
                            {...getTagProps({ index })}
                            sx={{ borderRadius: 2 }}
                          />
                        ))
                      }
                      renderOption={(props, option) => (
                        <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar src={option.avatar || undefined} alt={option.name} sx={{ width: 32, height: 32 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {option.name}
                            </Typography>
                            {option.defaultAddress && (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {option.defaultLocationName || option.defaultAddress}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                      sx={{ mb: 2 }}
                    />

                  </Box>
                </>
              )}

              {/* 使用 MeetHalf 選項 */}
              <Box
                sx={{
                  p: { xs: 2, md: 2.25 },
                  borderRadius: 2,
                  bgcolor: formData.useMeetHalf ? '#142B52' : '#FFFFFF',
                  border: '1px solid',
                  borderColor: formData.useMeetHalf ? '#142B52' : '#E0E7F0',
                  boxShadow: formData.useMeetHalf ? '0 12px 28px rgba(20,43,82,.18)' : 'none',
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.useMeetHalf}
                      sx={{
                        color: formData.useMeetHalf ? '#F28A25' : '#9BA9BA',
                        '&.Mui-checked': { color: '#F28A25' },
                      }}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData({
                          ...formData,
                          useMeetHalf: checked,
                          // 如果選擇 MeetHalf，清空地點信息
                          ...(checked
                            ? {
                                meetingPointName: '',
                                meetingPointAddress: '',
                                meetingPointLat: null,
                                meetingPointLng: null,
                              }
                            : {}),
                        });
                        // 如果取消勾選，也關閉推薦地點
                        if (!checked) {
                          setShowRecommendations(false);
                          setSelectedPlaceId(null);
                        }
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: formData.useMeetHalf ? '#FFFFFF' : '#142B52' }}>
                        使用 MeetHalf 計算中間點
                      </Typography>
                      <Typography variant="caption" sx={{ color: formData.useMeetHalf ? '#B9C9DF' : '#61738D' }}>
                        根據每個人的位置與交通方式，找出更公平的集合點
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              {/* MeetHalf 相關區塊（好友出發點/交通方式、假人、你的參與資訊）- 使用 Collapse */}
              <Collapse in={formData.useMeetHalf} timeout="auto">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* 已邀請好友的出發點和交通方式 */}
                  {user && invitedFriends.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.secondary' }}>
                        好友出發點設定
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {invitedFriends.map((friend) => (
                          <Card key={friend.userId} variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                <Avatar src={friend.avatar || undefined} alt={friend.name} sx={{ width: 40, height: 40 }} />
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                    {friend.name}
                                  </Typography>
                                  
                                  {/* 出發點編輯 */}
                                  <TextField
                                    label="出發點"
                                    size="small"
                                    placeholder="搜尋地點或地址..."
                                    value={friend.editableLocationName || friend.editableAddress || ''}
                                    onChange={(e) => {
                                      // Update the input value when user types manually
                                      const updatedFriends = invitedFriends.map(f =>
                                        f.userId === friend.userId
                                          ? {
                                              ...f,
                                              editableLocationName: e.target.value || null,
                                              editableAddress: e.target.value || null,
                                              editableLat: null,
                                              editableLng: null,
                                            }
                                          : f
                                      );
                                      setInvitedFriends(updatedFriends);
                                    }}
                                    inputRef={(el) => {
                                      if (el && friend.userId) {
                                        friendInputRefs.current.set(friend.userId, el);
                                      } else if (friend.userId) {
                                        friendInputRefs.current.delete(friend.userId);
                                      }
                                    }}
                                    InputProps={{
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <LocationIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                        </InputAdornment>
                                      ),
                                    }}
                                    fullWidth
                                    sx={{ mb: 0.5 }}
                                    // helperText={friend.editableLocationName || friend.editableAddress ? `✓ ${friend.editableLocationName || friend.editableAddress}` : '開始輸入以搜尋地點'}
                                  />

                                  {/* 交通方式 */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                    {friend.editableTravelMode === 'driving' && <CarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                                    {friend.editableTravelMode === 'transit' && <TransitIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                                    {friend.editableTravelMode === 'walking' && <WalkIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                                    {friend.editableTravelMode === 'bicycling' && <BikeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                                    {friend.editableTravelMode === 'motorcycling' && <BikeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                      <Select
                                        value={friend.editableTravelMode || 'transit'}
                                        onChange={(e) => {
                                          const updatedFriends = invitedFriends.map(f =>
                                            f.userId === friend.userId
                                              ? { ...f, editableTravelMode: e.target.value as any }
                                              : f
                                          );
                                          setInvitedFriends(updatedFriends);
                                        }}
                                        sx={{
                                          fontSize: '0.75rem',
                                          height: 24,
                                          '& .MuiSelect-select': {
                                            py: 0.5,
                                            px: 1,
                                          },
                                        }}
                                      >
                                        <MenuItem value="driving">開車</MenuItem>
                                        <MenuItem value="transit">大眾運輸</MenuItem>
                                        <MenuItem value="walking">步行</MenuItem>
                                        <MenuItem value="bicycling">騎車</MenuItem>
                                        <MenuItem value="motorcycling">機車</MenuItem>
                                      </Select>
                                    </FormControl>
                                  </Box>

                                  {/* 預計交通時間 (如果已選擇集合地點) */}
                                  {formData.meetingPointLat && formData.meetingPointLng && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <TimeIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                      <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                        預計 {friend.estimatedDuration || '計算中...'}
                                      </Typography>
                                      {friend.estimatedDistance && (
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                          ({friend.estimatedDistance || ''})
                                        </Typography>
                                      )}
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* 假人管理區塊 */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonAddIcon fontSize="small" />
                      新增假人（輔助計算）
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
                      新增虛擬成員來輔助模擬時間距離計算，假人不會保存到活動中
                    </Typography>

                    {/* 新增假人按鈕 */}
                    <Button
                      variant="outlined"
                      startIcon={<PersonAddIcon />}
                      onClick={handleAddDummyMember}
                      sx={{
                        mb: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: '#e0e0e0',
                        color: '#64748b',
                        '&:hover': {
                          borderColor: '#2196f3',
                          bgcolor: '#e3f2fd',
                        },
                      }}
                    >
                      新增假人
                    </Button>

                    {/* 假人列表 */}
                    {dummyMembers.length > 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          已新增 {dummyMembers.length} 個假人
                        </Typography>
                        {dummyMembers.map((dummy) => (
                          <Card key={dummy.id} variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                <Avatar sx={{ width: 40, height: 40, bgcolor: '#e0e0e0', color: '#64748b' }}>
                                  {dummy.nickname.charAt(0)}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {dummy.nickname}
                                    </Typography>
                                  </Box>
                                  
                                  {/* 出發點選擇 */}
                                  <TextField
                                    label="出發點"
                                    size="small"
                                    placeholder="搜尋地點或地址..."
                                    value={dummy.editableLocationName || dummy.editableAddress || ''}
                                    onChange={(e) => {
                                      // Update the input value when user types manually
                                      handleUpdateDummyMember(dummy.id, {
                                        editableLocationName: e.target.value || null,
                                        editableAddress: e.target.value || null,
                                        editableLat: null,
                                        editableLng: null,
                                      });
                                    }}
                                    inputRef={(el) => {
                                      if (el) {
                                        dummyInputRefs.current.set(dummy.id, el);
                                      } else {
                                        dummyInputRefs.current.delete(dummy.id);
                                      }
                                    }}
                                    InputProps={{
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <LocationIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                        </InputAdornment>
                                      ),
                                    }}
                                    fullWidth
                                    sx={{ mb: 0.5 }}
                                    // helperText={dummy.editableLocationName || dummy.editableAddress ? `✓ ${dummy.editableLocationName || dummy.editableAddress}` : '開始輸入以搜尋地點'}
                                  />

                                  {/* 交通方式 */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                    {dummy.travelMode === 'driving' && <CarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                                    {dummy.travelMode === 'transit' && <TransitIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                                    {dummy.travelMode === 'walking' && <WalkIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                                    {dummy.travelMode === 'bicycling' && <BikeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                                    {dummy.travelMode === 'motorcycling' && <BikeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                      <Select
                                        value={dummy.travelMode}
                                        onChange={(e) => handleUpdateDummyMember(dummy.id, { travelMode: e.target.value as any })}
                                        sx={{
                                          fontSize: '0.75rem',
                                          height: 24,
                                          '& .MuiSelect-select': {
                                            py: 0.5,
                                            px: 1,
                                          },
                                        }}
                                      >
                                        <MenuItem value="driving">開車</MenuItem>
                                        <MenuItem value="transit">大眾運輸</MenuItem>
                                        <MenuItem value="walking">步行</MenuItem>
                                        <MenuItem value="bicycling">騎車</MenuItem>
                                        <MenuItem value="motorcycling">機車</MenuItem>
                                      </Select>
                                    </FormControl>
                                  </Box>

                                  {/* 預計交通時間 (如果已選擇集合地點) */}
                                  {formData.meetingPointLat && formData.meetingPointLng && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <TimeIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                      <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                        預計 {dummy.estimatedDuration || '計算中...'}
                                      </Typography>
                                      {dummy.estimatedDistance && (
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                          ({dummy.estimatedDistance})
                                        </Typography>
                                      )}
                                    </Box>
                                  )}
                                </Box>

                                {/* 操作按鈕 */}
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRemoveDummyMember(dummy.id)}
                                    sx={{ color: 'error.main' }}
                                  >
                                    <Trash2 size={16} />
                                  </IconButton>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    )}
                  </Box>

                  {/* 你的參與資訊 */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0, color: '#142B52' }}>
                      你的參與資訊
                    </Typography>

                    {/* 主辦暱稱 */}
                    <TextField
                      label="你的暱稱"
                      placeholder="例如：小明"
                      value={formData.ownerNickname}
                      onChange={(e) => setFormData({ ...formData, ownerNickname: e.target.value })}
                      fullWidth
                      required={formData.useMeetHalf}
                      helperText="這個暱稱會顯示在活動成員列表中"
                      sx={{ mb: 0 }}
                    />

                    {/* 出發點編輯 */}
                    <TextField
                      label="你的出發點"
                      placeholder="搜尋地點或地址..."
                      value={formData.ownerLocationName || formData.ownerAddress || ''}
                      onChange={(e) => {
                        // Update the input value when user types manually
                        setFormData(prev => ({
                          ...prev,
                          ownerLocationName: e.target.value || null,
                          ownerAddress: e.target.value || null,
                          ownerLat: null,
                          ownerLng: null,
                        }));
                      }}
                      inputRef={ownerAutocompleteInputRef}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                      fullWidth
                      // helperText={formData.ownerLocationName || formData.ownerAddress ? `✓ ${formData.ownerLocationName || formData.ownerAddress}` : '開始輸入以搜尋地點'}
                      sx={{ mb: 0 }}
                    />

                    {/* 交通方式 */}
                    <FormControl fullWidth sx={{ mb: 0 }}>
                      <InputLabel>交通方式</InputLabel>
                      <Select
                        value={formData.ownerTravelMode}
                        onChange={(e) => setFormData({ ...formData, ownerTravelMode: e.target.value as any })}
                        label="交通方式"
                      >
                        <MenuItem value="driving">開車</MenuItem>
                        <MenuItem value="transit">大眾運輸</MenuItem>
                        <MenuItem value="walking">步行</MenuItem>
                        <MenuItem value="bicycling">騎車</MenuItem>
                        <MenuItem value="motorcycling">機車</MenuItem>
                      </Select>
                    </FormControl>

                    {/* 預計交通時間 (如果已選擇集合地點) */}
                    {formData.meetingPointLat && formData.meetingPointLng && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0 }}>
                        <TimeIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                          預計 {ownerEstimatedDuration || '計算中...'}
                        </Typography>
                        {ownerEstimatedDistance && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            ({ownerEstimatedDistance})
                          </Typography>
                        )}
                      </Box>
                    )}

                    {/* 是否分享位置 */}
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.ownerShareLocation}
                          onChange={(e) => setFormData({ ...formData, ownerShareLocation: e.target.checked })}
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
                  </Box>

                  {/* 計算推薦地點按鈕 */}
                  {user && (invitedFriends.length > 0 || dummyMembers.length > 0) && (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={calculatingMidpoint ? <CircularProgress size={16} color="inherit" /> : <CalculateIcon />}
                      onClick={handleCalculateMidpoint}
                      disabled={calculatingMidpoint}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        bgcolor: '#2196f3',
                        '&:hover': { bgcolor: '#1976d2' },
                      }}
                    >
                      {calculatingMidpoint ? '計算中...' : '計算推薦集合地點'}
                    </Button>
                  )}
                </Box>
              </Collapse>


              {/* 推薦地點展開列表 */}
              <Collapse in={showRecommendations} timeout="auto">
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: '#f9fafb',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: '#142B52', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <LocationIcon sx={{ fontSize: 18, color: '#F28A25' }} />
                    推薦集合地點
                  </Typography>

                  {midpointData && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        計算中點：{midpointData.address}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        基於 {midpointData.location_count || invitedFriends.length + dummyMembers.length + 1} 位成員的出發點
                      </Typography>
                    </Box>
                  )}

                  {midpointData?.midpoint && (
                    <Box sx={{ mb: 2, overflow: 'hidden', borderRadius: 2, border: '1px solid #D9E2EE', bgcolor: '#F8FAFC' }}>
                      <MapContainer
                        center={midpointData.midpoint}
                        zoom={13}
                        showInfoWindows={false}
                        onMarkerClick={(markerId) => {
                          if (markerId <= 0) return;
                          const place = rankedRecommendedPlaces[markerId - 1];
                          if (place) handleSelectRecommendedPlace(place);
                        }}
                        markers={[
                          { id: 0, lat: midpointData.midpoint.lat, lng: midpointData.midpoint.lng, title: '公平中點', label: '●' },
                          ...rankedRecommendedPlaces
                            .filter((place) => place.lat != null && place.lng != null)
                            .map((place, index) => ({
                              id: index + 1,
                              lat: place.lat,
                              lng: place.lng,
                              title: place.name,
                              label: '📍',
                            })),
                        ]}
                      />
                      <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1.5, color: '#71839A', fontSize: '0.7rem' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1769E8' }} />公平中點</Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#F28A25' }} />推薦店家</Box>
                      </Box>
                    </Box>
                  )}

                  {rankedRecommendedPlaces.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {rankedRecommendedPlaces.map((place, index) => {
                        const isSelected = selectedPlaceId === (place.place_id || null);
                        const placeTimes = placeTravelTimes[place.place_id || String(index)] || [];
                        const durationValues = placeTimes.map((time) => time.durationValue).filter((value): value is number => typeof value === 'number');
                        const timeGap = durationValues.length > 1
                          ? Math.round((Math.max(...durationValues) - Math.min(...durationValues)) / 60)
                          : null;
                        return (
                          <Card
                            key={`${place.place_id || index}-${midpointData?.midpoint?.lat}-${midpointData?.midpoint?.lng}`}
                            variant="outlined"
                            sx={{
                              borderRadius: 2,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              border: isSelected ? '2px solid' : '1px solid',
                              borderColor: isSelected ? 'primary.main' : 'divider',
                              bgcolor: isSelected ? 'primary.50' : 'white',
                              '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: isSelected ? 'primary.50' : 'primary.50',
                                transform: 'translateY(-2px)',
                                boxShadow: 1,
                              },
                            }}
                            onClick={() => handleSelectRecommendedPlace(place)}
                          >
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                              <LocationIcon sx={{ color: 'primary.main', mt: 0.5 }} />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                  {place.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                  {place.address}
                                </Typography>
                                {place.rating && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
                                      評分 {place.rating}
                                    </Typography>
                                    {place.types && place.types.length > 0 && (
                                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        • {place.types[0].replace(/_/g, ' ')}
                                      </Typography>
                                    )}
                                  </Box>
                                )}
                                {placeTimes.length > 0 && (
                                  <Box sx={{ mt: 1, p: 1, borderRadius: 1.5, bgcolor: '#F1F5FA', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: '#61738D', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                                      <span>到這家店的預估時間</span>
                                      {timeGap != null && <span style={{ color: timeGap <= 10 ? '#1769E8' : '#C9650D' }}>成員差距 {timeGap} 分鐘</span>}
                                    </Typography>
                                    {placeTimes.map((time, timeIndex) => (
                                      <Box key={timeIndex} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <TimeIcon sx={{ fontSize: 14, color: '#1769E8' }} />
                                        <Typography variant="caption" sx={{ color: '#142B52' }}>
                                          成員 {timeIndex + 1} · {time.duration} · {time.distance}
                                          {time.routeMode && time.routeMode.toLowerCase() !== time.travelMode ? ` · 改用${time.routeMode.toLowerCase() === 'driving' ? '開車' : '步行'}估算` : ''}
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                                  onClick={(e) => handleOpenInGoogleMaps(e, place)}
                                  sx={{
                                    mt: 0.5,
                                    textTransform: 'none',
                                    fontSize: '0.75rem',
                                    minWidth: 'auto',
                                    py: 0.5,
                                    px: 1.5,
                                    borderColor: 'primary.main',
                                    color: 'primary.main',
                                    '&:hover': {
                                      borderColor: 'primary.dark',
                                      bgcolor: 'primary.50',
                                    },
                                  }}
                                >
                                  在 Google Maps 中查看
                                </Button>
                              </Box>
                            </Box>
                            {isSelected && (
                              <Box sx={{ borderColor: 'primary.main' }}>
                                {/* <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                  ✓ 已選擇此地點
                                </Typography> */}
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                      {midpointData ? '中點附近目前找不到餐廳或咖啡店，仍可直接使用中點地址' : '附近沒有找到推薦地點'}
                    </Typography>
                  )}

                  {rankedRecommendedPlaces.length > 0 && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: '#71839A' }}>
                      已依成員到店時間差距排序，差距最小的店家會優先顯示。
                    </Typography>
                  )}
                </Paper>
              </Collapse>

              {!formData.useMeetHalf && !user && (
                <TextField label="你的暱稱" value={formData.ownerNickname}
                  onChange={(e) => setFormData({ ...formData, ownerNickname: e.target.value })}
                  fullWidth required helperText="這個暱稱會顯示在活動成員列表中" />
              )}

              {/* 集合地點欄位（始終顯示，使用 MeetHalf 時會帶入選擇的推薦地點） */}
              <TextField
                label="集合地點"
                placeholder={formData.useMeetHalf ? "從推薦地點中選擇，或手動輸入..." : "搜尋地點或地址..."}
                value={formData.meetingPointName}
                onChange={(e) => {
                  setFormData({ ...formData, meetingPointName: e.target.value, meetingPointAddress: '', meetingPointLat: null, meetingPointLng: null });
                  // Clear selected place if user manually types
                  if (e.target.value !== formData.meetingPointName) {
                    setSelectedPlaceId(null);
                  }
                }}
                inputRef={autocompleteInputRef}
                fullWidth
                required={!formData.useMeetHalf}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                helperText={
                  formData.meetingPointLat && formData.meetingPointLng
                    ? `✓ 已選擇：${formData.meetingPointAddress || formData.meetingPointName}${formData.useMeetHalf && selectedPlaceId ? '（來自推薦地點）' : ''}`
                    : formData.useMeetHalf
                    ? '從上方推薦地點中選擇，或手動輸入地點'
                    : '開始輸入以搜尋地點（使用 Google Places）'
                }
              />


              {/* 提交按鈕 */}
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={submitting}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  mt: 2,
                }}
              >
                {submitting ? <CircularProgress size={24} /> : '建立聚會'}
              </Button>

              {/* 取消按鈕 */}
              <Button
                variant="text"
                size="large"
                fullWidth
                onClick={() => navigate('/events')}
                sx={{
                  textTransform: 'none',
                  color: 'text.secondary',
                }}
              >
                取消
              </Button>
            </Box>
          </Paper>

          {/* 分享連結 Dialog */}
          <Dialog
            open={shareDialogOpen}
            onClose={handleCloseDialog}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                🎉 聚會建立成功！
              </Typography>
              <IconButton onClick={handleCloseDialog} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                選擇以下任一方式分享給朋友，讓他們加入聚會：
              </Typography>

              {/* 邀請碼顯示 */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: '#e3f2fd',
                  borderRadius: 2,
                  border: '1px solid #90caf9',
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                  邀請碼
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: 'monospace',
                      color: '#1976d2',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      flex: 1,
                      minWidth: 0,
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {shareToken}
                  </Typography>
                  <IconButton
                    onClick={handleCopyToken}
                    size="small"
                    sx={{
                      color: '#1976d2',
                      flexShrink: 0,
                      '&:hover': {
                        bgcolor: '#1976d2',
                        color: '#fff',
                      },
                    }}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>

              {/* 分隔線 + "or" */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2 }}>
                <Divider sx={{ flex: 1 }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', px: 1 }}>
                  或
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>

              {/* 連結顯示 */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: '#f5f5f5',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    color: '#1976d2',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                  }}
                >
                  {shareUrl}
                </Typography>
                <IconButton
                  onClick={typeof navigator.share === 'function' ? handleShare : handleCopyLink}
                  size="small"
                  sx={{
                    color: '#1976d2',
                    flexShrink: 0,
                    '&:hover': {
                      bgcolor: '#1976d2',
                      color: '#fff',
                    },
                  }}
                >
                  {typeof navigator.share === 'function' ? (
                    <ShareIcon fontSize="small" />
                  ) : (
                    <CopyIcon fontSize="small" />
                  )}
                </IconButton>
              </Paper>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button
                variant="text"
                fullWidth
                onClick={handleCloseDialog}
                sx={{ textTransform: 'none' }}
              >
                前往聚會頁面
              </Button>
            </DialogActions>
          </Dialog>

          {/* Snackbar */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              onClose={() => setSnackbar({ ...snackbar, open: false })}
              severity={snackbar.severity}
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </LocalizationProvider>
  );
}

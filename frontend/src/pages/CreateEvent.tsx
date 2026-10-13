import { useState, useRef, useEffect } from 'react';
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
    if (!midpointData?.midpoint) return;
    
    setFormData(prev => ({
      ...prev,
      meetingPointName: place.name,
      meetingPointAddress: place.address,
      meetingPointLat: midpointData.midpoint.lat,
      meetingPointLng: midpointData.midpoint.lng,
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
        componentRestrictions: { country: 'tw' }, // 限制台灣
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
        componentRestrictions: { country: 'tw' },
        fields: ['name', 'formatted_address', 'geometry', 'place_id'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place || place.place_id === undefined) {
          setSnackbar({ open: true, message: '請從建議列表中選擇地點', severity: 'info' });
          return;
        }

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
          componentRestrictions: { country: 'tw' },
          fields: ['name', 'formatted_address', 'geometry', 'place_id'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();

          if (!place || place.place_id === undefined) {
            setSnackbar({ open: true, message: '請從建議列表中選擇地點', severity: 'info' });
            return;
          }

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
          componentRestrictions: { country: 'tw' },
          fields: ['name', 'formatted_address', 'geometry', 'place_id'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();

          if (!place || place.place_id === undefined) {
            setSnackbar({ open: true, message: '請從建議列表中選擇地點', severity: 'info' });
            return;
          }

          if (!place.geometry || !place.geometry.location) {
            setSnackbar({ open: true, message: '找不到該地點的位置資訊', severity: 'error' });
            return;
          }

          const updatedFriends = invitedFriends.map(f =>
            f.userId === friend.userId
              ? {
                  ...f,
                  editableLocationName: place.name || place.formatted_address || '',
                  editableAddress: place.formatted_address || '',
                  editableLat: place.geometry?.location?.lat() || null,
                  editableLng: place.geometry?.location?.lng() || null,
                }
              : f
          );
          setInvitedFriends(updatedFriends);

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
    
    if (formData.startTime >= formData.endTime) {
      setSnackbar({ open: true, message: '結束時間必須晚於開始時間', severity: 'error' });
      return;
    }
    
    // 如果沒有使用 MeetHalf，則必須選擇地點
    if (!formData.useMeetHalf && !formData.meetingPointName) {
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
        meetingPointName: formData.useMeetHalf ? null : formData.meetingPointName,
        meetingPointAddress: formData.useMeetHalf ? null : formData.meetingPointAddress,
        meetingPointLat: formData.useMeetHalf ? null : formData.meetingPointLat,
        meetingPointLng: formData.useMeetHalf ? null : formData.meetingPointLng,
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
        setSnackbar({ open: true, message: '聚會創建成功！', severity: 'success' });
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
          message: '聚會創建成功，但無法生成分享連結，請稍後重試', 
          severity: 'warning' 
        });
      }
    } catch (err: any) {
      console.error('創建聚會失敗:', err);
      console.error('錯誤詳情:', err.response?.data);
      
      const errorMessage = err.response?.data?.message || err.message || '創建失敗，請稍後再試';
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
      <Box sx={{ bgcolor: '#fafafa', minHeight: 'calc(100vh - 64px)', py: 4 }}>
        <Container maxWidth="sm">
          {/* 頁面標題 */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              mb: 1,
              color: '#1a1a1a',
              letterSpacing: '-0.02em',
            }}
          >
            創建聚會
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
            建立一個新的聚會，邀請朋友一起參加
          </Typography>

          {/* 表單 */}
          <Paper
            component="form"
            onSubmit={handleSubmit}
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3,
              bgcolor: 'white',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                  <Divider sx={{ my: 2 }} />
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
                  <Divider sx={{ my: 2 }} />
                </>
              )}

              {/* 使用 MeetHalf 選項 */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: formData.useMeetHalf ? '#e3f2fd' : '#f5f5f5',
                  border: '1px solid',
                  borderColor: formData.useMeetHalf ? '#2196f3' : '#e0e0e0',
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.useMeetHalf}
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
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        使用 MeetHalf 計算中間點
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        讓系統根據所有人的位置自動計算最佳集合地點
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
                                        <MenuItem value="driving">🚗 開車</MenuItem>
                                        <MenuItem value="transit">🚇 大眾運輸</MenuItem>
                                        <MenuItem value="walking">🚶 步行</MenuItem>
                                        <MenuItem value="bicycling">🚴 騎車</MenuItem>
                                        <MenuItem value="motorcycling">🛵 機車</MenuItem>
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
                                        <MenuItem value="driving">🚗 開車</MenuItem>
                                        <MenuItem value="transit">🚇 大眾運輸</MenuItem>
                                        <MenuItem value="walking">🚶 步行</MenuItem>
                                        <MenuItem value="bicycling">🚴 騎車</MenuItem>
                                        <MenuItem value="motorcycling">🛵 機車</MenuItem>
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
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>
                      你的參與資訊
                    </Typography>

                    {/* 主辦暱稱 */}
                    <TextField
                      label="你的暱稱"
                      placeholder="例如：小明"
                      value={formData.ownerNickname}
                      onChange={(e) => setFormData({ ...formData, ownerNickname: e.target.value })}
                      fullWidth
                      required
                      helperText="這個暱稱會顯示在活動成員列表中"
                      sx={{ mb: 2 }}
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
                      sx={{ mb: 2 }}
                    />

                    {/* 交通方式 */}
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>交通方式</InputLabel>
                      <Select
                        value={formData.ownerTravelMode}
                        onChange={(e) => setFormData({ ...formData, ownerTravelMode: e.target.value as any })}
                        label="交通方式"
                      >
                        <MenuItem value="driving">🚗 開車</MenuItem>
                        <MenuItem value="transit">🚇 大眾運輸</MenuItem>
                        <MenuItem value="walking">🚶 步行</MenuItem>
                        <MenuItem value="bicycling">🚴 騎車</MenuItem>
                        <MenuItem value="motorcycling">🛵 機車</MenuItem>
                      </Select>
                    </FormControl>

                    {/* 預計交通時間 (如果已選擇集合地點) */}
                    {formData.meetingPointLat && formData.meetingPointLng && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
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
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'primary.main' }}>
                    🎯 推薦集合地點
                  </Typography>

                  {midpointData && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        計算中點：{midpointData.address}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        基於 {midpointData.member_count || invitedFriends.length + dummyMembers.length + 1} 位成員的出發點
                      </Typography>
                    </Box>
                  )}

                  {recommendedPlaces.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {recommendedPlaces.map((place, index) => {
                        const isSelected = selectedPlaceId === (place.place_id || null);
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
                                      ⭐ {place.rating}
                                    </Typography>
                                    {place.types && place.types.length > 0 && (
                                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        • {place.types[0].replace(/_/g, ' ')}
                                      </Typography>
                                    )}
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
                      附近沒有找到推薦地點
                    </Typography>
                  )}

                  {/* 顯示成員旅程時間 */}
                  {midpointData?.member_travel_times && midpointData.member_travel_times.length > 0 && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}>
                        預估旅程時間：
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {midpointData.member_travel_times.map((travel: any, idx: number) => (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {travel.travelMode === 'driving' && <CarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                            {travel.travelMode === 'transit' && <TransitIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                            {travel.travelMode === 'walking' && <WalkIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                            {travel.travelMode === 'bicycling' && <BikeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                            {travel.travelMode === 'motorcycling' && <BikeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              成員 {idx + 1}: {travel.duration} ({travel.distance})
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Collapse>

              {/* 集合地點欄位（始終顯示，使用 MeetHalf 時會帶入選擇的推薦地點） */}
              <TextField
                label="集合地點"
                placeholder={formData.useMeetHalf ? "從推薦地點中選擇，或手動輸入..." : "搜尋地點或地址..."}
                value={formData.meetingPointName}
                onChange={(e) => {
                  setFormData({ ...formData, meetingPointName: e.target.value });
                  // Clear selected place if user manually types
                  if (e.target.value !== formData.meetingPointName) {
                    setSelectedPlaceId(null);
                  }
                }}
                inputRef={autocompleteInputRef}
                fullWidth
                required={!formData.useMeetHalf}
                disabled={formData.useMeetHalf && !!selectedPlaceId}
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
                {submitting ? <CircularProgress size={24} /> : '創建聚會'}
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
                🎉 聚會創建成功！
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


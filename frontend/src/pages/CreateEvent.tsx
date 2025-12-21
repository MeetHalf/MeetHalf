import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { eventsApi, calculateTempMidpoint } from '../api/events';
import { friendsApi } from '../api/friends';
import { usersApi } from '../api/users';
import { Friend, User } from '../types/friend';
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
  Delete as DeleteIcon,
} from '@mui/icons-material';
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
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 明天 + 2小時
    useMeetHalf: false,
    meetingPointName: '',
    meetingPointAddress: '',
    meetingPointLat: null as number | null,
    meetingPointLng: null as number | null,
    // 主辦信息（用於自動加入活動）
    ownerNickname: user?.name || '',
    ownerTravelMode: 'transit' as 'driving' | 'transit' | 'walking' | 'bicycling',
    ownerShareLocation: true,
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [eventId, setEventId] = useState<number | null>(null);
  const [shareToken, setShareToken] = useState('');
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  // Friends invitation state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invitedFriends, setInvitedFriends] = useState<InvitedFriend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  
  // Midpoint calculation state
  const [calculatingMidpoint, setCalculatingMidpoint] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendedPlaces, setRecommendedPlaces] = useState<any[]>([]);
  const [midpointData, setMidpointData] = useState<any>(null);
  
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
      setCurrentUserProfile(profile);
      // Update owner nickname if not already set
      if (profile?.name) {
        setFormData(prev => ({ ...prev, ownerNickname: profile.name }));
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
      // New friend - initialize with their default location
      return {
        ...friend,
        editableLat: friend.defaultLat || null,
        editableLng: friend.defaultLng || null,
        editableAddress: friend.defaultAddress || null,
        editableLocationName: friend.defaultLocationName || null,
      };
    });
    setInvitedFriends(newInvitedFriends);
  };

  // Remove invited friend
  const handleRemoveFriend = (userId: string) => {
    setInvitedFriends(prev => prev.filter(f => f.userId !== userId));
  };

  // Calculate travel times for invited friends when meeting point is selected
  useEffect(() => {
    if (formData.meetingPointLat && formData.meetingPointLng && invitedFriends.length > 0 && mapsLoaded) {
      calculateTravelTimes();
    }
  }, [formData.meetingPointLat, formData.meetingPointLng, invitedFriends.length, mapsLoaded]);

  const calculateTravelTimes = async () => {
    if (!formData.meetingPointLat || !formData.meetingPointLng || !window.google?.maps) return;

    const updatedFriends = await Promise.all(
      invitedFriends.map(async (friend) => {
        if (!friend.editableLat || !friend.editableLng) {
          return { ...friend, estimatedDuration: '未設定出發點', estimatedDistance: '-' };
        }

        try {
          const directionsService = new google.maps.DirectionsService();
          const result = await directionsService.route({
            origin: { lat: friend.editableLat, lng: friend.editableLng },
            destination: { lat: formData.meetingPointLat!, lng: formData.meetingPointLng! },
            travelMode: google.maps.TravelMode.TRANSIT, // Default to transit for estimation
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

  // Calculate midpoint and recommend places
  const handleCalculateMidpoint = async () => {
    if (!currentUserProfile?.defaultLat || !currentUserProfile?.defaultLng) {
      setSnackbar({ open: true, message: '請先在個人資料中設定你的預設出發點', severity: 'warning' });
      return;
    }

    if (invitedFriends.length === 0) {
      setSnackbar({ open: true, message: '請至少邀請一位好友', severity: 'warning' });
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

    setCalculatingMidpoint(true);
    try {
      // Collect all locations (owner + invited friends)
      const locations = [
        {
          lat: currentUserProfile.defaultLat,
          lng: currentUserProfile.defaultLng,
          travelMode: formData.ownerTravelMode,
        },
        ...invitedFriends.map(f => ({
          lat: f.editableLat!,
          lng: f.editableLng!,
          travelMode: 'transit' as const, // Default for invited friends
        })),
      ];

      const response = await calculateTempMidpoint({
        locations,
        useMeetHalf: true,
      });

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
    setSnackbar({ open: true, message: `已選擇：${place.name}`, severity: 'success' });
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
    if (navigator.share) {
      try {
        await navigator.share({
          title: formData.name,
          text: `加入我的聚會：${formData.name}\n邀請碼：${shareToken}`,
          url: shareUrl,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
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

                    {/* 已邀請好友列表 */}
                    {invitedFriends.length > 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          已邀請 {invitedFriends.length} 位好友
                        </Typography>
                        {invitedFriends.map((friend) => (
                          <Card key={friend.userId} variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                <Avatar src={friend.avatar || undefined} alt={friend.name} sx={{ width: 40, height: 40 }} />
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                    {friend.name}
                                  </Typography>
                                  
                                  {/* 出發點資訊 */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                    <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                      {friend.editableLocationName || friend.editableAddress || '未設定出發點'}
                                    </Typography>
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
                                          ({friend.estimatedDistance})
                                        </Typography>
                                      )}
                                    </Box>
                                  )}
                                </Box>

                                {/* 操作按鈕 */}
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRemoveFriend(friend.userId)}
                                    sx={{ color: 'error.main' }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    )}
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

                {/* 計算推薦地點按鈕 (當勾選 MeetHalf 且有邀請好友時顯示) */}
                {formData.useMeetHalf && user && invitedFriends.length > 0 && (
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={calculatingMidpoint ? <CircularProgress size={16} color="inherit" /> : <CalculateIcon />}
                    onClick={handleCalculateMidpoint}
                    disabled={calculatingMidpoint}
                    sx={{
                      mt: 2,
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
                        基於 {midpointData.member_count || invitedFriends.length + 1} 位成員的出發點
                      </Typography>
                    </Box>
                  )}

                  {recommendedPlaces.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {recommendedPlaces.map((place, index) => (
                        <Card
                          key={place.place_id || index}
                          variant="outlined"
                          sx={{
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: 'primary.main',
                              bgcolor: 'primary.50',
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
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
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

              {/* 地點選擇（如果沒有選擇 MeetHalf） */}
              {!formData.useMeetHalf && (
                <TextField
                  label="集合地點"
                  placeholder="搜尋地點或地址..."
                  value={formData.meetingPointName}
                  onChange={(e) =>
                    setFormData({ ...formData, meetingPointName: e.target.value })
                  }
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
                      ? `✓ 已選擇：${formData.meetingPointAddress || formData.meetingPointName}`
                      : '開始輸入以搜尋地點（使用 Google Places）'
                  }
                />
              )}

              {/* 分隔線 */}
              <Box sx={{ 
                my: 2, 
                borderTop: '1px solid', 
                borderColor: 'divider',
                pt: 2 
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>
                  你的參與信息
                </Typography>
              </Box>

              {/* 主辦暱稱 */}
              <TextField
                label="你的暱稱"
                placeholder="例如：小明"
                value={formData.ownerNickname}
                onChange={(e) => setFormData({ ...formData, ownerNickname: e.target.value })}
                fullWidth
                required
                helperText="這個暱稱會顯示在活動成員列表中"
              />

              {/* 交通方式 */}
              <FormControl fullWidth>
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
                </Select>
              </FormControl>

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
                分享以下連結給朋友，讓他們加入聚會：
              </Typography>

              {/* 邀請碼顯示 */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: '#e3f2fd',
                  borderRadius: 2,
                  mb: 2,
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
                    }}
                  >
                    {shareToken}
                  </Typography>
                  <IconButton
                    onClick={handleCopyToken}
                    size="small"
                    sx={{
                      color: '#1976d2',
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
                  mb: 2,
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
                  }}
                >
                  {shareUrl}
                </Typography>
                <IconButton onClick={handleCopyLink} size="small">
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Paper>

              {/* 分享按鈕 */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<CopyIcon />}
                  onClick={handleCopyLink}
                  sx={{ textTransform: 'none' }}
                >
                  複製連結
                </Button>
                {typeof navigator.share === 'function' && (
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<ShareIcon />}
                    onClick={handleShare}
                    sx={{ textTransform: 'none' }}
                  >
                    分享
                  </Button>
                )}
              </Box>
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


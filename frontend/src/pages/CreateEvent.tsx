import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { eventsApi } from '../api/events';
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
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  Close as CloseIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { zhTW } from 'date-fns/locale';
import { loadGoogleMaps } from '../lib/googleMapsLoader';

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
                        setFormData({
                          ...formData,
                          useMeetHalf: e.target.checked,
                          // 如果選擇 MeetHalf，清空地點信息
                          ...(e.target.checked
                            ? {
                                meetingPointName: '',
                                meetingPointAddress: '',
                                meetingPointLat: null,
                                meetingPointLng: null,
                              }
                            : {}),
                        });
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


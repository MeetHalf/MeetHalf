import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { zhTW } from 'date-fns/locale';

export default function CreateEvent() {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 明天 + 2小時
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [eventId, setEventId] = useState<number | null>(null);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info',
  });

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
    
    setSubmitting(true);
    
    try {
      // TODO: 改用真實 API
      // const response = await eventsApi.createEvent(formData);
      
      // 模擬 API 延遲
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock response
      const mockEventId = Math.floor(Math.random() * 10000);
      const mockShareUrl = `${window.location.origin}/events/${mockEventId}`;
      
      setEventId(mockEventId);
      setShareUrl(mockShareUrl);
      setShareDialogOpen(true);
      setSnackbar({ open: true, message: '聚會創建成功！', severity: 'success' });
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: err instanceof Error ? err.message : '創建失敗，請稍後再試', 
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

  // Share using Web Share API
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: formData.name,
          text: `加入我的聚會：${formData.name}`,
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
                {navigator.share && (
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


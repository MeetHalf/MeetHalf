import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  Slide,
  Fade,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
  TouchApp as PokeIcon,
} from '@mui/icons-material';
import { eventsApi } from '../api/events';
import type { EventResult, RankingItem, MemberStatus } from '../types/events';

interface EventResultPopupProps {
  open: boolean;
  onClose: () => void;
  eventId: number;
}

const getStatusColor = (status: MemberStatus): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'early':
    case 'ontime':
      return 'success';
    case 'late':
      return 'warning';
    case 'absent':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: MemberStatus): string => {
  switch (status) {
    case 'early':
      return '提早到達';
    case 'ontime':
      return '準時';
    case 'late':
      return '遲到';
    case 'absent':
      return '缺席';
    default:
      return '未知';
  }
};

const formatTime = (timeString?: string): string => {
  if (!timeString) return '--';
  const date = new Date(timeString);
  return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (timeString?: string): string => {
  if (!timeString) return '--';
  const date = new Date(timeString);
  return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
};

export default function EventResultPopup({ open, onClose, eventId }: EventResultPopupProps) {
  const [result, setResult] = useState<EventResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (open && eventId) {
      loadResult();
    }
  }, [open, eventId]);

  const loadResult = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await eventsApi.getEventResult(eventId);
      setResult(response.result);
    } catch (err: any) {
      console.error('Failed to load event result:', err);
      setError(err.response?.data?.message || '載入排行榜失敗');
    } finally {
      setLoading(false);
    }
  };

  if (!result && !loading && !error) {
    return null;
  }

  const topThree = result?.rankings.filter((r) => r.rank <= 3 && r.status !== 'absent') || [];
  const onTime = result?.rankings.filter((r) => r.status === 'ontime') || [];
  const late = result?.rankings.filter((r) => r.status === 'late') || [];
  const absent = result?.rankings.filter((r) => r.status === 'absent') || [];

  const getMedalEmoji = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  const renderRankingItem = (item: RankingItem, index: number) => {
    const medal = getMedalEmoji(item.rank);
    const statusColor = getStatusColor(item.status);
    const statusLabel = getStatusLabel(item.status);

    return (
      <Slide direction="up" in timeout={300 + index * 50} key={item.memberId}>
        <ListItem
          sx={{
            mb: 1,
            borderRadius: 2,
            bgcolor: item.rank <= 3 ? 'action.hover' : 'background.paper',
            border: item.rank <= 3 ? `2px solid ${theme.palette.primary.main}` : 'none',
          }}
        >
          <ListItemAvatar>
            <Avatar
              sx={{
                bgcolor: item.rank <= 3 ? 'primary.main' : 'grey.300',
                width: 48,
                height: 48,
                fontSize: '1.5rem',
              }}
            >
              {medal || item.rank}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {item.nickname || '未命名'}
                </Typography>
                <Chip
                  label={statusLabel}
                  color={statusColor}
                  size="small"
                  icon={
                    item.status === 'absent' ? (
                      <CancelIcon />
                    ) : item.status === 'late' ? (
                      <ScheduleIcon />
                    ) : (
                      <CheckCircleIcon />
                    )
                  }
                />
                {item.pokeCount > 0 && (
                  <Chip
                    label={`👆 ${item.pokeCount}`}
                    size="small"
                    variant="outlined"
                    icon={<PokeIcon />}
                  />
                )}
              </Box>
            }
            secondary={
              <Box sx={{ mt: 0.5 }}>
                {item.arrivalTime ? (
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(item.arrivalTime)} {formatTime(item.arrivalTime)}
                    {item.lateMinutes !== undefined && item.lateMinutes > 0 && (
                      <span style={{ color: theme.palette.error.main, marginLeft: 8 }}>
                        遲到 {item.lateMinutes} 分鐘
                      </span>
                    )}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="error">
                    未到達
                  </Typography>
                )}
              </Box>
            }
          />
        </ListItem>
      </Slide>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 300 }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrophyIcon color="primary" />
          <Typography variant="h6">聚會排行榜</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {result && (
          <Box>
            {/* 統計卡片 */}
            <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="h6" gutterBottom>
                統計數據
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="body2">總參加人數</Typography>
                  <Typography variant="h5">{result.stats.totalMembers}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2">已到達</Typography>
                  <Typography variant="h5">{result.stats.arrivedCount}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2">準時率</Typography>
                  <Typography variant="h5">
                    {result.stats.totalMembers > 0
                      ? Math.round(
                          ((result.stats.totalMembers - result.stats.lateCount - result.stats.absentCount) /
                            result.stats.totalMembers) *
                            100
                        )
                      : 0}
                    %
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2">遲到</Typography>
                  <Typography variant="h5">{result.stats.lateCount}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2">缺席</Typography>
                  <Typography variant="h5">{result.stats.absentCount}</Typography>
                </Box>
                {result.stats.totalPokes !== undefined && result.stats.totalPokes > 0 && (
                  <Box>
                    <Typography variant="body2">總戳數</Typography>
                    <Typography variant="h5">👆 {result.stats.totalPokes}</Typography>
                  </Box>
                )}
              </Box>
            </Paper>

            {/* 前三名 */}
            {topThree.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrophyIcon color="primary" />
                  前三名
                </Typography>
                <List>{topThree.map((item, index) => renderRankingItem(item, index))}</List>
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            {/* 準時列表 */}
            {onTime.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon color="success" />
                  準時到達 ({onTime.length})
                </Typography>
                <List>
                  {onTime.map((item, index) => (
                    <ListItem key={item.memberId} sx={{ mb: 1, borderRadius: 2 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'success.light' }}>
                          <CheckCircleIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={item.nickname || '未命名'}
                        secondary={`${formatDate(item.arrivalTime)} ${formatTime(item.arrivalTime)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* 遲到列表 */}
            {late.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon color="warning" />
                  遲到 ({late.length})
                </Typography>
                <List>{late.map((item, index) => renderRankingItem(item, index + onTime.length))}</List>
              </Box>
            )}

            {/* 缺席列表 */}
            {absent.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CancelIcon color="error" />
                  缺席 ({absent.length})
                </Typography>
                <List>
                  {absent.map((item, index) => (
                    <ListItem key={item.memberId} sx={{ mb: 1, borderRadius: 2, bgcolor: 'error.light' }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'error.main' }}>
                          <CancelIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={item.nickname || '未命名'}
                        secondary="未到達"
                        secondaryTypographyProps={{ color: 'error' }}
                      />
                      {item.pokeCount > 0 && (
                        <Chip label={`👆 ${item.pokeCount}`} size="small" variant="outlined" />
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* 戳人統計 */}
            {result.pokes && result.pokes.mostPoked && result.pokes.mostPoker && (
              (result.pokes.mostPoked.count > 0 || result.pokes.mostPoker.count > 0) && (
                <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PokeIcon color="primary" />
                    戳人統計
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {result.pokes.mostPoked.count > 0 && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          最常被戳
                        </Typography>
                        <Typography variant="h6">
                          {result.pokes.mostPoked.nickname} 👆 {result.pokes.mostPoked.count}
                        </Typography>
                      </Box>
                    )}
                    {result.pokes.mostPoker.count > 0 && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          最愛戳人
                        </Typography>
                        <Typography variant="h6">
                          {result.pokes.mostPoker.nickname} 👆 {result.pokes.mostPoker.count}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              )
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          關閉
        </Button>
      </DialogActions>
    </Dialog>
  );
}


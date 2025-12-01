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
  Grid,
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
// 測試用：取消註解下面這行來使用 mock data
// import { mockEventResult, mockEventResultSimple, mockEventResultAllAbsent, mockEventResultAllLate } from '../mocks/eventResultMockData';

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
      return '準時到達';
    case 'late':
      return '遲到';
    case 'absent':
      return '缺席';
    default:
      return '未知';
  }
};

const formatDateTime = (timeString?: string): string => {
  if (!timeString) return '--';
  const date = new Date(timeString);
  return date.toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getRankBadgeColor = (rank: number): string => {
  switch (rank) {
    case 1:
      return '#FFD700'; // Gold
    case 2:
      return '#C0C0C0'; // Silver
    case 3:
      return '#CD7F32'; // Bronze
    default:
      return '#E0E0E0';
  }
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
      // 測試用：取消註解下面這段來使用 mock data（記得註解掉真實 API 調用）
      // const USE_MOCK_DATA = true;
      // if (USE_MOCK_DATA) {
      //   // 可以切換不同的 mock data 來測試不同場景
      //   await new Promise((resolve) => setTimeout(resolve, 500)); // 模擬 API 延遲
      //   setResult(mockEventResult); // 完整版：包含前三名、遲到、缺席
      //   // setResult(mockEventResultSimple); // 簡化版：只有前三名
      //   // setResult(mockEventResultAllAbsent); // 只有缺席
      //   // setResult(mockEventResultAllLate); // 只有遲到
      //   setLoading(false);
      //   return;
      // }

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

  const topThree = result?.rankings.filter((r) => r.rank && r.rank <= 3 && r.status !== 'absent') || [];
  const late = result?.rankings.filter((r) => r.status === 'late') || [];
  const absent = result?.rankings.filter((r) => r.status === 'absent') || [];

  // Calculate on-time rate
  const onTimeRate =
    result && result.stats.totalMembers > 0
      ? Math.round(
          ((result.stats.totalMembers - result.stats.lateCount - result.stats.absentCount) /
            result.stats.totalMembers) *
            100
        )
      : 0;

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
          <TrophyIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h6" fontWeight={600}>
            聚會排行榜
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
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
            {/* 1. Stats Summary - Light, compact */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                mb: 3,
                bgcolor: '#F5F7FA',
                borderRadius: 2,
                border: '1px solid',
                borderColor: '#E5E9F0',
              }}
            >
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'text.primary' }}>
                統計數據
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      總參加人數
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                      {result.stats.totalMembers}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      已到達
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                      {result.stats.arrivedCount}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      準時率
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                      {onTimeRate}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      遲到
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                      {result.stats.lateCount}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      缺席
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                      {result.stats.absentCount}
                    </Typography>
                  </Box>
                </Grid>
                {result.stats.totalPokes !== undefined && result.stats.totalPokes > 0 && (
                  <Grid item xs={6} sm={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        總戳數
                      </Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                        {result.stats.totalPokes}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* 2. Top 3 Ranking - Main hero */}
            {topThree.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrophyIcon color="primary" sx={{ fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    前三名
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {topThree.map((item, index) => {
                    const statusColor = getStatusColor(item.status);
                    const statusLabel = getStatusLabel(item.status);
                    const rankBadgeColor = getRankBadgeColor(item.rank || 0);
                    const lateText =
                      item.lateMinutes !== undefined && item.lateMinutes > 0
                        ? `遲到 ${item.lateMinutes} 分鐘`
                        : statusLabel;

                    return (
                      <Slide direction="up" in timeout={300 + index * 50} key={item.memberId}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'white',
                            border: '1px solid',
                            borderColor: '#E5E9F0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          {/* Left: Rank badge */}
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: '50%',
                              bgcolor: rankBadgeColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 700,
                              fontSize: '1.25rem',
                              flexShrink: 0,
                            }}
                          >
                            {item.rank}
                          </Box>

                          {/* Center: Name, status, timestamp */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                              {item.nickname || '未命名'}
                            </Typography>
                            <Chip
                              label={lateText}
                              color={statusColor}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                mb: 0.5,
                              }}
                            />
                            {item.arrivalTime && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {formatDateTime(item.arrivalTime)}
                              </Typography>
                            )}
                          </Box>

                          {/* Right: Optional icon */}
                          {item.status !== 'absent' && (
                            <CheckCircleIcon
                              sx={{
                                color: theme.palette.success.main,
                                fontSize: 20,
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </Paper>
                      </Slide>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* 3. Late section - Calmer design */}
            {late.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ScheduleIcon sx={{ fontSize: 20, color: theme.palette.warning.main }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    遲到 ({late.length})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {late.map((item) => (
                    <Paper
                      key={item.memberId}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'white',
                        borderLeft: '3px solid',
                        borderColor: theme.palette.warning.main,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: theme.palette.warning.light,
                          color: theme.palette.warning.main,
                          fontSize: '0.875rem',
                        }}
                      >
                        {item.nickname?.charAt(0) || '?'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {item.nickname || '未命名'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.lateMinutes !== undefined && item.lateMinutes > 0
                            ? `遲到 ${item.lateMinutes} 分鐘`
                            : '遲到'}
                        </Typography>
                      </Box>
                      {item.pokeCount > 0 && (
                        <Chip
                          icon={<PokeIcon sx={{ fontSize: 14 }} />}
                          label={item.pokeCount}
                          size="small"
                          sx={{
                            height: 24,
                            fontSize: '0.7rem',
                            bgcolor: theme.palette.warning.light,
                            color: theme.palette.warning.dark,
                          }}
                        />
                      )}
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}

            {/* 4. Absent section - Calmer design */}
            {absent.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CancelIcon sx={{ fontSize: 20, color: theme.palette.error.main }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    缺席 ({absent.length})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {absent.map((item) => (
                    <Paper
                      key={item.memberId}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'white',
                        borderLeft: '3px solid',
                        borderColor: theme.palette.error.main,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: theme.palette.error.light,
                          color: theme.palette.error.main,
                          fontSize: '0.875rem',
                        }}
                      >
                        {item.nickname?.charAt(0) || '?'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {item.nickname || '未命名'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          未到達
                        </Typography>
                      </Box>
                      {item.pokeCount > 0 && (
                        <Chip
                          icon={<PokeIcon sx={{ fontSize: 14 }} />}
                          label={item.pokeCount}
                          size="small"
                          sx={{
                            height: 24,
                            fontSize: '0.7rem',
                            bgcolor: theme.palette.error.light,
                            color: theme.palette.error.dark,
                          }}
                        />
                      )}
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}

            {/* 5. Poke stats (optional, if available) */}
            {result.pokes && result.pokes.mostPoked && result.pokes.mostPoker && (
              (result.pokes.mostPoked.count > 0 || result.pokes.mostPoker.count > 0) && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mt: 3,
                    bgcolor: '#F5F7FA',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: '#E5E9F0',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <PokeIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                    <Typography variant="subtitle2" fontWeight={600}>
                      戳人統計
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {result.pokes.mostPoked.count > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          最常被戳
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                          {result.pokes.mostPoked.nickname} ({result.pokes.mostPoked.count})
                        </Typography>
                      </Box>
                    )}
                    {result.pokes.mostPoker.count > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          最愛戳人
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                          {result.pokes.mostPoker.nickname} ({result.pokes.mostPoker.count})
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

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Button onClick={onClose} variant="contained" fullWidth={isMobile} sx={{ borderRadius: 2 }}>
          關閉
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Avatar,
  FormControl,
  FormLabel,
  CircularProgress,
  Stack,
  Tooltip,
  Select,
  MenuItem
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { TimeMidpointResponse, RoutesResponse, TravelMode, Event } from '../api/events';

interface RouteInfoPanelProps {
  timeMidpoint: TimeMidpointResponse | null;
  routes: RoutesResponse | null;
  showRoutes: boolean;
  loadingRoutes: boolean;
  calcObjective: 'minimize_total' | 'minimize_max';
  onCalcObjectiveChange: (objective: 'minimize_total' | 'minimize_max') => void;
  onToggleRoutes: () => void;
  event?: Event;
}

export default function RouteInfoPanel({
  timeMidpoint,
  routes: _routes,
  showRoutes,
  loadingRoutes,
  calcObjective,
  onCalcObjectiveChange,
  onToggleRoutes,
  event
}: RouteInfoPanelProps) {
  const [highlightedMember, setHighlightedMember] = useState<number | null>(null);


  const handleMemberClick = (memberId: number) => {
    setHighlightedMember(highlightedMember === memberId ? null : memberId);
    // TODO: 實作高亮路線功能
  };

  const handleOpenNavigation = (_memberId: number, lat: number, lng: number, travelMode: TravelMode | null) => {
    if (timeMidpoint) {
      const mode = travelMode === 'motorcycling' ? 'driving' : (travelMode || 'driving');
      const url = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${timeMidpoint.midpoint.lat},${timeMidpoint.midpoint.lng}&travelmode=${mode}`;
      window.open(url, '_blank');
    }
  };

  return (
    <Card sx={{ 
      borderRadius: 3,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      border: '1px solid #E5E7EB'
    }}>
      <CardContent sx={{ p: 3 }}>
        {/* 標題 */}
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 'bold', 
            color: '#111827',
            mb: 3
          }}
        >
          🛣️ 路線資訊
        </Typography>

        {/* 優化目標選擇 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ color: '#6B7280', mb: 2 }}>
            💡 系統將使用每位成員各自設定的交通方式來計算
          </Typography>
          
          <FormControl sx={{ minWidth: 150 }}>
            <FormLabel sx={{ fontSize: '0.875rem', mb: 0.5 }}>優化目標</FormLabel>
            <Select
              value={calcObjective}
              onChange={(e) => onCalcObjectiveChange(e.target.value as any)}
              size="small"
              sx={{
                fontSize: '0.875rem',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#D1D5DB'
                }
              }}
            >
              <MenuItem value="minimize_total">總時間最小</MenuItem>
              <MenuItem value="minimize_max">最大時間最小</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* 會面點結果 */}
        {timeMidpoint && (
          <Box sx={{ 
            mb: 3, 
            p: 2, 
            bgcolor: '#F3E8FF', 
            borderRadius: 2,
            border: '1px solid #E9D5FF'
          }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#6B21A8', mb: 1 }}>
              ⭐ 最佳會面點: {timeMidpoint.midpoint.name}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B21A8', display: 'block', mb: 1 }}>
              {timeMidpoint.midpoint.address}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B21A8', display: 'block', mb: 2 }}>
              從 {timeMidpoint.candidates_count} 個候選地點中選出
              {timeMidpoint.cached && ' (快取結果)'}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip 
                label={`總時間: ${Math.round(timeMidpoint.metric.total / 60)} 分鐘`}
                size="small"
                sx={{ bgcolor: 'white', color: '#6B21A8', fontWeight: 'bold' }}
              />
              <Chip 
                label={`最長時間: ${Math.round(timeMidpoint.metric.max / 60)} 分鐘`}
                size="small"
                sx={{ bgcolor: 'white', color: '#6B21A8', fontWeight: 'bold' }}
              />
            </Stack>
          </Box>
        )}

        {/* 路線控制 */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onToggleRoutes}
            disabled={loadingRoutes}
            startIcon={loadingRoutes ? <CircularProgress size={16} /> : (showRoutes ? <VisibilityOffIcon /> : <VisibilityIcon />)}
            sx={{
              borderColor: '#8B5CF6',
              color: '#8B5CF6',
              '&:hover': {
                borderColor: '#7C3AED',
                bgcolor: '#F3E8FF'
              },
              textTransform: 'none'
            }}
          >
            {loadingRoutes ? '載入中...' : showRoutes ? '隱藏路線' : '顯示路線'}
          </Button>
        </Box>

        {/* 成員交通時間列表 */}
        {timeMidpoint && (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#6B21A8', mb: 2 }}>
              各成員交通時間：
            </Typography>
            
            <Stack spacing={1}>
              {timeMidpoint.members.map((member) => {
                // Find the actual member object by memberId
                let memberData: any = undefined;
                if (event && member.memberId) {
                  memberData = event.members.find(m => m.id === member.memberId);
                }

                const isHighlighted = memberData ? highlightedMember === memberData.id : false;
                
                return (
                  <Box key={member.memberId} sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: isHighlighted ? '#F3E8FF' : '#FAFAFA',
                    border: isHighlighted ? '2px solid #8B5CF6' : '1px solid #F3F4F6',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: isHighlighted ? '#F3E8FF' : '#F9FAFB',
                      borderColor: isHighlighted ? '#8B5CF6' : '#E5E7EB'
                    }
                  }}
                  onClick={() => memberData?.id && handleMemberClick(memberData.id)}
                  >
                    <Avatar sx={{ 
                      bgcolor: memberData?.isOffline ? '#F59E0B' : '#3B82F6',
                      width: 32,
                      height: 32,
                      mr: 2
                    }}>
                      {memberData?.isOffline ? '👤' : '👤'}
                    </Avatar>
                    
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ 
                        color: '#6B21A8', 
                        fontWeight: 'bold',
                        fontSize: '0.8rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {member.username?.split('@')[0] || memberData?.nickname || 'Unknown'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#9333EA', fontSize: '0.7rem' }}>
                        {(member.distance / 1000).toFixed(1)} 公里
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'right', mr: 1 }}>
                      <Typography variant="body2" sx={{ 
                        color: '#6B21A8', 
                        fontWeight: 'bold', 
                        fontSize: '0.8rem' 
                      }}>
                        {Math.round(member.travelTime / 60)} 分鐘
                      </Typography>
                    </Box>
                    
                    {memberData?.lat && memberData?.lng && (
                      <Tooltip title={`為 ${member.username?.split('@')[0] || memberData?.nickname || 'Unknown'} 開啟導航`}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenNavigation(memberData.id, memberData.lat!, memberData.lng!, memberData.travelMode);
                          }}
                          sx={{
                            bgcolor: '#10B981',
                            color: 'white',
                            '&:hover': { bgcolor: '#059669' },
                            width: 28,
                            height: 28
                          }}
                        >
                          <LocationIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* 空狀態 */}
        {!timeMidpoint && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            textAlign: 'center',
            color: '#6B7280',
            py: 4
          }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                尚未計算會面點
              </Typography>
              <Typography variant="caption">
                請先設定成員位置，然後點擊「重新計算會面點」
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import EventRoom from './EventRoom';
import EventsDetail from './EventsDetail';
import { getMockEventById } from '../mocks/eventData';

/**
 * EventDetail - 統一的聚會詳情頁面
 * 根據 event.useMeetHalf flag 動態決定顯示：
 * - useMeetHalf = true  → EventsDetail（MeetHalf 計算中點）
 * - useMeetHalf = false → EventRoom（聚會追蹤、即時定位）
 */
export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [useMeetHalf, setUseMeetHalf] = useState<boolean>(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    // 模擬 API 載入延遲
    setTimeout(() => {
      const event = getMockEventById(id);
      
      if (event) {
        setUseMeetHalf(event.useMeetHalf);
      }
      
      setLoading(false);
    }, 300);
  }, [id]);

  // Loading 狀態
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // 根據 useMeetHalf flag 決定顯示哪個組件
  return useMeetHalf ? <EventsDetail /> : <EventRoom />;
}


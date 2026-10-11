import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Container, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import api from '../api/axios';
import { calculateTempMidpoint, CalculateMidpointResponse, TravelMode } from '../api/events';

interface Departure { address: string; travelMode: TravelMode }
const modes: Array<[TravelMode, string]> = [['transit', '大眾運輸'], ['driving', '開車'], ['walking', '步行'], ['bicycling', '自行車']];

export default function FindMeeting() {
  const navigate = useNavigate();
  const [departures, setDepartures] = useState<Departure[]>([
    { address: '', travelMode: 'transit' }, { address: '', travelMode: 'transit' },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CalculateMidpointResponse | null>(null);
  function update(index: number, change: Partial<Departure>) {
    setDepartures(previous => previous.map((item, i) => i === index ? { ...item, ...change } : item));
    setResult(null);
  }
  async function calculate(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setResult(null);
    if (departures.some(item => !item.address.trim())) {
      setError('請填入每位參加者的出發地址。');
      return;
    }
    setBusy(true);
    try {
      const locations = await Promise.all(departures.map(async (item, index) => {
        const response = await api.get('/maps/geocode', { params: { address: item.address.trim() } });
        const match = response.data.results?.[0];
        if (!match) throw new Error(`找不到參加者 ${index + 1} 的地址，請輸入更完整的地址。`);
        return { ...match.geometry.location, travelMode: item.travelMode };
      }));
      setResult(await calculateTempMidpoint({ locations, useMeetHalf: true }));
    } catch (cause) {
      setError(cause instanceof Error && !('response' in cause) ? cause.message : '查詢失敗，請稍後重試或確認出發地址。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Button component={RouterLink} to="/">回首頁</Button>
      <Typography component="h1" variant="h4" sx={{ mt: 2, mb: 1 }}>找見面地點</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>不用登入，也不用先建立聚會。地址將傳送至 Google Maps 以查詢位置。</Typography>
      <Box component="form" onSubmit={calculate}>
        <Stack spacing={2}>
          {departures.map((item, index) => (
            <Paper key={index} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Stack spacing={2}>
                <Typography component="h2" variant="subtitle1">參加者 {index + 1}</Typography>
                <TextField label={`參加者 ${index + 1} 出發地址`} value={item.address} required fullWidth disabled={busy}
                  placeholder="例如：台北車站" onChange={event => update(index, { address: event.target.value })} />
                <TextField select label={`參加者 ${index + 1} 交通方式`} value={item.travelMode} disabled={busy}
                  onChange={event => update(index, { travelMode: event.target.value as TravelMode })}>
                  {modes.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                </TextField>
                {departures.length > 2 && <Button disabled={busy} onClick={() => {
                  setDepartures(previous => previous.filter((_, i) => i !== index)); setResult(null);
                }}>移除參加者 {index + 1}</Button>}
              </Stack>
            </Paper>
          ))}
          <Button disabled={busy || departures.length >= 10} onClick={() => {
            setDepartures(previous => [...previous, { address: '', travelMode: 'transit' }]); setResult(null);
          }}>新增參加者</Button>
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? '正在查詢…' : '查看推薦地點'}</Button>
        </Stack>
      </Box>
      {result && (
        <Stack component="section" aria-label="查詢結果" aria-live="polite" spacing={2} sx={{ mt: 4 }}>
          <Typography component="h2" variant="h5">大家的中點附近</Typography>
          <Alert severity="info">目前以地理中點尋找周邊地點，交通時間是到中點的估算，不代表到各推薦店家的時間，也尚未依交通時間最佳化。</Alert>
          <Typography>{result.address === 'Unknown location' ? '中點地址暫時無法取得' : result.address}</Typography>
          {departures.map((_, index) => {
            const time = result.travel_times.find(item => item.locationIndex === index);
            return <Typography key={index}>參加者 {index + 1}：{time?.durationValue != null ? time.duration : '交通時間暫時無法取得'}</Typography>;
          })}
          {result.suggested_places.length === 0 && <Alert severity="warning">目前沒有可用的周邊推薦。你可以修改出發地址再試一次。</Alert>}
          {result.suggested_places.map((place, index) => (
            <Paper key={place.place_id || index} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography component="h3" variant="h6">{place.name}</Typography>
              <Typography color="text.secondary">{place.address}</Typography>
              {place.rating != null && <Typography>Google 評分：{place.rating}</Typography>}
              <Button disabled={place.lat == null || place.lng == null} onClick={() => navigate('/events/new', {
                state: { meetingPoint: { name: place.name, address: place.address, lat: place.lat, lng: place.lng } },
              })}>在這裡建立聚會</Button>
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  );
}

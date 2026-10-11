import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Landing from '../pages/Landing';
import FindMeeting from '../pages/FindMeeting';
import api from '../api/axios';
import { calculateTempMidpoint } from '../api/events';
const auth = vi.hoisted(() => ({ user: null as null | { name: string }, loading: false }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../api/axios', () => ({ default: { get: vi.fn() } }));
vi.mock('../api/events', () => ({ calculateTempMidpoint: vi.fn() }));
function Destination() {
  const { state } = useLocation();
  return <div>選定地點：{state?.meetingPoint?.name}，緯度：{state?.meetingPoint?.lat}</div>;
}
function renderFinder() {
  render(<MemoryRouter initialEntries={['/find']}><Routes>
    <Route path="/find" element={<FindMeeting />} />
    <Route path="/events/new" element={<Destination />} />
  </Routes></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(/參加者 1 出發地址/), { target: { value: '台北車站' } });
  fireEvent.change(screen.getByLabelText(/參加者 2 出發地址/), { target: { value: '板橋車站' } });
}
const response = {
  midpoint: { lat: 25, lng: 121 }, address: '中點地址', location_count: 2, cached: false,
  suggested_places: [{ name: '見面咖啡', address: '咖啡店地址', place_id: 'cafe', types: ['cafe'], lat: 0, lng: 121 }],
  travel_times: [{ locationIndex: 0, travelMode: 'transit', duration: '20 分鐘', durationValue: 1200, distance: '3 km', distanceValue: 3000 }],
};
beforeEach(() => { vi.resetAllMocks(); auth.user = null; });
describe('Guest-first experience', () => {
  it('offers the public primary CTA and optional login', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    expect(screen.getByRole('link', { name: '找見面地點' })).toHaveAttribute('href', '/find');
    expect(screen.getByRole('link', { name: '登入' })).toHaveAttribute('href', '/login');
  });
  it('keeps returning users connected to their events', () => {
    auth.user = { name: 'Returning user' };
    render(<MemoryRouter><Landing /></MemoryRouter>);
    expect(screen.getByRole('link', { name: '我的聚會' })).toHaveAttribute('href', '/events');
  });
  it('geocodes guest addresses and hands off a real place including zero coordinates', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { results: [{ geometry: { location: { lat: 25, lng: 121 } } }] } });
    vi.mocked(calculateTempMidpoint).mockResolvedValue(response);
    renderFinder(); fireEvent.click(screen.getByRole('button', { name: '查看推薦地點' }));
    await screen.findByText('見面咖啡');
    expect(api.get).toHaveBeenCalledWith('/maps/geocode', { params: { address: '台北車站' } });
    expect(calculateTempMidpoint).toHaveBeenCalledWith({ locations: [{ lat: 25, lng: 121, travelMode: 'transit' }, { lat: 25, lng: 121, travelMode: 'transit' }], useMeetHalf: true });
    expect(screen.getByText('參加者 1：20 分鐘')).toBeInTheDocument();
    expect(screen.getByText('參加者 2：交通時間暫時無法取得')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '在這裡建立聚會' }));
    expect(screen.getByText('選定地點：見面咖啡，緯度：0')).toBeInTheDocument();
  });
  it('rejects an unresolved address without calculating a misleading midpoint', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
    renderFinder(); fireEvent.click(screen.getByRole('button', { name: '查看推薦地點' }));
    await screen.findByRole('alert');
    expect(calculateTempMidpoint).not.toHaveBeenCalled();
  });
  it('clears stale recommendations when inputs change', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { results: [{ geometry: { location: { lat: 25, lng: 121 } } }] } });
    vi.mocked(calculateTempMidpoint).mockResolvedValue(response);
    renderFinder(); fireEvent.click(screen.getByRole('button', { name: '查看推薦地點' }));
    await screen.findByText('見面咖啡');
    fireEvent.change(screen.getByLabelText(/參加者 1 出發地址/), { target: { value: '新地址' } });
    expect(screen.queryByText('見面咖啡')).not.toBeInTheDocument();
  });
  it('shows degraded results honestly when recommendations are unavailable', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { results: [{ geometry: { location: { lat: 25, lng: 121 } } }] } });
    vi.mocked(calculateTempMidpoint).mockResolvedValue({ ...response, address: 'Unknown location', suggested_places: [], travel_times: [] });
    renderFinder(); fireEvent.click(screen.getByRole('button', { name: '查看推薦地點' }));
    await screen.findByText('中點地址暫時無法取得');
    expect(screen.getByText(/目前沒有可用的周邊推薦/)).toBeInTheDocument();
  });
});

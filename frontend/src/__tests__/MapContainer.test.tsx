import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import MapContainer from '../components/MapContainer';
import { loadGoogleMaps } from '../lib/googleMapsLoader';
vi.mock('../lib/googleMapsLoader', () => ({ loadGoogleMaps: vi.fn() }));
const map = { setCenter: vi.fn(), setZoom: vi.fn() };
const marker = { setMap: vi.fn(), setPosition: vi.fn(), setTitle: vi.fn(), addListener: vi.fn(), getPosition: () => null, getTitle: () => '' };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_GOOGLE_MAPS_JS_KEY', 'test-key');
  vi.mocked(loadGoogleMaps).mockResolvedValue(globalThis.google);
  vi.mocked(google.maps.Map).mockImplementation(function () { return map as unknown as google.maps.Map; });
  vi.mocked(google.maps.Marker).mockImplementation(function () { return marker as unknown as google.maps.Marker; });
  vi.mocked(google.maps.LatLng).mockImplementation(function () { return {} as google.maps.LatLng; });
});
describe('MapContainer', () => {
  it('loads Maps and applies the requested zoom', async () => {
    render(<MapContainer zoom={12} />);
    await waitFor(() => expect(google.maps.Map).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ zoom: 12 })));
    expect(loadGoogleMaps).toHaveBeenCalledTimes(1);
  });
  it('creates markers and forwards clicks to the event page', async () => {
    const clicked = vi.fn();
    render(<MapContainer markers={[{ id: 42, lat: 25, lng: 121, title: '聚會' }]} onMarkerClick={clicked} />);
    await waitFor(() => expect(marker.addListener).toHaveBeenCalledWith('click', expect.any(Function)));
    const listener = marker.addListener.mock.calls.find(([event]) => event === 'click')![1];
    listener();
    expect(clicked).toHaveBeenCalledWith(42);
  });
  it('removes deleted markers on rerender', async () => {
    const { rerender } = render(<MapContainer markers={[{ id: 42, lat: 25, lng: 121, title: '聚會' }]} />);
    await waitFor(() => expect(google.maps.Marker).toHaveBeenCalledTimes(1));
    rerender(<MapContainer markers={[]} />);
    await waitFor(() => expect(marker.setMap).toHaveBeenCalledWith(null));
  });
  it('shows a recoverable error when loading fails', async () => {
    vi.mocked(loadGoogleMaps).mockRejectedValue(new Error('unavailable'));
    const { findByRole } = render(<MapContainer />);
    expect(await findByRole('alert')).toHaveTextContent('Google Maps 載入失敗');
  });
});

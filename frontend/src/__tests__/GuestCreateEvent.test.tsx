import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreateEvent from '../pages/CreateEvent';
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('../lib/googleMapsLoader', () => ({ loadGoogleMaps: () => { throw new Error('Browser key unavailable'); } }));

it('prefills the real guest event form and survives an unavailable browser Maps key', async () => {
  render(<MemoryRouter initialEntries={[{ pathname: '/events/new', state: {
    meetingPoint: { name: '見面咖啡', address: '咖啡店地址', lat: 25, lng: 121 },
  } }]}><CreateEvent /></MemoryRouter>);
  expect(screen.getByRole('textbox', { name: /集合地點/ })).toHaveValue('見面咖啡');
  expect(screen.getByText(/咖啡店地址/)).toBeInTheDocument();
  await screen.findByText('Google Maps 載入失敗');
  expect(screen.getByLabelText(/你的暱稱/)).toBeInTheDocument();
});

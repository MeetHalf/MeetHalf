import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CreateEvent from '../pages/CreateEvent';
import { eventsApi } from '../api/events';
const maps = vi.hoisted(() => ({ instances: [] as Array<{ input: HTMLInputElement; listener: () => void }> }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('../api/events', () => ({eventsApi: {createEvent:vi.fn(),getShareToken:vi.fn()}, calculateTempMidpoint:vi.fn()}));
vi.mock('../lib/googleMapsLoader', () => ({ loadGoogleMaps: async () => {
  google.maps.event = { clearInstanceListeners: vi.fn() } as unknown as typeof google.maps.event;
  google.maps.places = { Autocomplete: function(input: HTMLInputElement) {
    const instance={input,listener:()=>{}};maps.instances.push(instance);
    return { addListener: (_: string, listener:()=>void) => {instance.listener=listener;},getPlace:()=>({name:'Test cafe',formatted_address:'Cafe address',geometry:{location:{lat:()=>0,lng:()=>121}}}) };
  }} as unknown as typeof google.maps.places;
  return google;
} }));
beforeEach(()=>{vi.clearAllMocks();maps.instances=[];});
it('lets a guest choose a destination and submit without enabling MeetHalf', async()=>{
  vi.mocked(eventsApi.createEvent).mockResolvedValue({event:{id:42},member:null} as never);
  vi.mocked(eventsApi.getShareToken).mockResolvedValue({token:'test-invite'});
  render(<MemoryRouter><CreateEvent/></MemoryRouter>);
  fireEvent.change(screen.getByRole('textbox',{name:/聚會名稱/}),{target:{value:'Test meetup'}});
  fireEvent.change(screen.getByRole('textbox',{name:/你的暱稱/}),{target:{value:'Guest host'}});
  const input=screen.getByRole('textbox',{name:/集合地點/});
  await waitFor(()=>expect(maps.instances.some(i=>i.input===input)).toBe(true));
  act(()=>maps.instances.find(i=>i.input===input)!.listener());
  fireEvent.submit(input.closest('form')!);
  await waitFor(()=>expect(eventsApi.createEvent).toHaveBeenCalledWith(expect.objectContaining({meetingPointName:'Test cafe',meetingPointLat:0,meetingPointLng:121,ownerNickname:'Guest host'})));
});
it('does not submit stale coordinates after a selected destination is edited', async()=>{
  render(<MemoryRouter><CreateEvent/></MemoryRouter>);
  fireEvent.change(screen.getByRole('textbox',{name:/聚會名稱/}),{target:{value:'Test meetup'}});
  fireEvent.change(screen.getByRole('textbox',{name:/你的暱稱/}),{target:{value:'Guest host'}});
  const input=screen.getByRole('textbox',{name:/集合地點/});
  await waitFor(()=>expect(maps.instances.some(i=>i.input===input)).toBe(true));
  act(()=>maps.instances.find(i=>i.input===input)!.listener());
  fireEvent.change(input,{target:{value:'Unselected place'}});
  fireEvent.submit(input.closest('form')!);
  expect(eventsApi.createEvent).not.toHaveBeenCalled();
  expect(await screen.findByText('請選擇集合地點或使用 MeetHalf')).toBeInTheDocument();
});

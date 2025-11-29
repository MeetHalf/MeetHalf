// Mock Data for Events Feature Development
// 對應 EVENTS_API_SPEC.md 的資料結構

import type {
  Event,
  EventMember,
  EventResult,
  MyEventItem,
  UserStats,
  GetEventResponse,
  GetEventResultResponse,
  GetMyEventsResponse,
  GetUserStatsResponse,
  CreateEventResponse,
  JoinEventResponse,
} from '../types/events';

// ============================================
// Mock Events
// ============================================

export const mockEvent1: Event = {
  id: 'evt_hotpot_friday',
  title: '週五火鍋聚會',
  datetime: '2025-12-06T19:00:00+08:00',
  meetingPoint: {
    lat: 25.033,
    lng: 121.565,
    name: '台北101',
    address: '台北市信義區信義路五段7號',
  },
  timeWindow: {
    before: 30,
    after: 30,
  },
  ownerId: 1,
  status: 'ongoing',
  useMeetHalf: false,
  createdAt: '2025-11-29T10:00:00Z',
  updatedAt: '2025-11-29T10:00:00Z',
};

export const mockEvent2: Event = {
  id: 'evt_movie_sunday',
  title: '週日電影',
  datetime: '2025-12-08T14:00:00+08:00',
  meetingPoint: {
    lat: 25.042,
    lng: 121.517,
    name: '台北車站',
    address: '台北市中正區北平西路3號',
  },
  timeWindow: {
    before: 30,
    after: 30,
  },
  ownerId: 1,
  status: 'upcoming',
  useMeetHalf: false,
  createdAt: '2025-11-29T11:00:00Z',
  updatedAt: '2025-11-29T11:00:00Z',
};

export const mockEvent3: Event = {
  id: 'evt_lunch_yesterday',
  title: '昨天的午餐聚會',
  datetime: '2025-11-28T12:00:00+08:00',
  meetingPoint: {
    lat: 25.047,
    lng: 121.517,
    name: '信義商圈',
  },
  timeWindow: {
    before: 30,
    after: 30,
  },
  ownerId: 2,
  status: 'ended',
  useMeetHalf: false,
  createdAt: '2025-11-28T08:00:00Z',
  updatedAt: '2025-11-28T13:00:00Z',
};

// ============================================
// Mock Members
// ============================================

export const mockMembers: EventMember[] = [
  {
    id: 'mem_user_1',
    eventId: 'evt_hotpot_friday',
    userId: 1,
    nickname: '小明',
    isGuest: false,
    shareLocation: true,
    currentLocation: {
      lat: 25.040,
      lng: 121.560,
      updatedAt: '2025-12-06T18:55:30Z',
    },
    arrivalTime: '2025-12-06T18:55:00Z',
    travelMode: 'transit',
    createdAt: '2025-11-29T10:05:00Z',
    updatedAt: '2025-12-06T18:55:30Z',
  },
  {
    id: 'mem_user_2',
    eventId: 'evt_hotpot_friday',
    userId: 2,
    nickname: '小華',
    isGuest: false,
    shareLocation: true,
    currentLocation: {
      lat: 25.045,
      lng: 121.555,
      updatedAt: '2025-12-06T18:58:20Z',
    },
    arrivalTime: '2025-12-06T18:58:00Z',
    travelMode: 'driving',
    createdAt: '2025-11-29T10:10:00Z',
    updatedAt: '2025-12-06T18:58:20Z',
  },
  {
    id: 'mem_guest_3',
    eventId: 'evt_hotpot_friday',
    guestId: 'guest_abc123',
    nickname: '訪客小美',
    isGuest: true,
    shareLocation: true,
    currentLocation: {
      lat: 25.035,
      lng: 121.570,
      updatedAt: '2025-12-06T19:05:15Z',
    },
    arrivalTime: '2025-12-06T19:05:00Z',
    travelMode: 'walking',
    createdAt: '2025-12-06T18:30:00Z',
    updatedAt: '2025-12-06T19:05:15Z',
  },
  {
    id: 'mem_user_4',
    eventId: 'evt_hotpot_friday',
    userId: 4,
    nickname: '小王',
    isGuest: false,
    shareLocation: true,
    currentLocation: {
      lat: 25.050,
      lng: 121.545,
      updatedAt: '2025-12-06T19:10:45Z',
    },
    travelMode: 'bicycling',
    createdAt: '2025-11-29T10:15:00Z',
    updatedAt: '2025-12-06T19:10:45Z',
  },
  {
    id: 'mem_guest_5',
    eventId: 'evt_hotpot_friday',
    guestId: 'guest_xyz789',
    nickname: '訪客小李',
    isGuest: true,
    shareLocation: false,
    travelMode: 'transit',
    createdAt: '2025-12-06T18:45:00Z',
    updatedAt: '2025-12-06T18:45:00Z',
  },
];

// ============================================
// Mock Event Result (排行榜)
// ============================================

export const mockEventResult: EventResult = {
  eventId: 'evt_hotpot_friday',
  rankings: [
    {
      memberId: 'mem_user_1',
      nickname: '小明',
      arrivalTime: '2025-12-06T18:55:00Z',
      status: 'early',
      lateMinutes: 0,
      rank: 1,
      pokeCount: 0,
    },
    {
      memberId: 'mem_user_2',
      nickname: '小華',
      arrivalTime: '2025-12-06T18:58:00Z',
      status: 'ontime',
      lateMinutes: 0,
      rank: 2,
      pokeCount: 0,
    },
    {
      memberId: 'mem_guest_3',
      nickname: '訪客小美',
      arrivalTime: '2025-12-06T19:05:00Z',
      status: 'late',
      lateMinutes: 5,
      rank: 3,
      pokeCount: 2,
    },
    {
      memberId: 'mem_user_4',
      nickname: '小王',
      arrivalTime: '2025-12-06T19:15:00Z',
      status: 'late',
      lateMinutes: 15,
      rank: 4,
      pokeCount: 5,
    },
    {
      memberId: 'mem_guest_5',
      nickname: '訪客小李',
      status: 'absent',
      rank: 5,
      pokeCount: 3,
    },
  ],
  stats: {
    totalMembers: 5,
    arrivedCount: 4,
    lateCount: 2,
    absentCount: 1,
    avgArrivalTime: '2025-12-06T19:03:15Z',
    earliestArrival: {
      nickname: '小明',
      time: '2025-12-06T18:55:00Z',
    },
    latestArrival: {
      nickname: '小王',
      time: '2025-12-06T19:15:00Z',
    },
    totalPokes: 10,
  },
  pokes: {
    mostPoked: {
      nickname: '小王',
      count: 5,
    },
    mostPoker: {
      nickname: '小明',
      count: 3,
    },
  },
};

// ============================================
// Mock My Events List
// ============================================

export const mockMyEvents: MyEventItem[] = [
  {
    id: 'evt_hotpot_friday',
    title: '週五火鍋聚會',
    datetime: '2025-12-06T19:00:00+08:00',
    status: 'ongoing',
    memberCount: 5,
  },
  {
    id: 'evt_movie_sunday',
    title: '週日電影',
    datetime: '2025-12-08T14:00:00+08:00',
    status: 'upcoming',
    memberCount: 3,
  },
  {
    id: 'evt_lunch_yesterday',
    title: '昨天的午餐聚會',
    datetime: '2025-11-28T12:00:00+08:00',
    status: 'ended',
    memberCount: 6,
    myStatus: 'ontime',
    myRank: 2,
  },
  {
    id: 'evt_dinner_last_week',
    title: '上週晚餐',
    datetime: '2025-11-22T18:30:00+08:00',
    status: 'ended',
    memberCount: 4,
    myStatus: 'early',
    myRank: 1,
  },
  {
    id: 'evt_coffee_break',
    title: '咖啡時光',
    datetime: '2025-11-20T15:00:00+08:00',
    status: 'ended',
    memberCount: 3,
    myStatus: 'late',
    myRank: 3,
  },
];

// ============================================
// Mock User Stats
// ============================================

export const mockUserStats: UserStats = {
  totalEvents: 15,
  ontimeCount: 12,
  lateCount: 3,
  absentCount: 0,
  avgLateMinutes: 5.2,
  totalPokeReceived: 2,
  totalPokeSent: 8,
  ontimeRate: 0.80,
  bestRank: 1,
  worstRank: 10,
};

// ============================================
// Mock API Responses
// ============================================

export const mockGetEventResponse: GetEventResponse = {
  event: {
    ...mockEvent1,
    members: mockMembers,
  },
};

export const mockGetEventResultResponse: GetEventResultResponse = {
  result: mockEventResult,
};

export const mockGetMyEventsResponse: GetMyEventsResponse = {
  events: mockMyEvents,
  total: mockMyEvents.length,
  hasMore: false,
};

export const mockGetUserStatsResponse: GetUserStatsResponse = {
  stats: mockUserStats,
};

export const mockCreateEventResponse: CreateEventResponse = {
  event: mockEvent1,
  shareUrl: `https://meethalf.app/events/${mockEvent1.id}`,
};

export const mockJoinEventResponse: JoinEventResponse = {
  member: mockMembers[2], // 訪客小美
  guestToken: 'mock_guest_token_abc123xyz789',
};

// ============================================
// Helper Functions
// ============================================

/**
 * 根據 eventId 取得 mock event
 */
export function getMockEventById(eventId: string): Event | undefined {
  const events = [mockEvent1, mockEvent2, mockEvent3];
  return events.find((e) => e.id === eventId);
}

/**
 * 根據 eventId 取得 mock members
 */
export function getMockMembersByEventId(eventId: string): EventMember[] {
  return mockMembers.filter((m) => m.eventId === eventId);
}

/**
 * 模擬延遲（用於模擬 API 請求）
 */
export function mockDelay(ms: number = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 模擬成功回應
 */
export async function mockApiSuccess<T>(data: T, delay: number = 500): Promise<T> {
  await mockDelay(delay);
  return data;
}

/**
 * 模擬錯誤回應
 */
export async function mockApiError(
  code: string,
  message: string,
  delay: number = 500
): Promise<never> {
  await mockDelay(delay);
  throw {
    error: {
      code,
      message,
    },
  };
}

// ============================================
// Mock Data for Testing
// ============================================

/**
 * 生成隨機位置（台北範圍）
 */
export function generateRandomLocation(): { lat: number; lng: number } {
  const centerLat = 25.033;
  const centerLng = 121.565;
  const range = 0.05; // 約 5.5 公里範圍

  return {
    lat: centerLat + (Math.random() - 0.5) * range,
    lng: centerLng + (Math.random() - 0.5) * range,
  };
}

/**
 * 生成多個測試成員
 */
export function generateMockMembers(count: number, eventId: string): EventMember[] {
  const names = ['小明', '小華', '小美', '小王', '小李', '小陳', '小張', '小林'];
  const travelModes: Array<'driving' | 'transit' | 'walking' | 'bicycling'> = [
    'driving',
    'transit',
    'walking',
    'bicycling',
  ];

  return Array.from({ length: count }, (_, index) => {
    const isGuest = index % 2 === 0;
    const hasLocation = Math.random() > 0.2; // 80% 有位置
    const hasArrived = Math.random() > 0.4; // 60% 已到達

    return {
      id: `mem_${isGuest ? 'guest' : 'user'}_${index + 1}`,
      eventId,
      ...(isGuest ? { guestId: `guest_${index + 1}` } : { userId: index + 1 }),
      nickname: isGuest ? `訪客${names[index % names.length]}` : names[index % names.length],
      isGuest,
      shareLocation: hasLocation,
      ...(hasLocation && {
        currentLocation: {
          ...generateRandomLocation(),
          updatedAt: new Date(Date.now() - Math.random() * 600000).toISOString(),
        },
      }),
      ...(hasArrived && {
        arrivalTime: new Date(Date.now() - Math.random() * 1800000).toISOString(),
      }),
      travelMode: travelModes[index % travelModes.length],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

// ============================================
// Export All
// ============================================

export default {
  events: [mockEvent1, mockEvent2, mockEvent3],
  members: mockMembers,
  eventResult: mockEventResult,
  myEvents: mockMyEvents,
  userStats: mockUserStats,
  
  // API responses
  responses: {
    getEvent: mockGetEventResponse,
    getEventResult: mockGetEventResultResponse,
    getMyEvents: mockGetMyEventsResponse,
    getUserStats: mockGetUserStatsResponse,
    createEvent: mockCreateEventResponse,
    joinEvent: mockJoinEventResponse,
  },
  
  // Helpers
  helpers: {
    getMockEventById,
    getMockMembersByEventId,
    mockDelay,
    mockApiSuccess,
    mockApiError,
    generateRandomLocation,
    generateMockMembers,
  },
};


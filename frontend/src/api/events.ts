// Events API Layer
// 使用 feature flag 控制 mock/real API

import api from './axios';
import mockData from '../mocks/eventData';
import type {
  CreateEventRequest,
  CreateEventResponse,
  GetEventResponse,
  JoinEventRequest,
  JoinEventResponse,
  UpdateLocationRequest,
  UpdateLocationResponse,
  MarkArrivalResponse,
  PokeRequest,
  PokeResponse,
  GetEventResultResponse,
  GetMyEventsResponse,
  GetUserStatsResponse,
} from '../types/events';

// ============================================
// Feature Flag
// ============================================

// 開發階段使用 mock data
// 部署前改為 false 以使用真實 API
const USE_MOCK_DATA = true;

// Mock delay (模擬網路延遲)
const MOCK_DELAY = 800; // ms

// ============================================
// Events API
// ============================================

export const eventsApi = {
  /**
   * 建立聚會
   * POST /events
   * 需要 JWT 認證
   */
  async createEvent(data: CreateEventRequest): Promise<CreateEventResponse> {
    if (USE_MOCK_DATA) {
      return mockData.helpers.mockApiSuccess(mockData.responses.createEvent, MOCK_DELAY);
    }

    const response = await api.post('/events', data);
    return response.data;
  },

  /**
   * 取得聚會資訊
   * GET /events/:id
   * 不需要認證（公開連結）
   */
  async getEvent(eventId: string): Promise<GetEventResponse> {
    if (USE_MOCK_DATA) {
      const event = mockData.helpers.getMockEventById(eventId);
      if (!event) {
        return mockData.helpers.mockApiError('EVENT_NOT_FOUND', '聚會不存在');
      }

      const members = mockData.helpers.getMockMembersByEventId(eventId);
      return mockData.helpers.mockApiSuccess(
        {
          event: {
            ...event,
            members,
          },
        },
        MOCK_DELAY
      );
    }

    const response = await api.get(`/events/${eventId}`);
    return response.data;
  },

  /**
   * 加入聚會 (Guest 模式)
   * POST /events/:id/join
   * 不需要認證
   */
  async joinEvent(eventId: string, data: JoinEventRequest): Promise<JoinEventResponse> {
    if (USE_MOCK_DATA) {
      return mockData.helpers.mockApiSuccess(mockData.responses.joinEvent, MOCK_DELAY);
    }

    const response = await api.post(`/events/${eventId}/join`, data);
    return response.data;
  },

  /**
   * 更新位置
   * POST /events/:id/location
   * 需要 JWT 或 Guest Token
   */
  async updateLocation(
    eventId: string,
    data: UpdateLocationRequest,
    guestToken?: string
  ): Promise<UpdateLocationResponse> {
    if (USE_MOCK_DATA) {
      return mockData.helpers.mockApiSuccess(
        {
          success: true,
          location: {
            ...data,
            updatedAt: new Date().toISOString(),
          },
        },
        300 // 較短的延遲，因為位置更新頻繁
      );
    }

    const headers = guestToken ? { Authorization: `Bearer ${guestToken}` } : {};
    const response = await api.post(`/events/${eventId}/location`, data, { headers });
    return response.data;
  },

  /**
   * 標記到達
   * POST /events/:id/arrival
   * 需要 JWT 或 Guest Token
   */
  async markArrival(eventId: string, guestToken?: string): Promise<MarkArrivalResponse> {
    if (USE_MOCK_DATA) {
      return mockData.helpers.mockApiSuccess(
        {
          success: true,
          arrivalTime: new Date().toISOString(),
          status: 'ontime',
          lateMinutes: 0,
        },
        MOCK_DELAY
      );
    }

    const headers = guestToken ? { Authorization: `Bearer ${guestToken}` } : {};
    const response = await api.post(`/events/${eventId}/arrival`, {}, { headers });
    return response.data;
  },

  /**
   * 戳人
   * POST /events/:id/poke
   * 需要 JWT 或 Guest Token
   */
  async pokeUser(
    eventId: string,
    data: PokeRequest,
    guestToken?: string
  ): Promise<PokeResponse> {
    if (USE_MOCK_DATA) {
      // 模擬戳人次數增加
      const currentCount = Math.floor(Math.random() * 3) + 1;
      return mockData.helpers.mockApiSuccess(
        {
          success: true,
          pokeCount: currentCount,
          totalPokes: currentCount + Math.floor(Math.random() * 5),
        },
        MOCK_DELAY
      );
    }

    const headers = guestToken ? { Authorization: `Bearer ${guestToken}` } : {};
    const response = await api.post(`/events/${eventId}/poke`, data, { headers });
    return response.data;
  },

  /**
   * 取得戳人統計
   * GET /events/:id/pokes
   * 不需要認證
   */
  async getPokes(eventId: string) {
    if (USE_MOCK_DATA) {
      return mockData.helpers.mockApiSuccess(mockData.eventResult.pokes, MOCK_DELAY);
    }

    const response = await api.get(`/events/${eventId}/pokes`);
    return response.data;
  },

  /**
   * 取得聚會結果（排行榜）
   * GET /events/:id/result
   * 不需要認證
   */
  async getEventResult(eventId: string): Promise<GetEventResultResponse> {
    if (USE_MOCK_DATA) {
      return mockData.helpers.mockApiSuccess(mockData.responses.getEventResult, MOCK_DELAY);
    }

    const response = await api.get(`/events/${eventId}/result`);
    return response.data;
  },

  /**
   * 取得我的聚會列表
   * GET /events/my-events
   * 需要 JWT 認證
   */
  async getMyEvents(params?: {
    status?: 'upcoming' | 'ongoing' | 'ended' | 'all';
    limit?: number;
    offset?: number;
  }): Promise<GetMyEventsResponse> {
    if (USE_MOCK_DATA) {
      // 根據 status 過濾
      let filteredEvents = mockData.myEvents;
      if (params?.status && params.status !== 'all') {
        filteredEvents = mockData.myEvents.filter((e) => e.status === params.status);
      }

      // 簡單的分頁
      const limit = params?.limit || 20;
      const offset = params?.offset || 0;
      const paginatedEvents = filteredEvents.slice(offset, offset + limit);

      return mockData.helpers.mockApiSuccess(
        {
          events: paginatedEvents,
          total: filteredEvents.length,
          hasMore: offset + limit < filteredEvents.length,
        },
        MOCK_DELAY
      );
    }

    const response = await api.get('/events/my-events', { params });
    return response.data;
  },
};

// ============================================
// Users API
// ============================================

export const usersApi = {
  /**
   * 取得個人統計
   * GET /users/me/stats
   * 需要 JWT 認證
   */
  async getMyStats(): Promise<GetUserStatsResponse> {
    if (USE_MOCK_DATA) {
      return mockData.helpers.mockApiSuccess(mockData.responses.getUserStats, MOCK_DELAY);
    }

    const response = await api.get('/users/me/stats');
    return response.data;
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * 儲存 Guest Token 到 localStorage
 */
export function saveGuestToken(eventId: string, token: string): void {
  localStorage.setItem(`event_${eventId}_guestToken`, token);
}

/**
 * 取得 Guest Token from localStorage
 */
export function getGuestToken(eventId: string): string | null {
  return localStorage.getItem(`event_${eventId}_guestToken`);
}

/**
 * 清除 Guest Token
 */
export function clearGuestToken(eventId: string): void {
  localStorage.removeItem(`event_${eventId}_guestToken`);
}

/**
 * 檢查是否在時間窗內
 */
export function checkTimeWindow(
  eventDatetime: string,
  timeWindow: { before: number; after: number }
): boolean {
  const now = new Date();
  const eventTime = new Date(eventDatetime);
  const beforeMs = timeWindow.before * 60 * 1000;
  const afterMs = timeWindow.after * 60 * 1000;

  const startTime = new Date(eventTime.getTime() - beforeMs);
  const endTime = new Date(eventTime.getTime() + afterMs);

  return now >= startTime && now <= endTime;
}

/**
 * 計算兩點之間的距離（Haversine formula）
 * 回傳距離（公尺）
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // 地球半徑（公尺）
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 判斷是否移動超過閾值
 */
export function hasMoved(
  lastPos: { lat: number; lng: number } | null,
  currentPos: { lat: number; lng: number },
  threshold: number = 50 // 預設 50 公尺
): boolean {
  if (!lastPos) return true;
  const distance = calculateDistance(lastPos.lat, lastPos.lng, currentPos.lat, currentPos.lng);
  return distance >= threshold;
}

/**
 * 格式化相對時間（例如："5 分鐘前"）
 */
export function formatRelativeTime(isoString: string): string {
  const now = new Date();
  const time = new Date(isoString);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return '剛剛';
  if (diffMins < 60) return `${diffMins} 分鐘前`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} 小時前`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} 天前`;
}

/**
 * 格式化時間差（倒數計時）
 */
export function formatTimeRemaining(targetTime: string): {
  isOverdue: boolean;
  minutes: number;
  text: string;
} {
  const now = new Date();
  const target = new Date(targetTime);
  const diffMs = target.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMs < 0) {
    // 已過時間
    const overdueMins = Math.abs(diffMins);
    return {
      isOverdue: true,
      minutes: overdueMins,
      text: `已遲到 ${overdueMins} 分鐘`,
    };
  } else {
    // 尚未到時間
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    let text = '';
    if (hours > 0) {
      text = `距離集合還有 ${hours} 小時 ${mins} 分鐘`;
    } else {
      text = `距離集合還有 ${mins} 分鐘`;
    }

    return {
      isOverdue: false,
      minutes: diffMins,
      text,
    };
  }
}

/**
 * 取得倒數計時的顏色（根據剩餘時間）
 */
export function getCountdownColor(minutesRemaining: number, isOverdue: boolean): string {
  if (isOverdue) return '#EF4444'; // 紅色（已遲到）
  if (minutesRemaining <= 5) return '#F59E0B'; // 橘色（快到了）
  if (minutesRemaining <= 15) return '#FBBF24'; // 黃色（接近中）
  return '#10B981'; // 綠色（還早）
}

// ============================================
// Export
// ============================================

export default {
  events: eventsApi,
  users: usersApi,
  helpers: {
    saveGuestToken,
    getGuestToken,
    clearGuestToken,
    checkTimeWindow,
    calculateDistance,
    hasMoved,
    formatRelativeTime,
    formatTimeRemaining,
    getCountdownColor,
  },
};


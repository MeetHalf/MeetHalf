# Events API 規格文件

> **版本**: 1.0.0  
> **更新日期**: 2025-11-29  
> **用途**: 供後端實作參考

## 📋 目錄

- [概述](#概述)
- [資料模型](#資料模型)
- [API 端點](#api-端點)
- [Pusher 即時事件](#pusher-即時事件)
- [錯誤處理](#錯誤處理)
- [範例流程](#範例流程)

---

## 概述

Events API 提供聚會活動的完整生命週期管理，包括：
- 建立與管理聚會
- Guest 模式加入（無需註冊）
- 即時定位分享
- 到達標記與排行榜
- 互動功能（戳人）
- 歷史記錄與統計

### 技術架構

- **認證**: JWT (HttpOnly Cookie) + Guest Token (localStorage)
- **即時推送**: Pusher
- **地理位置**: Geolocation API
- **時間窗**: 集合前後 30 分鐘

---

## 資料模型

### Event

聚會活動主體

```typescript
interface Event {
  id: string;                    // 唯一識別碼
  title: string;                 // 聚會名稱
  datetime: string;              // ISO 8601 格式時間
  meetingPoint: {
    lat: number;                 // 集合點緯度
    lng: number;                 // 集合點經度
    name: string;                // 地點名稱
    address?: string;            // 地址
  };
  timeWindow: {
    before: number;              // 集合前幾分鐘開始追蹤 (default: 30)
    after: number;               // 集合後幾分鐘結束追蹤 (default: 30)
  };
  ownerId: number;               // 建立者 User ID
  status: 'upcoming' | 'ongoing' | 'ended';  // 狀態
  useMeetHalf: boolean;          // 是否使用 MeetHalf 功能（選用）
  createdAt: string;
  updatedAt: string;
}
```

### EventMember

聚會參與者

```typescript
interface EventMember {
  id: string;
  eventId: string;
  userId?: number;               // 登入使用者 ID (nullable)
  guestId?: string;              // Guest 臨時 ID (nullable)
  nickname: string;              // 顯示名稱
  isGuest: boolean;              // 是否為 Guest
  shareLocation: boolean;        // 是否分享位置
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
  };
  arrivalTime?: string;          // 到達時間 (ISO 8601)
  travelMode: 'driving' | 'transit' | 'walking' | 'bicycling';
  createdAt: string;
  updatedAt: string;
}
```

### PokeRecord

戳人記錄

```typescript
interface PokeRecord {
  id: string;
  eventId: string;
  fromMemberId: string;          // 戳人者 Member ID
  toMemberId: string;            // 被戳者 Member ID
  createdAt: string;
}
```

### EventResult

聚會結果（排行榜）

```typescript
interface EventResult {
  eventId: string;
  rankings: Array<{
    memberId: string;
    nickname: string;
    arrivalTime?: string;
    status: 'early' | 'ontime' | 'late' | 'absent';
    lateMinutes?: number;        // 遲到分鐘數
    rank: number;                // 排名
    pokeCount: number;           // 被戳次數
  }>;
  stats: {
    totalMembers: number;
    arrivedCount: number;
    lateCount: number;
    absentCount: number;
    avgArrivalTime?: string;
    earliestArrival?: {
      nickname: string;
      time: string;
    };
    latestArrival?: {
      nickname: string;
      time: string;
    };
    totalPokes: number;
  };
  pokes: {
    mostPoked: {
      nickname: string;
      count: number;
    };
    mostPoker: {
      nickname: string;
      count: number;
    };
  };
}
```

---

## API 端點

### 基本規範

- **Base URL**: `http://localhost:3000` (開發環境)
- **Content-Type**: `application/json`
- **認證**: 
  - 登入使用者: JWT Cookie
  - Guest: `Authorization: Bearer <guestToken>` header

---

### 1. 建立聚會

建立新的聚會活動

**端點**: `POST /events`

**認證**: 需要 JWT (登入使用者)

**Request Body**:
```json
{
  "title": "週五火鍋聚會",
  "datetime": "2025-12-01T19:00:00+08:00",
  "meetingPoint": {
    "lat": 25.033,
    "lng": 121.565,
    "name": "台北101",
    "address": "台北市信義區信義路五段7號"
  },
  "timeWindow": {
    "before": 30,
    "after": 30
  },
  "useMeetHalf": false
}
```

**Response** (201 Created):
```json
{
  "event": {
    "id": "evt_abc123",
    "title": "週五火鍋聚會",
    "datetime": "2025-12-01T19:00:00+08:00",
    "meetingPoint": {
      "lat": 25.033,
      "lng": 121.565,
      "name": "台北101",
      "address": "台北市信義區信義路五段7號"
    },
    "timeWindow": {
      "before": 30,
      "after": 30
    },
    "ownerId": 1,
    "status": "upcoming",
    "useMeetHalf": false,
    "createdAt": "2025-11-29T10:00:00Z",
    "updatedAt": "2025-11-29T10:00:00Z"
  },
  "shareUrl": "https://meethalf.app/events/evt_abc123"
}
```

**cURL 範例**:
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "週五火鍋聚會",
    "datetime": "2025-12-01T19:00:00+08:00",
    "meetingPoint": {
      "lat": 25.033,
      "lng": 121.565,
      "name": "台北101"
    }
  }'
```

---

### 2. 取得聚會資訊

取得特定聚會的詳細資訊

**端點**: `GET /events/:id`

**認證**: 不需要（公開連結）

**Response** (200 OK):
```json
{
  "event": {
    "id": "evt_abc123",
    "title": "週五火鍋聚會",
    "datetime": "2025-12-01T19:00:00+08:00",
    "meetingPoint": {
      "lat": 25.033,
      "lng": 121.565,
      "name": "台北101",
      "address": "台北市信義區信義路五段7號"
    },
    "timeWindow": {
      "before": 30,
      "after": 30
    },
    "status": "ongoing",
    "members": [
      {
        "id": "mem_123",
        "nickname": "小明",
        "isGuest": false,
        "shareLocation": true,
        "currentLocation": {
          "lat": 25.040,
          "lng": 121.560,
          "updatedAt": "2025-12-01T18:55:00Z"
        },
        "arrivalTime": "2025-12-01T18:55:00Z",
        "travelMode": "transit"
      },
      {
        "id": "mem_124",
        "nickname": "小華",
        "isGuest": true,
        "shareLocation": true,
        "currentLocation": {
          "lat": 25.045,
          "lng": 121.555,
          "updatedAt": "2025-12-01T18:58:00Z"
        },
        "travelMode": "driving"
      }
    ],
    "createdAt": "2025-11-29T10:00:00Z"
  }
}
```

**cURL 範例**:
```bash
curl http://localhost:3000/events/evt_abc123
```

---

### 3. 加入聚會 (Guest 模式)

Guest 使用者透過暱稱加入聚會

**端點**: `POST /events/:id/join`

**認證**: 不需要（公開）

**Request Body**:
```json
{
  "nickname": "訪客小明",
  "shareLocation": true,
  "travelMode": "transit"
}
```

**Response** (200 OK):
```json
{
  "member": {
    "id": "mem_guest_xyz",
    "eventId": "evt_abc123",
    "guestId": "guest_xyz789",
    "nickname": "訪客小明",
    "isGuest": true,
    "shareLocation": true,
    "travelMode": "transit",
    "createdAt": "2025-12-01T18:30:00Z"
  },
  "guestToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**說明**:
- `guestToken` 需要儲存在 localStorage
- 後續請求需要在 Authorization header 帶上此 token

**cURL 範例**:
```bash
curl -X POST http://localhost:3000/events/evt_abc123/join \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "訪客小明",
    "shareLocation": true
  }'
```

---

### 4. 更新位置

更新成員的即時位置

**端點**: `POST /events/:id/location`

**認證**: JWT 或 Guest Token

**頻率限制**: 建議前端只在移動超過 50m 時更新

**Request Body**:
```json
{
  "lat": 25.040,
  "lng": 121.560
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "location": {
    "lat": 25.040,
    "lng": 121.560,
    "updatedAt": "2025-12-01T18:55:30Z"
  }
}
```

**說明**:
- 後端會透過 Pusher 推送 `location-update` 事件給所有成員
- 只在時間窗內接受位置更新

**cURL 範例**:
```bash
curl -X POST http://localhost:3000/events/evt_abc123/location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <guestToken>" \
  -d '{
    "lat": 25.040,
    "lng": 121.560
  }'
```

---

### 5. 標記到達

成員點擊「我到了」按鈕

**端點**: `POST /events/:id/arrival`

**認證**: JWT 或 Guest Token

**Request Body**: 無

**Response** (200 OK):
```json
{
  "success": true,
  "arrivalTime": "2025-12-01T18:55:00Z",
  "status": "ontime",
  "lateMinutes": 0
}
```

**說明**:
- 後端計算是否遲到（相對於 event.datetime）
- 透過 Pusher 推送 `member-arrived` 事件

**cURL 範例**:
```bash
curl -X POST http://localhost:3000/events/evt_abc123/arrival \
  -H "Authorization: Bearer <guestToken>"
```

---

### 6. 戳人

戳遲到的成員

**端點**: `POST /events/:id/poke`

**認證**: JWT 或 Guest Token

**限制**: 每人最多戳同一人 3 次

**Request Body**:
```json
{
  "targetMemberId": "mem_124"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "pokeCount": 1,
  "totalPokes": 5
}
```

**說明**:
- 後端檢查戳人限制
- 透過 Pusher 推送 `poke` 事件給被戳者

**cURL 範例**:
```bash
curl -X POST http://localhost:3000/events/evt_abc123/poke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <guestToken>" \
  -d '{
    "targetMemberId": "mem_124"
  }'
```

---

### 7. 取得戳人統計

取得聚會的戳人記錄

**端點**: `GET /events/:id/pokes`

**認證**: 不需要

**Response** (200 OK):
```json
{
  "pokes": [
    {
      "memberId": "mem_124",
      "nickname": "小華",
      "pokeCount": 5,
      "pokedBy": [
        {
          "fromMemberId": "mem_123",
          "nickname": "小明",
          "count": 2
        }
      ]
    }
  ],
  "mostPoked": {
    "memberId": "mem_124",
    "nickname": "小華",
    "count": 5
  },
  "mostPoker": {
    "memberId": "mem_123",
    "nickname": "小明",
    "count": 3
  }
}
```

**cURL 範例**:
```bash
curl http://localhost:3000/events/evt_abc123/pokes
```

---

### 8. 取得聚會結果

取得聚會結束後的排行榜與統計

**端點**: `GET /events/:id/result`

**認證**: 不需要

**Response** (200 OK):
```json
{
  "result": {
    "eventId": "evt_abc123",
    "rankings": [
      {
        "memberId": "mem_123",
        "nickname": "小明",
        "arrivalTime": "2025-12-01T18:55:00Z",
        "status": "early",
        "lateMinutes": 0,
        "rank": 1,
        "pokeCount": 0
      },
      {
        "memberId": "mem_124",
        "nickname": "小華",
        "arrivalTime": "2025-12-01T18:58:00Z",
        "status": "ontime",
        "lateMinutes": 0,
        "rank": 2,
        "pokeCount": 0
      },
      {
        "memberId": "mem_125",
        "nickname": "小美",
        "arrivalTime": "2025-12-01T19:05:00Z",
        "status": "late",
        "lateMinutes": 5,
        "rank": 3,
        "pokeCount": 2
      },
      {
        "memberId": "mem_126",
        "nickname": "小王",
        "status": "absent",
        "rank": 4,
        "pokeCount": 5
      }
    ],
    "stats": {
      "totalMembers": 4,
      "arrivedCount": 3,
      "lateCount": 1,
      "absentCount": 1,
      "avgArrivalTime": "2025-12-01T18:59:20Z",
      "earliestArrival": {
        "nickname": "小明",
        "time": "2025-12-01T18:55:00Z"
      },
      "latestArrival": {
        "nickname": "小美",
        "time": "2025-12-01T19:05:00Z"
      },
      "totalPokes": 7
    },
    "pokes": {
      "mostPoked": {
        "nickname": "小王",
        "count": 5
      },
      "mostPoker": {
        "nickname": "小明",
        "count": 3
      }
    }
  }
}
```

**cURL 範例**:
```bash
curl http://localhost:3000/events/evt_abc123/result
```

---

### 9. 取得我的聚會列表

取得當前使用者的所有聚會（進行中 + 歷史）

**端點**: `GET /events/my-events`

**認證**: 需要 JWT

**Query Parameters**:
- `status`: `upcoming` | `ongoing` | `ended` | `all` (default: `all`)
- `limit`: number (default: 20)
- `offset`: number (default: 0)

**Response** (200 OK):
```json
{
  "events": [
    {
      "id": "evt_abc123",
      "title": "週五火鍋聚會",
      "datetime": "2025-12-01T19:00:00+08:00",
      "status": "ended",
      "memberCount": 5,
      "myStatus": "ontime",
      "myRank": 2
    },
    {
      "id": "evt_def456",
      "title": "週日電影",
      "datetime": "2025-12-05T14:00:00+08:00",
      "status": "upcoming",
      "memberCount": 3
    }
  ],
  "total": 2,
  "hasMore": false
}
```

**cURL 範例**:
```bash
curl http://localhost:3000/events/my-events?status=ongoing \
  -b cookies.txt
```

---

### 10. 取得個人統計

取得使用者的整體統計數據

**端點**: `GET /users/me/stats`

**認證**: 需要 JWT

**Response** (200 OK):
```json
{
  "stats": {
    "totalEvents": 15,
    "ontimeCount": 12,
    "lateCount": 3,
    "absentCount": 0,
    "avgLateMinutes": 5.2,
    "totalPokeReceived": 2,
    "totalPokeSent": 8,
    "ontimeRate": 0.80,
    "bestRank": 1,
    "worstRank": 10
  }
}
```

**cURL 範例**:
```bash
curl http://localhost:3000/users/me/stats \
  -b cookies.txt
```

---

## Pusher 即時事件

### Channel 命名

每個聚會有獨立的 channel:
```
event-{eventId}
```

例如: `event-evt_abc123`

### 事件類型

#### 1. location-update

成員位置更新

**Event Name**: `location-update`

**Payload**:
```json
{
  "memberId": "mem_123",
  "nickname": "小明",
  "lat": 25.040,
  "lng": 121.560,
  "timestamp": "2025-12-01T18:55:30Z"
}
```

**前端處理**:
```typescript
channel.bind('location-update', (data) => {
  updateMemberMarker(data.memberId, data.lat, data.lng);
});
```

---

#### 2. member-arrived

成員到達通知

**Event Name**: `member-arrived`

**Payload**:
```json
{
  "memberId": "mem_123",
  "nickname": "小明",
  "arrivalTime": "2025-12-01T18:55:00Z",
  "status": "ontime"
}
```

**前端處理**:
```typescript
channel.bind('member-arrived', (data) => {
  showToast(`${data.nickname} 已到達！`);
  updateMemberStatus(data.memberId, 'arrived');
});
```

---

#### 3. poke

戳人通知

**Event Name**: `poke`

**Payload**:
```json
{
  "fromMemberId": "mem_123",
  "fromNickname": "小明",
  "toMemberId": "mem_124",
  "toNickname": "小華",
  "count": 2
}
```

**前端處理**:
```typescript
channel.bind('poke', (data) => {
  if (data.toMemberId === currentMemberId) {
    showToast(`${data.fromNickname} 戳了你！😂`);
    playVibration();
  }
  updatePokeCount(data.toMemberId, data.count);
});
```

---

#### 4. event-ended

聚會結束通知

**Event Name**: `event-ended`

**Payload**:
```json
{
  "eventId": "evt_abc123",
  "endedAt": "2025-12-01T19:30:00Z"
}
```

**前端處理**:
```typescript
channel.bind('event-ended', (data) => {
  setTimeout(() => {
    setShowResultPopup(true);
  }, 5000); // 5 秒後顯示結果
});
```

---

## 錯誤處理

### 統一錯誤格式

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}  // 選用，額外資訊
  }
}
```

### 常見錯誤碼

| HTTP Status | Error Code | 說明 |
|-------------|------------|------|
| 400 | INVALID_REQUEST | 請求格式錯誤 |
| 400 | INVALID_TIME_WINDOW | 不在時間窗內 |
| 400 | POKE_LIMIT_EXCEEDED | 超過戳人次數限制 |
| 401 | UNAUTHORIZED | 未認證 |
| 401 | INVALID_GUEST_TOKEN | Guest token 無效 |
| 403 | FORBIDDEN | 無權限 |
| 404 | EVENT_NOT_FOUND | 聚會不存在 |
| 404 | MEMBER_NOT_FOUND | 成員不存在 |
| 409 | ALREADY_JOINED | 已經加入此聚會 |
| 409 | ALREADY_ARRIVED | 已經標記到達 |
| 422 | VALIDATION_ERROR | 資料驗證失敗 |
| 429 | RATE_LIMIT_EXCEEDED | 超過速率限制 |
| 500 | INTERNAL_ERROR | 伺服器錯誤 |

### 錯誤範例

```json
{
  "error": {
    "code": "POKE_LIMIT_EXCEEDED",
    "message": "你已經戳了此人 3 次，無法再戳",
    "details": {
      "currentCount": 3,
      "maxAllowed": 3
    }
  }
}
```

---

## 範例流程

### 完整使用者流程

#### 1. 主揪建立聚會

```bash
# 登入
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "host@example.com", "password": "password"}'

# 建立聚會
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "週五火鍋",
    "datetime": "2025-12-01T19:00:00+08:00",
    "meetingPoint": {
      "lat": 25.033,
      "lng": 121.565,
      "name": "台北101"
    }
  }'

# 得到 shareUrl: https://meethalf.app/events/evt_abc123
```

#### 2. Guest 加入聚會

```bash
# 開啟連結，取得聚會資訊
curl http://localhost:3000/events/evt_abc123

# Guest 加入
curl -X POST http://localhost:3000/events/evt_abc123/join \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "訪客小明",
    "shareLocation": true
  }'

# 得到 guestToken，存入 localStorage
```

#### 3. 即時定位分享

```javascript
// 前端程式碼
const watchId = navigator.geolocation.watchPosition(
  async (position) => {
    const { latitude, longitude } = position.coords;
    
    // 只在移動超過 50m 時更新
    if (hasMoved(lastPosition, { latitude, longitude }, 50)) {
      await fetch(`/events/${eventId}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${guestToken}`
        },
        body: JSON.stringify({ lat: latitude, lng: longitude })
      });
    }
  }
);
```

#### 4. 到達與戳人

```bash
# 小明到達
curl -X POST http://localhost:3000/events/evt_abc123/arrival \
  -H "Authorization: Bearer <guestToken>"

# 小明戳遲到的小華
curl -X POST http://localhost:3000/events/evt_abc123/poke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <guestToken>" \
  -d '{"targetMemberId": "mem_124"}'
```

#### 5. 聚會結束，查看排行榜

```bash
# 取得結果
curl http://localhost:3000/events/evt_abc123/result
```

---

## 開發建議

### 時間窗邏輯

前端應該在進入聚會頁面時，立即檢查是否在時間窗內：

```typescript
function checkTimeWindow(eventDatetime: string, timeWindow: { before: number; after: number }): boolean {
  const now = new Date();
  const eventTime = new Date(eventDatetime);
  const beforeMs = timeWindow.before * 60 * 1000;
  const afterMs = timeWindow.after * 60 * 1000;
  
  const startTime = new Date(eventTime.getTime() - beforeMs);
  const endTime = new Date(eventTime.getTime() + afterMs);
  
  return now >= startTime && now <= endTime;
}
```

### Pusher 初始化

```typescript
const pusher = new Pusher(VITE_PUSHER_KEY, {
  cluster: VITE_PUSHER_CLUSTER,
  authEndpoint: '/pusher/auth', // 如果需要私有 channel
});

const channel = pusher.subscribe(`event-${eventId}`);

// 綁定所有事件
channel.bind('location-update', handleLocationUpdate);
channel.bind('member-arrived', handleMemberArrived);
channel.bind('poke', handlePoke);
channel.bind('event-ended', handleEventEnded);
```

### Guest Token 管理

```typescript
// 加入聚會後儲存 token
localStorage.setItem(`event_${eventId}_guestToken`, guestToken);

// 之後請求時讀取
const guestToken = localStorage.getItem(`event_${eventId}_guestToken`);

// API 請求
fetch(url, {
  headers: {
    'Authorization': `Bearer ${guestToken}`
  }
});
```

---

## TODO & 待討論

- [ ] Guest token 的有效期限？（建議 7 天）
- [ ] 位置更新的頻率限制？（建議最快 10 秒一次）
- [ ] Pusher 是否需要 private channel？（目前規劃用 public）
- [ ] 聚會結束的判定時機？（時間到後 30 分鐘自動結束？）
- [ ] 是否需要聚會刪除功能？（主揪權限）
- [ ] 離線成員如何處理？（顯示灰色但保留在成員列表）
- [ ] 位置精確度要求？（是否需要檢查 accuracy < 50m？）

---

**版本歷史**:
- v1.0.0 (2025-11-29): 初版完成



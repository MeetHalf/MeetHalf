# 後端需求文件 - Events 聚會追蹤功能

> **目的**: 說明前端需要的後端 API 和資料庫 Schema 變更  
> **日期**: 2025-11-29  
> **狀態**: 待實作

---

## 📋 目錄

1. [資料庫 Schema 變更](#資料庫-schema-變更)
2. [API 端點需求](#api-端點需求)
3. [Pusher 即時推送需求](#pusher-即時推送需求)
4. [參考文件](#參考文件)

---

## 資料庫 Schema 變更

### 1. Event 表新增欄位

```prisma
model Event {
  id              Int      @id @default(autoincrement())
  name            String
  ownerName       String
  
  // ✅ 新增欄位
  datetime        DateTime                    // 聚會時間
  meetingPointLat Float?                      // 集合點緯度（可選）
  meetingPointLng Float?                      // 集合點經度（可選）
  meetingPointName String?                    // 地點名稱（可選）
  meetingPointAddress String?                 // 地址（可選）
  timeWindowBefore Int     @default(30)       // 前 30 分鐘
  timeWindowAfter  Int     @default(30)       // 後 30 分鐘
  status          String   @default("upcoming") // upcoming, ongoing, ended
  useMeetHalf     Boolean  @default(false)    // 是否使用 MeetHalf
  groupId         Int?                        // 關聯到朋友群組（可選）
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  members         Member[]
  pokeRecords     PokeRecord[]                // 新增關聯
  group           Group?   @relation(fields: [groupId], references: [id])
  
  @@index([ownerName])
  @@index([groupId])
  @@index([status])
}
```

### 2. Member 表新增欄位

```prisma
model Member {
  id              Int      @id @default(autoincrement())
  username        String?
  eventId         Int
  lat             Float?
  lng             Float?
  address         String?
  travelMode      String?  @default("driving")
  nickname        String?
  
  // ✅ 新增欄位
  shareLocation   Boolean  @default(false)    // 是否分享位置
  arrivalTime     DateTime?                   // 到達時間（可選）
  
  event           Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([eventId])
  @@index([username])
}
```

**注意**：
- 位置資訊使用現有的 `lat` 和 `lng` 欄位（不需要額外的 `currentLat/currentLng`）
- 位置更新時直接更新 `lat` 和 `lng`，並更新 `updatedAt`
- 移除了 `guestId`（Guest 功能可能用其他方式實作，或使用 `username` 欄位）

### 3. 新增 Group 表（朋友群組）

```prisma
model Group {
  id          Int      @id @default(autoincrement())
  name        String                          // 群組名稱，例如「大學同學」
  ownerId     String                          // 建立者 ID（User.id 或 username）
  members     User[]                          // 群組成員（多對多關聯）
  events      Event[]                         // 關聯的所有聚會
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([ownerId])
}
```

**說明**：
- Group 用於統計群組的聚會歷史
- `members` 使用 Prisma 的 many-to-many 關聯（自動建立中間表 `_GroupToUser`）
- `ownerId` 使用 String 類型（對應 User.id 轉為字串，或使用 username）
- Event 可以選擇性關聯到 Group（`groupId` 可選）

**注意**：
- `ownerId` 為 String 類型，需要與後端確認：
  - 是否為 `User.id.toString()`？
  - 或使用 `User.name` / `username` 作為識別？
- `members User[]` 需要 User model 也有對應的關聯：
  ```prisma
  model User {
    // ... existing fields
    groups Group[]  // 新增這行
  }
  ```

### 4. 新增 PokeRecord 表

```prisma
model PokeRecord {
  id            String   @id @default(cuid())
  eventId       Int                           // 關聯到 Event
  fromMemberId  Int                           // 戳人者的 Member ID
  toMemberId    Int                           // 被戳者的 Member ID
  createdAt     DateTime @default(now())      // 戳人時間
  
  event         Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  @@index([eventId])
  @@index([toMemberId])  // 方便查詢「誰被戳最多次」
  @@unique([eventId, fromMemberId, toMemberId, createdAt]) // 防止重複戳（可選）
}
```

### 5. Migration SQL 範例

```sql
-- 1. Event 表新增欄位
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "datetime" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "meetingPointLat" DOUBLE PRECISION;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "meetingPointLng" DOUBLE PRECISION;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "meetingPointName" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "meetingPointAddress" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "timeWindowBefore" INTEGER DEFAULT 30;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "timeWindowAfter" INTEGER DEFAULT 30;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'upcoming';
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "useMeetHalf" BOOLEAN DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "groupId" INTEGER;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- 2. Member 表新增欄位
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "shareLocation" BOOLEAN DEFAULT false;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "arrivalTime" TIMESTAMP(3);

-- 3. 建立 Group 表
CREATE TABLE IF NOT EXISTS "Group" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. 建立 Group 和 User 的中間表（many-to-many）
CREATE TABLE IF NOT EXISTS "_GroupToUser" (
  "A" INTEGER NOT NULL REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "B" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY ("A", "B")
);

CREATE INDEX IF NOT EXISTS "_GroupToUser_B_index" ON "_GroupToUser"("B");

-- 5. 新增索引
CREATE INDEX IF NOT EXISTS "Event_status_idx" ON "Event"("status");
CREATE INDEX IF NOT EXISTS "Event_groupId_idx" ON "Event"("groupId");
CREATE INDEX IF NOT EXISTS "Group_ownerId_idx" ON "Group"("ownerId");

-- 5. 建立 PokeRecord 表
CREATE TABLE IF NOT EXISTS "PokeRecord" (
  "id" TEXT NOT NULL,
  "eventId" INTEGER NOT NULL,
  "fromMemberId" INTEGER NOT NULL,
  "toMemberId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PokeRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PokeRecord_eventId_idx" ON "PokeRecord"("eventId");
CREATE INDEX IF NOT EXISTS "PokeRecord_toMemberId_idx" ON "PokeRecord"("toMemberId");

-- 6. 新增外鍵約束
ALTER TABLE "Event" ADD CONSTRAINT "Event_groupId_fkey" 
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PokeRecord" ADD CONSTRAINT "PokeRecord_eventId_fkey" 
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## API 端點需求

### 1. 建立聚會

**端點**: `POST /events`

**Request Body**:
```json
{
  "title": "週五火鍋",
  "datetime": "2025-12-06T19:00:00+08:00",
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

**Response**:
```json
{
  "event": {
    "id": "evt_abc123",
    "title": "週五火鍋",
    "datetime": "2025-12-06T19:00:00+08:00",
    "meetingPoint": { ... },
    "status": "upcoming",
    ...
  },
  "shareUrl": "https://yourapp.com/gatherings/evt_abc123"
}
```

---

### 2. 取得聚會資訊

**端點**: `GET /events/:id`

**說明**: 公開端點，不需要認證（用於分享連結）

**Response**:
```json
{
  "event": {
    "id": "evt_abc123",
    "title": "週五火鍋",
    "datetime": "2025-12-06T19:00:00+08:00",
    "meetingPoint": { ... },
    "members": [
      {
        "id": "mem_1",
        "nickname": "小明",
        "shareLocation": true,
        "lat": 25.040,
        "lng": 121.560,
        "updatedAt": "2025-12-06T18:55:30Z",
        "arrivalTime": "2025-12-06T18:55:00Z"
      }
    ]
  }
}
```

---

### 3. Guest 加入聚會

**端點**: `POST /events/:id/join`

**Request Body**:
```json
{
  "nickname": "訪客小美",
  "shareLocation": true,
  "travelMode": "transit"
}
```

**Response**:
```json
{
  "member": {
    "id": "mem_guest_123",
    "nickname": "訪客小美",
    "username": "guest_abc123",  // Guest identifier 存在 username 欄位
    "shareLocation": true,
    ...
  },
  "guestToken": "jwt_token_for_guest"
}
```

**說明**: 
- 不需要認證
- 回傳 `guestToken` 用於後續 API 呼叫
- `guestToken` 存於 localStorage
- Guest 的 identifier 存在 `username` 欄位（例如：`guest_abc123`）

---

### 4. 更新位置

**端點**: `POST /events/:id/location`

**認證**: JWT 或 Guest Token (Header: `Authorization: Bearer <token>`)

**Request Body**:
```json
{
  "lat": 25.040,
  "lng": 121.560
}
```

**說明**:
- 只在時間窗內接受更新
- 直接更新 Member 的 `lat` 和 `lng` 欄位，同時更新 `updatedAt`
- 觸發 Pusher 事件 `location-update`

---

### 5. 標記到達

**端點**: `POST /events/:id/arrival`

**認證**: JWT 或 Guest Token

**Response**:
```json
{
  "success": true,
  "arrivalTime": "2025-12-06T18:55:00Z",
  "status": "ontime",  // early, ontime, late
  "lateMinutes": 0
}
```

**說明**:
- 寫入 `arrivalTime`
- 根據 `event.datetime` 計算是否遲到
- 觸發 Pusher 事件 `member-arrived`

---

### 6. 戳人

**端點**: `POST /events/:id/poke`

**認證**: JWT 或 Guest Token

**Request Body**:
```json
{
  "targetMemberId": "mem_2"
}
```

**Response**:
```json
{
  "success": true,
  "pokeCount": 1,      // 我戳此人的次數
  "totalPokes": 3       // 此人被戳的總次數
}
```

**說明**:
- 限制：同一人對同一人最多戳 3 次
- 建立 PokeRecord
- 觸發 Pusher 事件 `poke`

---

### 7. 取得戳人統計

**端點**: `GET /events/:id/pokes`

**Response**:
```json
{
  "mostPoked": {
    "nickname": "小王",
    "count": 5
  },
  "mostPoker": {
    "nickname": "小明",
    "count": 3
  }
}
```

---

### 8. 取得聚會結果（排行榜）

**端點**: `GET /events/:id/result`

**說明**: 公開端點，聚會結束後可查看

**Response**:
```json
{
  "result": {
    "eventId": "evt_abc123",
    "rankings": [
      {
        "memberId": "mem_1",
        "nickname": "小明",
        "arrivalTime": "2025-12-06T18:55:00Z",
        "status": "early",
        "lateMinutes": 0,
        "rank": 1,
        "pokeCount": 0
      },
      ...
    ],
    "stats": {
      "totalMembers": 5,
      "arrivedCount": 4,
      "lateCount": 2,
      "absentCount": 1,
      ...
    }
  }
}
```

---

### 9. 取得我的聚會列表

**端點**: `GET /events/my-events`

**認證**: JWT (需要登入)

**Query Params**:
- `status`: `upcoming` | `ongoing` | `ended` | `all` (default: `all`)
- `limit`: number (default: 20)
- `offset`: number (default: 0)

**Response**:
```json
{
  "events": [
    {
      "id": "evt_abc123",
      "title": "週五火鍋",
      "datetime": "2025-12-06T19:00:00+08:00",
      "status": "ongoing",
      "memberCount": 5,
      "myStatus": "ontime",
      "myRank": 2
    }
  ],
  "total": 10,
  "hasMore": false
}
```

---

### 10. 取得個人統計

**端點**: `GET /users/me/stats`

**認證**: JWT (需要登入)

**Response**:
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

---

## Pusher 即時推送需求

### Channel 命名規則

```
event-{eventId}
```

例如：`event-evt_abc123`

### 事件列表

#### 1. location-update

**觸發時機**: 成員更新位置時

**Payload**:
```json
{
  "memberId": "mem_1",
  "nickname": "小明",
  "lat": 25.040,
  "lng": 121.560,
  "timestamp": "2025-12-06T18:55:30Z"
}
```

---

#### 2. member-arrived

**觸發時機**: 成員標記到達時

**Payload**:
```json
{
  "memberId": "mem_1",
  "nickname": "小明",
  "arrivalTime": "2025-12-06T18:55:00Z",
  "status": "ontime"  // early, ontime, late
}
```

---

#### 3. poke

**觸發時機**: 有人戳人時

**Payload**:
```json
{
  "fromMemberId": "mem_1",
  "fromNickname": "小明",
  "toMemberId": "mem_2",
  "toNickname": "小華",
  "count": 1  // 總共戳了幾次
}
```

---

#### 4. event-ended

**觸發時機**: 聚會結束時（時間超過 `datetime + timeWindowAfter`）

**Payload**:
```json
{
  "eventId": "evt_abc123",
  "endedAt": "2025-12-06T19:30:00Z"
}
```

---

## 實作優先順序

### Phase 1: 核心功能（必須）
1. ✅ Schema 變更（Event, Member 新增欄位）
2. ✅ `POST /events` - 建立聚會
3. ✅ `GET /events/:id` - 取得聚會資訊
4. ✅ `POST /events/:id/join` - Guest 加入
5. ✅ `POST /events/:id/location` - 更新位置
6. ✅ Pusher `location-update` 事件

### Phase 2: 到達與互動（重要）
7. ✅ `POST /events/:id/arrival` - 標記到達
8. ✅ `POST /events/:id/poke` - 戳人
9. ✅ Pusher `member-arrived`, `poke` 事件

### Phase 3: 統計與結果（加分）
10. ✅ `GET /events/:id/result` - 排行榜
11. ✅ `GET /events/my-events` - 我的聚會
12. ✅ `GET /users/me/stats` - 個人統計
13. ✅ Pusher `event-ended` 事件

---

## 參考文件

- **完整 API 規格**: `EVENTS_API_SPEC.md`
- **前端 TypeScript 型別**: `frontend/src/types/events.ts`
- **Mock Data 範例**: `frontend/src/mocks/eventData.ts`

---

## 注意事項

### 時間窗檢查

所有位置更新 API 都需要檢查是否在時間窗內：

```typescript
const now = new Date();
const eventTime = new Date(event.datetime);
const startTime = new Date(eventTime.getTime() - event.timeWindowBefore * 60 * 1000);
const endTime = new Date(eventTime.getTime() + event.timeWindowAfter * 60 * 1000);

if (now < startTime || now > endTime) {
  return res.status(400).json({ 
    code: 'OUTSIDE_TIME_WINDOW',
    message: '位置更新只能在時間窗內進行' 
  });
}
```

### Guest Token 驗證

Guest Token 應該：
- 使用 JWT 格式
- 包含 `memberId` 和 `eventId`
- 有適當的過期時間（例如 24 小時）
- 在 `POST /events/:id/join` 時發放

**注意**：由於 Member 表沒有 `guestId` 欄位，Guest 身份可以：
- 使用 `username` 欄位儲存 guest identifier（例如：`guest_abc123`）
- 或使用 JWT token 中的 `memberId` 來識別

### 戳人限制

同一人對同一人最多戳 3 次：

```typescript
const pokeCount = await prisma.pokeRecord.count({
  where: {
    eventId,
    fromMemberId: currentMember.id,
    toMemberId: targetMember.id
  }
});

if (pokeCount >= 3) {
  return res.status(400).json({
    code: 'POKE_LIMIT_EXCEEDED',
    message: '已達戳人上限（3次）'
  });
}
```

---

---

## Schema 調整說明

### 與原設計的差異

1. **Event.meetingPoint 欄位改為可選**
   - `meetingPointLat`, `meetingPointLng`, `meetingPointName` 都是 `Float?` 或 `String?`
   - 允許建立聚會時不設定地點（例如：使用 MeetHalf 計算）

2. **Member 表簡化**
   - 移除了 `guestId` 欄位（Guest 身份可用 `username` 欄位或 JWT token 識別）
   - 移除了 `currentLat`, `currentLng`, `locationUpdatedAt`
   - 位置資訊直接使用現有的 `lat` 和 `lng` 欄位
   - 移除了 `isOffline` 欄位

3. **新增 Group 表**
   - 用於朋友群組功能
   - Event 可以選擇性關聯到 Group（`groupId` 可選）
   - 用於統計群組的聚會歷史

### 位置更新邏輯

由於移除了 `currentLat/currentLng`，位置更新時：
- 直接更新 Member 的 `lat` 和 `lng` 欄位
- 同時更新 `updatedAt` 欄位
- 前端可以透過 `updatedAt` 判斷位置是否為最新

---

## 問題與討論

如有任何問題或需要澄清的地方，請隨時提出！

**前端開發者**: Tina  
**後端開發者**: Bowen
**預計完成時間**: [待討論]


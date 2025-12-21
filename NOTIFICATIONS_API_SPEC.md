# Notifications API Specification

## Overview
通知系統 API，統一管理所有類型的通知（好友邀請、訊息、活動邀請、戳人等）。

## Base URL
```
/notifications
```

## Authentication
所有 API 需要使用 JWT 認證 (Cookie 或 Header)

---

## Endpoints

### 1. 取得通知列表
```http
GET /notifications?read=false&limit=50
```

**Query Parameters:**
- `read` (optional): `true` (已讀) 或 `false` (未讀)，不傳則返回全部
- `limit` (optional): 返回數量，預設 50，最大 100

**Response (200):**
```json
{
  "notifications": [
    {
      "id": 1,
      "userId": "user123",
      "type": "FRIEND_REQUEST",
      "title": "好友邀請",
      "body": "John Doe 想加你為好友",
      "data": {
        "requestId": 5,
        "fromUserId": "user456",
        "fromUserName": "John Doe"
      },
      "read": false,
      "createdAt": "2025-12-21T10:00:00.000Z"
    },
    {
      "id": 2,
      "userId": "user123",
      "type": "NEW_MESSAGE",
      "title": "來自 Jane Smith 的訊息",
      "body": "Hey, how are you?",
      "data": {
        "senderId": "user789",
        "messageId": 42
      },
      "read": false,
      "createdAt": "2025-12-21T09:30:00.000Z"
    }
  ]
}
```

---

### 2. 標記通知為已讀
```http
PUT /notifications/:id/read
```

**Path Parameters:**
- `id`: 通知 ID

**Response (200):**
```json
{
  "success": true
}
```

**Errors:**
- `404 NOT_FOUND`: 通知不存在
- `403 FORBIDDEN`: 無權限操作此通知

---

### 3. 全部標記為已讀
```http
PUT /notifications/read-all
```

**Response (200):**
```json
{
  "success": true
}
```

---

### 4. 刪除通知
```http
DELETE /notifications/:id
```

**Path Parameters:**
- `id`: 通知 ID

**Response (200):**
```json
{
  "success": true
}
```

**Errors:**
- `404 NOT_FOUND`: 通知不存在
- `403 FORBIDDEN`: 無權限刪除此通知

---

### 5. 取得未讀數量
```http
GET /notifications/unread-count
```

**Response (200):**
```json
{
  "count": 12
}
```

---

## Notification Types

### FRIEND_REQUEST (好友邀請)
```json
{
  "type": "FRIEND_REQUEST",
  "title": "好友邀請",
  "body": "{name} 想加你為好友",
  "data": {
    "requestId": 5,
    "fromUserId": "user456",
    "fromUserName": "John Doe"
  }
}
```

### FRIEND_ACCEPTED (好友邀請已接受)
```json
{
  "type": "FRIEND_ACCEPTED",
  "title": "好友請求已接受",
  "body": "{name} 接受了你的好友邀請",
  "data": {
    "friendId": "user123",
    "friendName": "Jane Smith"
  }
}
```

### NEW_MESSAGE (新訊息)
```json
{
  "type": "NEW_MESSAGE",
  "title": "來自 {name} 的訊息",
  "body": "訊息內容...",
  "data": {
    "senderId": "user789",
    "messageId": 42,
    "groupId": null // 或群組 ID
  }
}
```

### EVENT_INVITE (活動邀請)
```json
{
  "type": "EVENT_INVITE",
  "title": "活動邀請",
  "body": "{name} 邀請你參加 {eventName}",
  "data": {
    "eventId": 10,
    "inviterId": "user456"
  }
}
```

### POKE (戳人)
```json
{
  "type": "POKE",
  "title": "有人戳你",
  "body": "{name} 戳了你一下",
  "data": {
    "eventId": 10,
    "fromMemberId": 25
  }
}
```

### EVENT_UPDATE (活動更新)
```json
{
  "type": "EVENT_UPDATE",
  "title": "活動更新",
  "body": "{eventName} 的時間已更改",
  "data": {
    "eventId": 10,
    "changeType": "time"
  }
}
```

---

## Real-time Events (Pusher)

### Notification Channel: `notification-{userId}`

**Event: `new-notification`**
```json
{
  "id": 1,
  "userId": "user123",
  "type": "FRIEND_REQUEST",
  "title": "好友邀請",
  "body": "John Doe 想加你為好友",
  "data": { /* ... */ },
  "read": false,
  "createdAt": "2025-12-21T10:00:00.000Z"
}
```

**Event: `friend-request`** (特殊事件，包含額外資料)
```json
{
  "notification": { /* Notification object */ },
  "request": { /* FriendRequest object */ },
  "fromUser": { /* User object */ }
}
```

**Event: `friend-accepted`** (特殊事件)
```json
{
  "notification": { /* Notification object */ },
  "friend": { /* User object */ }
}
```

---

## Push Notifications (Pusher Beams)

所有通知都會透過 Pusher Beams 發送推播通知到用戶的裝置。

**Interest:** `user-{userId}`

**Payload:**
```json
{
  "web": {
    "notification": {
      "title": "好友邀請",
      "body": "John Doe 想加你為好友",
      "icon": "https://your-domain.com/favicon.ico",
      "deep_link": "https://your-domain.com/notifications"
    },
    "data": {
      "type": "FRIEND_REQUEST",
      "requestId": 5,
      "url": "/notifications"
    }
  }
}
```

**Deep Link URLs 對照:**
- `FRIEND_REQUEST` → `/notifications`
- `FRIEND_ACCEPTED` → `/friends`
- `NEW_MESSAGE` → `/chat/{type}/{id}`
- `EVENT_INVITE` → `/events/{eventId}`
- `POKE` → `/events/{eventId}`

---

## Data Models

### Notification
```typescript
{
  id: number;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: any; // JSON object with notification-specific data
  read: boolean;
  createdAt: string; // ISO 8601
}
```

### NotificationType
```typescript
type NotificationType =
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'FRIEND_REJECTED'
  | 'EVENT_INVITE'
  | 'POKE'
  | 'NEW_MESSAGE'
  | 'EVENT_UPDATE';
```

---

## Notes

1. **通知清理**: 系統會定期清理 30 天前的已讀通知
2. **即時更新**: 使用 Pusher 即時推送新通知
3. **推播通知**: 需要用戶授權瀏覽器通知權限
4. **Deep Link**: 推播通知點擊後會導向對應的頁面
5. **Beams Interest**: 用戶登入後自動訂閱 `user-{userId}` interest


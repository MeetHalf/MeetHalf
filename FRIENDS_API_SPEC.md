# Friends API Specification

## Overview
好友管理 API，提供好友邀請、接受/拒絕邀請、好友列表、搜尋用戶等功能。

## Base URL
```
/friends
```

## Authentication
所有 API 需要使用 JWT 認證 (Cookie 或 Header)

---

## Endpoints

### 1. 發送好友邀請
```http
POST /friends/requests
```

**Request Body:**
```json
{
  "toUserId": "string" // 目標用戶的 userId
}
```

**Response (200):**
```json
{
  "request": {
    "id": 1,
    "fromUserId": "user123",
    "toUserId": "user456",
    "status": "pending",
    "createdAt": "2025-12-21T10:00:00.000Z",
    "updatedAt": "2025-12-21T10:00:00.000Z"
  }
}
```

**Errors:**
- `400 VALIDATION_ERROR`: 請求格式錯誤
- `400 INVALID_REQUEST`: 已是好友或已有待處理邀請
- `401 UNAUTHORIZED`: 未認證

---

### 2. 取得好友邀請列表
```http
GET /friends/requests?type=received
```

**Query Parameters:**
- `type` (optional): `received` (收到的邀請) 或 `sent` (發出的邀請)，預設為 `received`

**Response (200):**
```json
{
  "requests": [
    {
      "id": 1,
      "fromUserId": "user456",
      "toUserId": "user123",
      "status": "pending",
      "createdAt": "2025-12-21T10:00:00.000Z",
      "updatedAt": "2025-12-21T10:00:00.000Z",
      "fromUser": {
        "userId": "user456",
        "name": "John Doe",
        "email": "john@example.com",
        "avatar": "https://..."
      }
    }
  ]
}
```

---

### 3. 接受好友邀請
```http
POST /friends/requests/:id/accept
```

**Path Parameters:**
- `id`: 邀請 ID

**Response (200):**
```json
{
  "success": true
}
```

**Errors:**
- `404 NOT_FOUND`: 邀請不存在
- `400 INVALID_REQUEST`: 無權限或邀請狀態不正確

---

### 4. 拒絕好友邀請
```http
POST /friends/requests/:id/reject
```

**Path Parameters:**
- `id`: 邀請 ID

**Response (200):**
```json
{
  "success": true
}
```

---

### 5. 取得好友列表
```http
GET /friends
```

**Response (200):**
```json
{
  "friends": [
    {
      "userId": "user456",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": "https://...",
      "createdAt": "2025-12-21T10:00:00.000Z"
    }
  ]
}
```

---

### 6. 刪除好友
```http
DELETE /friends/:friendId
```

**Path Parameters:**
- `friendId`: 好友的 userId

**Response (200):**
```json
{
  "success": true
}
```

**Errors:**
- `400 INVALID_REQUEST`: 不是好友關係

---

### 7. 搜尋用戶
```http
GET /friends/search?q=keyword
```

**Query Parameters:**
- `q` (required): 搜尋關鍵字 (userId、name 或 email)

**Response (200):**
```json
{
  "users": [
    {
      "userId": "user789",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "avatar": "https://..."
    }
  ]
}
```

**Notes:**
- 最多返回 20 筆結果
- 不包含當前用戶自己

---

## Real-time Events (Pusher)

### Notification Channel: `notification-{userId}`

**Event: `friend-request`**
```json
{
  "notification": {
    "id": 1,
    "userId": "user123",
    "type": "FRIEND_REQUEST",
    "title": "好友邀請",
    "body": "John Doe 想加你為好友",
    "data": {
      "requestId": 1,
      "fromUserId": "user456",
      "fromUserName": "John Doe"
    },
    "read": false,
    "createdAt": "2025-12-21T10:00:00.000Z"
  },
  "request": { /* FriendRequest object */ },
  "fromUser": { /* User object */ }
}
```

**Event: `friend-accepted`**
```json
{
  "notification": {
    "id": 2,
    "userId": "user456",
    "type": "FRIEND_ACCEPTED",
    "title": "好友請求已接受",
    "body": "John Doe 接受了你的好友邀請",
    "data": {
      "friendId": "user123",
      "friendName": "John Doe"
    },
    "read": false,
    "createdAt": "2025-12-21T10:05:00.000Z"
  },
  "friend": { /* User object */ }
}
```

---

## Data Models

### FriendRequest
```typescript
{
  id: number;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  fromUser?: User;
  toUser?: User;
}
```

### Friend
```typescript
{
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string; // ISO 8601
}
```


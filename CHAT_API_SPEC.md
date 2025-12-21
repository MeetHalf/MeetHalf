# Chat API Specification

## Overview
即時聊天 API，支援個人聊天和群組聊天功能。

## Base URL
```
/chat
```

## Authentication
所有 API 需要使用 JWT 認證 (Cookie 或 Header)

---

## Endpoints

### 1. 發送訊息
```http
POST /chat/messages
```

**Request Body:**
```json
{
  "content": "Hello!",
  "receiverId": "user456", // 個人聊天 (與 groupId 二選一)
  "groupId": 123          // 群組聊天 (與 receiverId 二選一)
}
```

**Response (200):**
```json
{
  "message": {
    "id": 1,
    "content": "Hello!",
    "senderId": "user123",
    "receiverId": "user456",
    "groupId": null,
    "readBy": ["user123"],
    "createdAt": "2025-12-21T10:00:00.000Z",
    "sender": {
      "userId": "user123",
      "name": "John Doe",
      "avatar": "https://..."
    }
  }
}
```

**Errors:**
- `400 VALIDATION_ERROR`: 請求格式錯誤 (content 太長或 receiverId/groupId 都未提供)
- `401 UNAUTHORIZED`: 未認證

---

### 2. 取得聊天記錄
```http
GET /chat/messages?receiverId=user456&limit=50&offset=0
```

**Query Parameters:**
- `receiverId` (optional): 個人聊天對象的 userId
- `groupId` (optional): 群組 ID
- `limit` (optional): 返回數量，預設 50，最大 100
- `offset` (optional): 偏移量，預設 0

**Note:** `receiverId` 和 `groupId` 必須提供其中一個

**Response (200):**
```json
{
  "messages": [
    {
      "id": 1,
      "content": "Hello!",
      "senderId": "user123",
      "receiverId": "user456",
      "groupId": null,
      "readBy": ["user123", "user456"],
      "createdAt": "2025-12-21T10:00:00.000Z",
      "sender": {
        "userId": "user123",
        "name": "John Doe",
        "avatar": "https://..."
      }
    }
  ]
}
```

**Errors:**
- `403 FORBIDDEN`: 非群組成員
- `400 VALIDATION_ERROR`: 參數錯誤

---

### 3. 標記訊息為已讀
```http
PUT /chat/messages/:id/read
```

**Path Parameters:**
- `id`: 訊息 ID

**Response (200):**
```json
{
  "success": true
}
```

---

### 4. 批量標記對話已讀
```http
PUT /chat/conversations/read
```

**Request Body:**
```json
{
  "receiverId": "user456", // 個人聊天 (與 groupId 二選一)
  "groupId": 123          // 群組聊天 (與 receiverId 二選一)
}
```

**Response (200):**
```json
{
  "success": true,
  "count": 5  // 標記為已讀的訊息數量
}
```

**說明:**
- 進入聊天室時自動調用，將對話中所有未讀訊息標記為已讀
- 會觸發 Pusher `message-read` 事件給發送方
- 自動更新所有相關的未讀數量顯示

**Errors:**
- `400 VALIDATION_ERROR`: receiverId 和 groupId 都未提供
- `401 UNAUTHORIZED`: 未認證

---

### 5. 取得聊天室列表
```http
GET /chat/conversations
```

**Response (200):**
```json
{
  "conversations": [
    {
      "type": "user",
      "id": "user456",
      "name": "John Doe",
      "avatar": "https://...",
      "lastMessage": {
        "id": 5,
        "content": "See you tomorrow!",
        "senderId": "user456",
        "receiverId": "user123",
        "groupId": null,
        "readBy": ["user456"],
        "createdAt": "2025-12-21T12:00:00.000Z",
        "sender": {
          "userId": "user456",
          "name": "John Doe",
          "avatar": "https://..."
        }
      },
      "unreadCount": 3
    },
    {
      "type": "group",
      "id": 123,
      "name": "大學同學",
      "avatar": null,
      "lastMessage": { /* ... */ },
      "unreadCount": 1
    }
  ]
}
```

---

### 6. 取得未讀訊息數量
```http
GET /chat/unread-count
```

**Response (200):**
```json
{
  "count": 5
}
```

---

### 7. 搜尋訊息
```http
GET /chat/search?q=keyword&limit=20
```

**Query Parameters:**
- `q` (required): 搜尋關鍵字
- `limit` (optional): 返回數量，預設 20，最大 50

**Response (200):**
```json
{
  "messages": [
    {
      "id": 10,
      "content": "Meeting at 3pm tomorrow",
      "senderId": "user456",
      "receiverId": "user123",
      "groupId": null,
      "readBy": ["user456", "user123"],
      "createdAt": "2025-12-21T15:00:00.000Z",
      "group": null
    }
  ]
}
```

---

## Real-time Events (Pusher)

### Private Chat Channel: `chat-user-{userId}`

**Event: `new-message`**
```json
{
  "id": 1,
  "content": "Hello!",
  "senderId": "user456",
  "receiverId": "user123",
  "groupId": null,
  "readBy": ["user456"],
  "createdAt": "2025-12-21T10:00:00.000Z",
  "sender": {
    "userId": "user456",
    "name": "John Doe",
    "avatar": "https://..."
  }
}
```

**Event: `message-read`**
```json
{
  "messageId": 1,
  "readBy": "user123"
}
```

### Group Chat Channel: `group-{groupId}`

**Event: `new-message`**
```json
{
  "id": 2,
  "content": "Hello everyone!",
  "senderId": "user456",
  "receiverId": null,
  "groupId": 123,
  "readBy": ["user456"],
  "createdAt": "2025-12-21T10:05:00.000Z",
  "sender": {
    "userId": "user456",
    "name": "John Doe",
    "avatar": "https://..."
  }
}
```

**Event: `message-read`**
```json
{
  "messageId": 2,
  "readBy": "user789"
}
```

---

## Data Models

### ChatMessage
```typescript
{
  id: number;
  content: string;
  senderId: string;
  receiverId: string | null;
  groupId: number | null;
  readBy: string[]; // userId[]
  createdAt: string; // ISO 8601
  sender?: {
    userId: string;
    name: string;
    avatar: string | null;
  };
}
```

### Conversation
```typescript
{
  type: 'user' | 'group';
  id: string | number;
  name: string;
  avatar: string | null;
  lastMessage: ChatMessage;
  unreadCount: number;
}
```

---

## Notes

1. **訊息已讀機制**: `readBy` 陣列包含所有已讀過該訊息的 userId
2. **群組聊天權限**: 只有群組成員可以查看和發送訊息
3. **Pusher Channel 命名**:
   - 個人聊天: `chat-user-{userId}` (雙方都會訂閱)
   - 群組聊天: `group-{groupId}`
4. **訊息排序**: 按 createdAt 升序 (最舊的在前)
5. **分頁載入**: 使用 limit 和 offset 進行分頁


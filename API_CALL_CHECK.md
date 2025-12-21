# API 調用方式檢查報告

## 前端 API 調用方式 ✅

### 1. Axios 配置
- **文件**: `frontend/src/api/axios.ts`
- **Base URL**: `http://localhost:3000` (開發環境)
- **認證**: 使用 `withCredentials: true` 發送 cookies
- **狀態**: ✅ 正確

### 2. Friends API
- **文件**: `frontend/src/api/friends.ts`
- **端點**: 
  - `GET /friends` - 獲取好友列表
  - `GET /friends/requests` - 獲取好友請求
  - `POST /friends/requests` - 發送好友請求
  - `POST /friends/requests/:id/accept` - 接受好友請求
  - `POST /friends/requests/:id/reject` - 拒絕好友請求
  - `DELETE /friends/:friendId` - 刪除好友
  - `GET /friends/search` - 搜尋用戶
- **狀態**: ✅ 正確

### 3. Chat API
- **文件**: `frontend/src/api/chat.ts`
- **端點**:
  - `GET /chat/conversations` - 獲取對話列表
  - `GET /chat/messages` - 獲取訊息
  - `POST /chat/messages` - 發送訊息
  - `PUT /chat/messages/:id/read` - 標記為已讀
  - `GET /chat/unread-count` - 獲取未讀數量
  - `GET /chat/search` - 搜尋訊息
- **狀態**: ✅ 正確

## 後端問題診斷 ⚠️

### 錯誤訊息
```
TypeError: Cannot read properties of undefined (reading 'findMany')
TypeError: Cannot read properties of undefined (reading 'count')
```

### 影響的 Repository
1. `FriendRepository.getFriends()` - `prisma.friend.findMany`
2. `ChatRepository.getUnreadCount()` - `prisma.chatMessage.count`
3. `NotificationRepository.getNotifications()` - `prisma.notification.findMany`
4. `NotificationRepository.getUnreadCount()` - `prisma.notification.count`

### 已修復的問題
1. ✅ 修復 `array_contains` 語法錯誤 → 改為 `has`
2. ✅ 修復 `getFriends` 返回格式缺少 `createdAt` 字段
3. ✅ 重新生成 Prisma 客戶端

### 可能的根本原因
1. **Prisma 客戶端未正確初始化** - 需要重啟後端服務器
2. **模塊導入順序問題** - Prisma 可能在 Repository 導入時尚未初始化
3. **循環依賴** - 可能存在模塊間的循環依賴

## 解決步驟

### 1. 重啟後端服務器
```bash
cd backend
# 停止當前服務器 (Ctrl+C)
npm run dev
```

### 2. 檢查 Prisma 連接
確認後端啟動時看到：
```
✅ Connected to PostgreSQL database
```

### 3. 測試 API
```bash
# 測試好友列表 API (需要認證)
curl -X GET http://localhost:3000/friends \
  -H "Cookie: token=YOUR_TOKEN" \
  -v

# 測試未讀數量 API (需要認證)
curl -X GET http://localhost:3000/chat/unread-count \
  -H "Cookie: token=YOUR_TOKEN" \
  -v
```

## 建議

如果問題持續存在，可以考慮：

1. **在 Repository 類中存儲 prisma 實例**
   ```typescript
   export class FriendRepository {
     private prisma = prisma;
     
     async getFriends(userId: string) {
       return this.prisma.friend.findMany({...});
     }
   }
   ```

2. **檢查 Prisma Schema**
   ```bash
   cd backend
   npx prisma validate
   ```

3. **檢查數據庫連接**
   ```bash
   cd backend
   npx prisma db pull
   ```

## 當前狀態

- ✅ 前端 API 調用方式正確
- ✅ Prisma 語法錯誤已修復
- ⚠️ 需要重啟後端服務器以應用更改
- ⚠️ 如果問題持續，需要進一步調查 Prisma 初始化問題


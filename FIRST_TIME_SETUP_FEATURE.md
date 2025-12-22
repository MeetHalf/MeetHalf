# 首次登入設定功能

## 功能概述

使用者首次登入時，將被引導到設定頁面，可以設定：
1. **自訂 User ID** - 預設為 `email前綴_XXX`（可編輯）
2. **預設出發點** - 設定常用出發地點（選填）
3. **預設交通方式** - 選擇常用交通方式：開車、大眾運輸、步行、騎車（選填）

完成設定後，這些資訊將用於：
- User ID：好友系統的唯一識別碼
- 預設出發點 & 交通方式：自動計算到達集合點的預估時間

## 實現細節

### 資料庫變更

**Prisma Schema 更新：**
```prisma
model User {
  userId              String?  @unique  // 改為 nullable，首次設定時才填入
  defaultTravelMode   String?           // 新增：預設交通方式
  needsSetup          Boolean  @default(true) // 新增：是否需要首次設定
  // ... 其他欄位
}
```

**Migration:**
- `20251222022127_add_default_travel_mode_and_setup_flag`

### 後端變更

#### 1. OAuth 流程修改 (`src/lib/passport.ts`)
- 首次建立使用者時，不自動生成 userId
- 設定 `needsSetup: true` 標記

#### 2. 認證重導向邏輯 (`src/routes/auth.ts`)
```typescript
// 檢查 needsSetup 狀態，決定重導向目標
if (user.needsSetup) {
  redirectUrl = `${frontendOrigin}/first-time-setup?auth_temp=...`;
} else {
  redirectUrl = `${frontendOrigin}/events?auth_temp=...`;
}
```

#### 3. 新增 API Endpoints (`src/routes/users.ts`)

**POST /users/check-userid**
- 檢查 userId 是否可用
- 驗證格式：3-50 字元，僅限英文、數字、底線

**POST /users/complete-setup**
- 完成首次設定
- 儲存 userId、預設出發點、預設交通方式
- 設定 `needsSetup: false`

**PATCH /users/profile**
- 更新支援 `defaultTravelMode` 欄位

**GET /users/profile**
- 回傳包含 `defaultTravelMode` 和 `needsSetup`

#### 4. Schema 驗證 (`src/schemas/users.ts`)
```typescript
completeSetupSchema = z.object({
  userId: z.string()
    .min(3).max(50)
    .regex(/^[a-zA-Z0-9_]+$/),
  defaultLat: z.number().min(-90).max(90).nullable().optional(),
  defaultLng: z.number().min(-180).max(180).nullable().optional(),
  defaultAddress: z.string().max(500).nullable().optional(),
  defaultLocationName: z.string().max(200).nullable().optional(),
  defaultTravelMode: z.enum(['driving', 'transit', 'walking', 'bicycling']).nullable().optional(),
});
```

### 前端變更

#### 1. 新增首次設定頁面 (`src/pages/FirstTimeSetup.tsx`)

**功能：**
- 自動生成建議的 userId（email 前綴 + 隨機 3 碼）
- 可重新生成建議 ID
- 即時檢查 userId 是否可用
- Google Maps 地點自動完成
- 交通方式選擇（開車/大眾運輸/步行/騎車）
- 完成後自動進入首頁

**UI 特色：**
- 清晰的步驟說明
- 即時驗證回饋
- 美觀的交通方式選擇介面

#### 2. 更新個人資料頁面 (`src/pages/Profile.tsx`)

**新增功能：**
- 顯示和編輯預設交通方式
- 與預設出發點整合在同一區塊
- 統一的儲存按鈕

#### 3. 路由更新 (`src/router.tsx`)
```typescript
{
  path: '/first-time-setup',
  element: <FirstTimeSetup />,
}
```

#### 4. API Client 更新 (`src/api/users.ts`)
```typescript
checkUserIdAvailable(data: CheckUserIdRequest)
completeSetup(data: CompleteSetupRequest)
updateProfile() // 支援 defaultTravelMode
```

#### 5. Types 更新 (`src/types/friend.ts`)
```typescript
interface User {
  userId: string | null; // 改為 nullable
  defaultTravelMode?: 'driving' | 'transit' | 'walking' | 'bicycling' | null;
  needsSetup?: boolean;
  // ... 其他欄位
}
```

#### 6. Auth Hook 更新 (`src/hooks/useAuth.ts`)
- 加上 `needsSetup` 欄位支援
- 加上 `refreshUser()` 方法別名

## 使用流程

### 首次登入流程

1. 使用者透過 Google/GitHub OAuth 登入
2. 後端建立使用者記錄（`needsSetup: true`，`userId: null`）
3. 重導向到 `/first-time-setup` 頁面
4. 使用者設定：
   - User ID（預設建議：`john_abc`）
   - 預設出發點（選填）
   - 預設交通方式（預設：開車）
5. 點擊「完成設定並進入 MeetHalf」
6. 前端呼叫 `POST /users/complete-setup`
7. 後端儲存資料並設定 `needsSetup: false`
8. 重導向到 `/events` 首頁

### 再次登入流程

1. 使用者透過 OAuth 登入
2. 後端檢查 `needsSetup: false`
3. 直接重導向到 `/events` 首頁

## 安全性考量

1. **User ID 唯一性檢查**
   - 前端即時檢查
   - 後端二次驗證
   - 資料庫 unique constraint

2. **輸入驗證**
   - Zod schema 驗證
   - 正規表達式檢查
   - 長度限制

3. **權限控制**
   - 需要登入才能存取設定頁面
   - 已完成設定的使用者無法重複設定

## 相容性處理

### 現有使用者

對於在此功能實作前已存在的使用者：
- Migration 會將 `needsSetup` 設為 `true`
- 下次登入時會被引導到設定頁面
- 若已有 userId，會顯示現有的 userId 作為預設值

### Null Check

在可能使用 `userId` 的地方加上 null check：
- `FriendRepository.ts` - 過濾掉沒有 userId 的使用者
- `ChatService.ts` - 跳過沒有 userId 的成員

## 測試建議

### 手動測試

1. **首次登入流程**
   - [ ] Google OAuth 登入 → 重導向到設定頁面
   - [ ] GitHub OAuth 登入 → 重導向到設定頁面
   - [ ] 建議的 userId 格式正確
   - [ ] 可以編輯 userId
   - [ ] 可以重新生成建議
   - [ ] 即時檢查 userId 是否可用
   - [ ] 地點搜尋功能正常
   - [ ] 可以選擇交通方式
   - [ ] 完成設定後進入首頁
   - [ ] userId 不可重複

2. **個人資料頁面**
   - [ ] 顯示預設交通方式
   - [ ] 可以修改交通方式
   - [ ] 儲存成功

3. **邊界情況**
   - [ ] userId 太短（< 3 字元）
   - [ ] userId 包含特殊字元
   - [ ] 已完成設定的使用者無法再次進入設定頁面
   - [ ] 未登入使用者無法存取設定頁面

## 未來改進建議

1. **User ID 編輯**
   - 允許已設定的使用者修改 userId（需考慮對好友系統的影響）

2. **更多個人化設定**
   - 通知偏好
   - 隱私設定
   - 主題顏色

3. **引導優化**
   - 加上步驟指示器
   - 跳過某些選填欄位的選項
   - 更詳細的說明文字

## 相關檔案

### 後端
- `backend/prisma/schema.prisma`
- `backend/src/lib/passport.ts`
- `backend/src/routes/auth.ts`
- `backend/src/routes/users.ts`
- `backend/src/schemas/users.ts`
- `backend/src/repositories/FriendRepository.ts`
- `backend/src/services/ChatService.ts`

### 前端
- `frontend/src/pages/FirstTimeSetup.tsx`
- `frontend/src/pages/Profile.tsx`
- `frontend/src/router.tsx`
- `frontend/src/api/users.ts`
- `frontend/src/types/friend.ts`
- `frontend/src/hooks/useAuth.ts`

## 部署注意事項

1. **資料庫 Migration**
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

2. **重新建置**
   ```bash
   # 後端
   cd backend && npm run build
   
   # 前端
   cd frontend && npm run build
   ```

3. **驗證**
   - 測試新使用者註冊流程
   - 確認現有使用者仍可正常登入
   - 檢查 profile 頁面功能正常

---

**建立日期：** 2024-12-22  
**版本：** 1.0.0


# NODE_ENV=development 部署問題修復

## 問題

在 Vercel 部署環境中，如果 `NODE_ENV` 被設定為 `development`，會導致：

1. **Cookie 設置錯誤**：
   - 使用 `sameSite: 'lax'` 而不是 `'none'`
   - 使用 `secure: false` 而不是 `true`
   - 導致跨站點 Cookie 無法傳遞

2. **結果**：
   - 登入後 Cookie 無法在跨站點請求中使用
   - `/auth/me` 和 `/groups` 等請求返回 401

## 解決方案

### 已修復：使用 VERCEL_URL 判斷部署環境

不再依賴 `NODE_ENV`，而是使用更可靠的方式判斷是否在部署環境：

```typescript
// 修復前：依賴 NODE_ENV
const isProduction = process.env.NODE_ENV === 'production';

// 修復後：檢查 VERCEL_URL 或 HTTPS
const isDeployed = !!process.env.VERCEL_URL || req.protocol === 'https';
```

**判斷邏輯**：
- 如果 `VERCEL_URL` 存在 → 在 Vercel 上運行 → 使用部署設置
- 或者請求使用 HTTPS → 可能是部署環境 → 使用部署設置
- 否則 → 本地開發 → 使用開發設置

### Cookie 設置邏輯

**部署環境（Vercel）**：
```typescript
{
  httpOnly: true,
  sameSite: 'none',    // ✅ 允許跨站點
  secure: true,        // ✅ 僅 HTTPS
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
}
```

**本地開發**：
```typescript
{
  httpOnly: true,
  sameSite: 'lax',     // ✅ 本地可以使用
  secure: false,       // ✅ 本地 HTTP 也可以
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
}
```

## 建議

### 選項 1：移除 NODE_ENV=development（推薦）

在 Vercel Dashboard → 後端專案 → Settings → Environment Variables：

1. 找到 `NODE_ENV` 環境變數
2. **刪除它**（讓 Vercel 自動設置為 `production`）

或者：

3. 將 `NODE_ENV` 改為 `production`

**原因**：
- Vercel 預設會設置 `NODE_ENV=production`
- 手動設置 `development` 會導致問題

### 選項 2：保留 NODE_ENV=development（也可）

如果你確實需要 `NODE_ENV=development`，現在的代碼已經可以正常工作了：

- Cookie 會根據 `VERCEL_URL` 自動使用正確的設置
- 即使 `NODE_ENV=development`，Cookie 也會使用 `sameSite: 'none'` 和 `secure: true`

## 修復的檔案

- ✅ `backend/src/routes/auth.ts` - 登入和登出的 Cookie 設置

## 驗證

重新部署後，檢查：

1. **Cookie 設置**：
   - 登入後檢查 Cookie 屬性
   - `SameSite` 應該是 `None`
   - `Secure` 應該是勾選的

2. **API 請求**：
   - `/auth/me` 應該成功返回用戶資訊
   - `/groups` 應該不再出現 401 錯誤

3. **Vercel 日誌**：
   - 檢查是否有 Cookie 相關的錯誤訊息

## 相關環境變數

### 自動提供的（不需要設定）
- `VERCEL_URL` - Vercel 自動提供，用於判斷部署環境

### 可選的
- `NODE_ENV` - 如果不設定，Vercel 會自動設置為 `production`
- `COOKIE_DOMAIN` - 通常不需要設定

## 技術說明

### 為什麼不依賴 NODE_ENV？

1. **不可靠**：用戶可能手動設置錯誤的值
2. **不準確**：`NODE_ENV` 可能用於其他目的（如日誌級別），不一定反映部署狀態
3. **環境差異**：不同的部署環境可能有不同的設置

### 為什麼使用 VERCEL_URL？

1. **可靠**：Vercel 自動提供，無法被誤設置
2. **明確**：存在就表示在 Vercel 上運行
3. **精確**：直接反映部署狀態

### 為什麼還要檢查 HTTPS？

1. **備用方案**：即使沒有 `VERCEL_URL`，HTTPS 也通常表示生產環境
2. **通用性**：適用於其他部署平台（不只是 Vercel）

## 測試

### 本地測試

```bash
# 本地應該是 lax + secure: false
npm run dev
# 登入後檢查 Cookie: SameSite=Lax, Secure=false (或沒有)
```

### 部署測試

```bash
# 部署後應該是 none + secure: true
# 即使 NODE_ENV=development，Cookie 也應該是正確的
# 登入後檢查 Cookie: SameSite=None, Secure=true
```

## 總結

✅ **已修復**：Cookie 設置不再依賴 `NODE_ENV`  
✅ **推薦**：移除手動設置的 `NODE_ENV=development`  
✅ **可用**：即使保留 `NODE_ENV=development` 也能正常工作

現在無論 `NODE_ENV` 是什麼值，只要在 Vercel 上運行，Cookie 就會使用正確的跨站點設置。


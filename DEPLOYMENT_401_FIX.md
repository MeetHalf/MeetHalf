# 部署環境 401 錯誤修復指南

## 問題

部署到 Vercel 後，`/auth/me` 和 `/groups` 等受保護路由返回 401 Unauthorized，但本地開發正常。

## 可能原因

1. **Cookie 沒有正確設置**：`domain` 設為 `undefined` 可能導致 Cookie 設置失敗
2. **Cookie 沒有被傳遞**：跨站點請求時 Cookie 可能被瀏覽器阻擋
3. **環境變數問題**：`NODE_ENV` 或 `COOKIE_DOMAIN` 設置不正確

## 已修復的問題

### 1. Cookie 設置改進

**修復前**：
```typescript
res.cookie('token', token, {
  domain: process.env.COOKIE_DOMAIN, // undefined 可能導致問題
});
```

**修復後**：
```typescript
const cookieOptions: any = {
  httpOnly: true,
  sameSite: isProduction ? 'none' : 'lax',
  secure: isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/', // 明確設置路徑
};

// 只有在明確設定時才添加 domain
if (process.env.COOKIE_DOMAIN) {
  cookieOptions.domain = process.env.COOKIE_DOMAIN;
}

res.cookie('token', token, cookieOptions);
```

### 2. 添加調試日誌

在認證中間件中添加了詳細的日誌，幫助診斷問題：
- 記錄 Cookie 是否存在
- 記錄 token 驗證錯誤

## 檢查清單

### 後端環境變數（Vercel Dashboard）

確保以下環境變數已正確設置：

1. **`NODE_ENV=production`** ✅（Vercel 自動設置）
2. **`JWT_SECRET`** ✅（必須設定）
3. **`DATABASE_URL`** ✅（必須設定）
4. **`FRONTEND_ORIGIN`** ⚠️（建議設定，但不設定也會允許所有 Vercel 域名）

### 前端環境變數

1. **`VITE_API_BASE_URL`** ✅（必須設定為後端 Vercel URL）

### Cookie 設置

#### 生產環境（Vercel）
- `sameSite: 'none'` ✅（允許跨站點）
- `secure: true` ✅（僅 HTTPS）
- `httpOnly: true` ✅（防止 XSS）
- `domain`: 不設置（讓瀏覽器自動處理）

#### 本地開發
- `sameSite: 'lax'` ✅
- `secure: false` ✅
- `httpOnly: true` ✅

## 調試步驟

### 1. 檢查登入是否成功設置 Cookie

在瀏覽器開發工具中：

1. 打開 **Application** → **Cookies**
2. 檢查是否有 `token` cookie
3. 檢查 Cookie 屬性：
   - `HttpOnly`: ✅
   - `Secure`: ✅
   - `SameSite`: `None`
   - `Domain`: 應該是你的後端域名

### 2. 檢查 API 請求

在瀏覽器開發工具的 **Network** tab：

1. 找到 `/auth/me` 請求
2. 檢查 **Request Headers**：
   ```
   Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. 檢查 **Response Headers**：
   - 登入時應該有 `Set-Cookie` header
   - 請求時應該有 `Access-Control-Allow-Credentials: true`

### 3. 檢查 CORS 設置

確保 Response Headers 包含：
```
Access-Control-Allow-Origin: https://your-frontend.vercel.app
Access-Control-Allow-Credentials: true
```

### 4. 檢查後端日誌

在 Vercel Dashboard → Deployments → Functions 查看日誌：

- 如果看到 `[Auth] No token in cookies` → Cookie 沒有被傳遞
- 如果看到 `[Auth] Token verification failed` → Token 驗證失敗

## 常見問題解決

### Q1: Cookie 沒有被設置

**可能原因**：
- `domain` 設置錯誤
- `secure` 設定但使用 HTTP（本地開發）

**解決方案**：
- ✅ 不要設置 `domain`，讓瀏覽器自動處理
- ✅ 確保生產環境使用 HTTPS

### Q2: Cookie 設置了但請求時沒有帶上

**可能原因**：
- CORS 設置不正確
- 前端沒有設置 `withCredentials: true`

**檢查**：
- ✅ 前端 `axios` 配置：`withCredentials: true`
- ✅ 後端 CORS：`credentials: true`
- ✅ 後端 CORS：允許前端域名

### Q3: Token 驗證失敗

**可能原因**：
- `JWT_SECRET` 不一致
- Token 已過期

**解決方案**：
- ✅ 確認 `JWT_SECRET` 已正確設置
- ✅ 重新登入獲取新 token

### Q4: 第三方 Cookie 被阻擋

某些瀏覽器（如 Safari）預設阻擋第三方 Cookie。

**檢查**：
- Chrome：`Settings` → `Privacy and security` → `Third-party cookies`
- Safari：`Preferences` → `Privacy` → 取消勾選 "Prevent cross-site tracking"

**臨時解決方案**（測試用）：
- 使用 Chrome 進行測試
- 在 Safari 中允許第三方 Cookie

## 測試步驟

### 1. 清除所有 Cookie
```javascript
// 在瀏覽器控制台執行
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
```

### 2. 重新登入
1. 訪問前端應用程式
2. 登入
3. 檢查 Cookie 是否設置

### 3. 檢查認證
1. 查看 `/auth/me` 請求是否成功
2. 檢查返回的用戶資訊

### 4. 訪問受保護路由
1. 訪問 `/groups` 路由
2. 確認不再出現 401 錯誤

## 驗證命令

### 測試 Cookie 設置（使用 curl）

```bash
# 登入
curl -X POST https://your-backend.vercel.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt \
  -v

# 檢查 Set-Cookie header
# 應該看到：Set-Cookie: token=...; HttpOnly; Secure; SameSite=None

# 使用 Cookie 請求 /auth/me
curl -X GET https://your-backend.vercel.app/auth/me \
  -b cookies.txt \
  -v

# 應該返回用戶資訊，而不是 401
```

## 如果問題仍然存在

### 添加更多調試資訊

在後端添加臨時調試代碼：

```typescript
// 在 /auth/me 路由中
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  console.log('[DEBUG] /auth/me called', {
    hasCookie: !!req.cookies.token,
    cookieKeys: Object.keys(req.cookies),
    headers: {
      origin: req.headers.origin,
      cookie: req.headers.cookie ? 'present' : 'missing',
    },
    user: req.user,
  });
  // ... rest of the code
});
```

### 檢查 Vercel 環境變數

在 Vercel Dashboard 確認：
- 環境變數是否在正確的環境（Production/Preview）中設置
- 環境變數值是否正確（沒有多餘空格）
- 是否已重新部署

### 聯繫支援

如果問題持續存在，請提供：
1. 瀏覽器控制台的完整錯誤訊息
2. Network tab 中 `/auth/me` 請求的詳細資訊
3. Vercel 後端日誌
4. Cookie 設置的詳細資訊（從 Application tab）

## 相關檔案

- `backend/src/routes/auth.ts` - Cookie 設置邏輯
- `backend/src/middleware/auth.ts` - 認證中間件（含調試日誌）
- `frontend/src/api/axios.ts` - Axios 配置


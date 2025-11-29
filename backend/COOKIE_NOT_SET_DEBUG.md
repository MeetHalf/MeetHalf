# Cookie 未設置問題調試指南

## 問題現象

日誌顯示：
```
[Auth] No token in cookies {
  cookies: [],
  headers: { cookie: 'missing', origin: 'https://meet-half.vercel.app' }
}
```

這表示 Cookie 沒有被傳遞到後端。

## 可能原因

### 1. 登入時 Cookie 沒有被設置

**檢查方法**：
- 登入後，檢查瀏覽器開發工具 → Network → `/auth/login` 請求
- 查看 Response Headers 是否有 `Set-Cookie` header

**可能的問題**：
- `sameSite: 'none'` 需要 `secure: true`（已修復）
- 瀏覽器可能阻擋第三方 Cookie

### 2. Cookie 設置了但瀏覽器沒有傳遞

**檢查方法**：
- 瀏覽器開發工具 → Application → Cookies
- 檢查是否有 `token` cookie 在後端域名下

**可能的問題**：
- 瀏覽器阻擋第三方 Cookie（SameSite=None）
- Cookie 的 domain 或 path 不正確

### 3. Express 沒有正確識別 HTTPS

**已修復**：
- ✅ 添加了 `app.set('trust proxy', true)`
- ✅ 這樣 Express 可以正確讀取 Vercel 的 `X-Forwarded-Proto` header

## 已修復的問題

### 1. 信任 Proxy
```typescript
// backend/src/index.ts
app.set('trust proxy', true);
```

這允許 Express 正確識別：
- 協議（HTTP vs HTTPS）
- 客戶端 IP
- 來自 Vercel proxy 的 headers

### 2. 增強調試日誌

在登入時會記錄：
- 是否檢測到部署環境
- Cookie 設置參數
- Set-Cookie header 是否發送

## 調試步驟

### Step 1: 檢查登入請求

1. 打開瀏覽器開發工具 → Network
2. 登入
3. 找到 `POST /auth/login` 請求
4. 檢查 **Response Headers**：

**應該看到**：
```
Set-Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/; HttpOnly; Secure; SameSite=None
Access-Control-Allow-Origin: https://meet-half.vercel.app
Access-Control-Allow-Credentials: true
```

**如果沒有 Set-Cookie**：
- 檢查後端日誌是否有 `[Login] Setting cookie` 訊息
- 檢查日誌中的 `isDeployed` 是否為 `true`
- 檢查 `sameSite` 和 `secure` 設置

### Step 2: 檢查 Cookie 是否被保存

1. 登入後，打開瀏覽器開發工具 → Application → Cookies
2. 檢查是否有 `token` cookie

**在哪裡找**：
- 後端域名：`https://meet-half-backend.vercel.app`
- Cookie 名稱：`token`

**Cookie 屬性應該是**：
- Name: `token`
- Value: JWT token string
- Domain: `.vercel.app` 或 `meet-half-backend.vercel.app`
- Path: `/`
- HttpOnly: ✅
- Secure: ✅
- SameSite: `None`

**如果 Cookie 不存在**：
- 可能是瀏覽器阻擋了第三方 Cookie
- 檢查瀏覽器設定（見下方）

### Step 3: 檢查後續請求是否帶上 Cookie

1. 找到 `GET /auth/me` 請求
2. 檢查 **Request Headers**：

**應該看到**：
```
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**如果沒有 Cookie header**：
- Cookie 沒有被設置或瀏覽器阻擋了
- 檢查瀏覽器的第三方 Cookie 設定

### Step 4: 檢查後端日誌

在 Vercel Dashboard → Deployments → Functions 查看：

**登入時應該看到**：
```
[Login] Setting cookie: {
  isDeployed: true,
  hasVercelUrl: true,
  protocol: 'https',
  sameSite: 'none',
  secure: true,
  ...
}
[Login] Set-Cookie header: sent
```

**如果 `isDeployed: false`**：
- `VERCEL_URL` 環境變數可能不存在
- `req.protocol` 可能不是 'https'（需要 `trust proxy`）

## 瀏覽器設定檢查

### Chrome
1. 打開 `chrome://settings/cookies`
2. 確保 "Block third-party cookies" 是關閉的（測試用）
3. 或將你的域名加入允許清單

### Safari
1. Preferences → Privacy
2. 取消勾選 "Prevent cross-site tracking"（測試用）

### Firefox
1. Settings → Privacy & Security
2. Cookie and Site Data → Manage Exceptions
3. 添加你的域名

## 常見問題

### Q: 為什麼本地可以但部署不行？

**A**: 本地開發時：
- 前後端可能在同一域名（localhost）
- 或瀏覽器對本地開發有特殊處理

部署後：
- 前後端在不同域名（跨站點）
- 需要 `SameSite=None` 和 `Secure=true`
- 瀏覽器可能阻擋第三方 Cookie

### Q: 如何確認 Cookie 設置是否正確？

**A**: 檢查後端日誌中的 `[Login] Setting cookie` 訊息：
- `isDeployed` 應該是 `true`
- `sameSite` 應該是 `'none'`
- `secure` 應該是 `true`
- `Set-Cookie header` 應該是 `'sent'`

### Q: Cookie 設置了但請求時沒有帶上？

**A**: 可能的原因：
1. 瀏覽器阻擋第三方 Cookie
2. Cookie 的 domain 或 path 不匹配
3. 前端沒有設置 `withCredentials: true`（應該已經設置了）

### Q: 如何臨時測試（允許第三方 Cookie）？

**Chrome**：
1. 設置 → Privacy and security → Third-party cookies
2. 暫時允許第三方 Cookie
3. 測試登入功能

**注意**：這只是用於測試。生產環境應該正常工作。

## 下一步行動

如果問題仍然存在：

1. **檢查登入時的 Response Headers**
   - 確認 `Set-Cookie` 是否存在
   - 確認 Cookie 參數是否正確

2. **檢查瀏覽器 Cookie 存儲**
   - 確認 Cookie 是否被保存
   - 確認 Cookie 屬性是否正確

3. **檢查後端日誌**
   - 查看 `[Login] Setting cookie` 日誌
   - 確認所有參數是否正確

4. **檢查瀏覽器設定**
   - 確認第三方 Cookie 沒有被阻擋
   - 嘗試不同的瀏覽器

5. **檢查環境變數**
   - 確認 `VERCEL_URL` 存在
   - 確認 `NODE_ENV` 設置

## 相關檔案

- `backend/src/index.ts` - 已添加 `trust proxy`
- `backend/src/routes/auth.ts` - 已添加詳細日誌
- `backend/src/middleware/auth.ts` - 已有調試日誌


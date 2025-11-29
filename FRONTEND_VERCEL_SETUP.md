# 前端 Vercel 部署環境變數設定

## 問題說明

前端部署到 Vercel 後遇到 401 Unauthorized 錯誤，主要原因是：

1. **API URL 未設定**：前端使用 `VITE_API_BASE_URL` 環境變數，但部署時未設置
2. **Cookie 跨站問題**：後端 Cookie 設置需要調整以支援跨站點請求

## 需要設定的環境變數

在 Vercel Dashboard → 前端專案 → Settings → Environment Variables 設定：

### 必須設定

#### `VITE_API_BASE_URL`
後端 API 的完整 URL

```
VITE_API_BASE_URL=https://meet-half-backend.vercel.app
```

或者如果你的後端有自定義域名：

```
VITE_API_BASE_URL=https://api.yourdomain.com
```

### 其他環境變數

#### `VITE_GOOGLE_MAPS_JS_KEY`
Google Maps JavaScript API Key（如果還沒設定）

```
VITE_GOOGLE_MAPS_JS_KEY=your_google_maps_js_api_key
```

## 後端環境變數（後端專案）

在 Vercel Dashboard → 後端專案 → Settings → Environment Variables 設定：

### 必須設定

#### `FRONTEND_ORIGIN`
前端應用程式的完整 URL（用於 CORS）

```
FRONTEND_ORIGIN=https://your-frontend-app.vercel.app
```

或者使用通配符（推薦，會自動允許所有 Vercel 域名）：

如果設定為包含 "vercel.app" 的字串，系統會自動允許所有 `*.vercel.app` 域名。

### Cookie 設定（可選）

如果需要更精確的 Cookie 控制，可以設定：

#### `COOKIE_DOMAIN`
Cookie 的域名（通常不需要設定，讓瀏覽器自動處理）

```
COOKIE_DOMAIN=.vercel.app
```

## 設定步驟

### 1. 設定前端環境變數

1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇**前端專案**
3. 進入 **Settings** → **Environment Variables**
4. 添加以下環境變數：

   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://meet-half-backend.vercel.app`（你的後端 URL）
   - **Environment**: Production, Preview, Development（全部選取）

   - **Key**: `VITE_GOOGLE_MAPS_JS_KEY`
   - **Value**: 你的 Google Maps API Key
   - **Environment**: Production, Preview, Development（全部選取）

5. 儲存後**重新部署**前端應用程式

### 2. 設定後端環境變數

1. 選擇**後端專案**
2. 進入 **Settings** → **Environment Variables**
3. 確認以下環境變數已設定：

   - **Key**: `FRONTEND_ORIGIN`
   - **Value**: 你的前端 URL（例如：`https://your-frontend-app.vercel.app`）
   - **Environment**: Production, Preview, Development

   如果不想設定具體的前端 URL，系統會自動允許所有 `*.vercel.app` 域名。

4. 儲存後**重新部署**後端應用程式

## 驗證設定

### 檢查前端環境變數

部署後，可以在瀏覽器控制台檢查：

```javascript
console.log(import.meta.env.VITE_API_BASE_URL);
```

應該顯示後端的 URL，而不是 `undefined` 或 `http://localhost:3000`。

### 檢查 Cookie

1. 登入應用程式
2. 開啟瀏覽器開發工具 → Application → Cookies
3. 確認 `token` cookie 已正確設定
4. 檢查 Cookie 屬性：
   - `HttpOnly`: ✅
   - `Secure`: ✅ (HTTPS only)
   - `SameSite`: `None` (跨站點)

### 檢查 API 請求

1. 開啟瀏覽器開發工具 → Network
2. 檢查 API 請求的 URL 是否正確（應該是後端的 Vercel URL）
3. 檢查請求標頭是否包含 `Cookie` header
4. 檢查回應標頭是否包含 `Set-Cookie` header（登入時）

## 常見問題

### Q: 為什麼本地開發可以，但部署後不行？

A: 本地開發時，前後端都在 localhost，沒有跨站點問題。部署後，前後端在不同的 Vercel 域名，需要：
- 正確設定 `VITE_API_BASE_URL`
- 後端 CORS 允許前端域名
- Cookie 使用 `sameSite: 'none'` 和 `secure: true`

### Q: 重新部署後還是 401？

A: 檢查：
1. 前端環境變數是否正確設定並重新部署
2. 後端環境變數是否正確設定並重新部署
3. 清除瀏覽器 Cookie 後重新登入
4. 檢查瀏覽器控制台的錯誤訊息

### Q: CORS 錯誤？

A: 確認：
1. 後端已設定 `FRONTEND_ORIGIN` 或允許 `*.vercel.app` 域名
2. CORS 配置包含 `credentials: true`
3. 前端請求包含 `withCredentials: true`

### Q: Cookie 沒有被設定？

A: 檢查：
1. Cookie 設置中 `sameSite: 'none'` 和 `secure: true`（生產環境）
2. 瀏覽器是否阻擋第三方 Cookie（某些瀏覽器設定）
3. 檢查瀏覽器控制台是否有 Cookie 相關警告

## 測試步驟

1. **清除瀏覽器資料**：清除 Cookie 和 Local Storage
2. **訪問前端應用程式**
3. **嘗試登入**
4. **檢查**：
   - 登入成功
   - Cookie 已設定
   - `/auth/me` 請求成功
   - `/groups` 等受保護路由可以訪問


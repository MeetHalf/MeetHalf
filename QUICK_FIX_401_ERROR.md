# 快速修復 401 Unauthorized 錯誤

## 問題

前端部署到 Vercel 後出現 401 Unauthorized 錯誤，本地開發正常。

## 原因

1. **前端 API URL 未設定**：前端使用 `VITE_API_BASE_URL`，但部署時未設置
2. **後端 CORS 配置**：未正確允許前端 Vercel 域名
3. **Cookie 跨站問題**：Cookie 設置不支援跨站點請求

## 已修復的代碼

### 後端修復
- ✅ CORS 配置改進：自動允許所有 `*.vercel.app` 域名
- ✅ Cookie 設置：生產環境使用 `sameSite: 'none'` 和 `secure: true`

## 需要手動設定的環境變數

### 前端（必須）

在 Vercel Dashboard → 前端專案 → Settings → Environment Variables：

```
VITE_API_BASE_URL=https://meet-half-backend.vercel.app
```

**重要**：設定後需要重新部署前端！

### 後端（可選但建議）

在 Vercel Dashboard → 後端專案 → Settings → Environment Variables：

```
FRONTEND_ORIGIN=https://your-frontend-app.vercel.app
```

如果不設定，系統會自動允許所有 `*.vercel.app` 域名。

## 快速檢查清單

- [ ] 前端已設定 `VITE_API_BASE_URL` 環境變數
- [ ] 前端已重新部署
- [ ] 後端已設定 `FRONTEND_ORIGIN`（可選）
- [ ] 後端已重新部署
- [ ] 清除瀏覽器 Cookie 後重新測試

## 驗證

1. 清除瀏覽器 Cookie 和 Local Storage
2. 訪問前端應用程式
3. 嘗試登入
4. 檢查瀏覽器控制台：
   - Network tab 中 API 請求的 URL 應該是後端 Vercel URL
   - Application tab → Cookies 中應該有 `token` cookie
   - 不再出現 401 錯誤

## 如果還是不行

1. **檢查環境變數是否正確**：
   - 前端：`console.log(import.meta.env.VITE_API_BASE_URL)` 應該顯示後端 URL
   - 後端：檢查 Vercel 部署日誌

2. **檢查 Cookie**：
   - 瀏覽器開發工具 → Application → Cookies
   - 確認 `token` cookie 存在
   - 檢查屬性：`HttpOnly`, `Secure`, `SameSite=None`

3. **檢查 CORS**：
   - 瀏覽器開發工具 → Network
   - 查看 API 請求的 Response Headers
   - 確認包含 `Access-Control-Allow-Origin` 和 `Access-Control-Allow-Credentials: true`

4. **檢查後端日誌**：
   - Vercel Dashboard → 後端專案 → Deployments → 最新部署 → Functions
   - 查看是否有 CORS 相關錯誤訊息


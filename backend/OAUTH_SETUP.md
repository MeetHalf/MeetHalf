# OAuth 設定指南

## 問題說明

如果遇到 `Error 400: redirect_uri_mismatch`，這表示 OAuth callback URL 沒有在 Google/GitHub 應用設定中正確註冊。

## 設定步驟

### 1. 確定後端 URL

#### 本地開發
- 後端 URL: `http://localhost:3000`
- Callback URL: `http://localhost:3000/auth/google/callback` 或 `http://localhost:3000/auth/github/callback`

#### Vercel 部署
- 後端 URL: `https://your-backend-project.vercel.app`
- Callback URL: `https://your-backend-project.vercel.app/auth/google/callback` 或 `https://your-backend-project.vercel.app/auth/github/callback`

### 2. Google OAuth 設定

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇或創建專案
3. 啟用 Google+ API
4. 前往「憑證」頁面
5. 點擊「建立憑證」>「OAuth 2.0 用戶端 ID」
6. 應用程式類型：選擇「網頁應用程式」
7. **授權的重定向 URI**（重要！）：
   - 本地開發：`http://localhost:3000/auth/google/callback`
   - 生產環境：`https://your-backend-project.vercel.app/auth/google/callback`
   - 如果需要支援多個環境，可以添加多個 URI
8. 複製「用戶端 ID」和「用戶端密鑰」

### 3. GitHub OAuth 設定

1. 前往 GitHub Settings > Developer settings > OAuth Apps
2. 點擊「New OAuth App」
3. **Application name**: 您的應用名稱
4. **Homepage URL**: 您的前端 URL
   - 本地：`http://localhost:5173`
   - 生產：`https://your-frontend.vercel.app`
5. **Authorization callback URL**（重要！）：
   - 本地開發：`http://localhost:3000/auth/github/callback`
   - 生產環境：`https://your-backend-project.vercel.app/auth/github/callback`
6. 點擊「Register application」
7. 複製「Client ID」和「Client secrets」>「Generate a new client secret」

### 4. 設定環境變數

#### 本地開發（.env 檔案）

```env
BACKEND_URL=http://localhost:3000
FRONTEND_ORIGIN=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

#### Vercel 部署（環境變數設定）

前往 Vercel 專案設定 > Environment Variables，添加：

```
BACKEND_URL=https://your-backend-project.vercel.app
FRONTEND_ORIGIN=https://your-frontend.vercel.app

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

**注意**：`BACKEND_URL` 應該設置為您的 Vercel 後端部署 URL。

### 5. 多環境支援

如果您需要同時支援本地開發和生產環境，可以在 OAuth 提供商的設定中添加多個 callback URL：

**Google Cloud Console**:
```
http://localhost:3000/auth/google/callback
https://your-backend-project.vercel.app/auth/google/callback
```

**GitHub OAuth App**:
```
http://localhost:3000/auth/github/callback
https://your-backend-project.vercel.app/auth/github/callback
```

## 驗證設定

1. 確認環境變數已正確設定
2. 確認 callback URL 在 OAuth 提供商中已註冊
3. 重新啟動後端服務（本地開發）或重新部署（Vercel）
4. 嘗試登入，應該不會再出現 `redirect_uri_mismatch` 錯誤

## 常見問題

### Q: 為什麼需要 `BACKEND_URL`？
A: OAuth 流程中，用戶會被重定向到 Google/GitHub，然後再重定向回您的後端 callback URL。這個 URL 必須與 OAuth 提供商設定中的授權重定向 URI 完全一致。

### Q: Vercel 的 URL 會變嗎？
A: 生產部署的主域名不會變（如 `your-project.vercel.app`），但預覽部署會有不同的 URL。如果使用預覽部署，需要在 OAuth 提供商中為每個預覽 URL 添加 callback URI，或者考慮使用自定義域名。

### Q: 可以自動偵測 URL 嗎？
A: 程式碼會嘗試自動偵測（使用 `VERCEL_URL`），但明確設定 `BACKEND_URL` 更可靠。

## 安全建議

1. 不要將 OAuth 憑證提交到 Git
2. 使用環境變數管理敏感資訊
3. 定期輪換 OAuth 密鑰
4. 限制 OAuth 應用的授權範圍


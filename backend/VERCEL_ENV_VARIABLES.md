# Vercel 環境變數說明

## 自動提供的環境變數

Vercel 會自動提供以下環境變數，**不需要手動設定**：

### `VERCEL_URL`
- **格式**: `your-app-name.vercel.app`（不包含協議 `https://`）
- **用途**: 當前部署的域名
- **可用環境**: 所有部署（生產、預覽、開發）

## 需要手動設定的環境變數

### 必須設定

#### `DATABASE_URL`
PostgreSQL 連接字串（生產環境）

```
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

**建議使用 Neon PostgreSQL**（專為 Serverless 設計，與 Vercel 整合良好）

#### `JWT_SECRET`
JWT 簽名密鑰（至少 32 字元）

```
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_please_change_this
```

### 可選設定

#### `FRONTEND_ORIGIN`
前端應用程式的 URL（用於 CORS）

```
FRONTEND_ORIGIN=https://your-frontend.vercel.app
```

#### `GOOGLE_MAPS_SERVER_KEY`
Google Maps Server API Key（用於後端 API）

```
GOOGLE_MAPS_SERVER_KEY=your_google_maps_server_api_key_here
```

## 如何在 Vercel 設定環境變數

1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇你的專案
3. 進入 **Settings** → **Environment Variables**
4. 添加所需的環境變數
5. 選擇應用環境（Production, Preview, Development）
6. 重新部署應用程式

## 環境變數檢查清單

### 生產環境必須設定：
- ✅ `DATABASE_URL` - PostgreSQL 連接字串
- ✅ `JWT_SECRET` - JWT 簽名密鑰

### 生產環境建議設定：
- ⚠️ `FRONTEND_ORIGIN` - 如果前端部署在其他域名
- ⚠️ `GOOGLE_MAPS_SERVER_KEY` - 如果使用 Google Maps API

### 自動提供（不需要設定）：
- ✅ `VERCEL_URL` - 自動提供
- ✅ `NODE_ENV` - 自動設定為 `production`

## 注意事項

1. **不要在代碼中硬編碼環境變數**
2. **確保 `JWT_SECRET` 足夠複雜**（至少 32 字元）
3. **使用 Neon 或其他 Serverless PostgreSQL**（傳統 PostgreSQL 不適合 Serverless）
4. **環境變數變更後需要重新部署**
5. **預覽部署會使用 Preview 環境的變數**

## 測試環境變數

部署後，可以通過 API 檢查環境變數是否正確設定：

```bash
# 檢查健康狀態
curl https://your-app.vercel.app/healthz

# 查看 Swagger UI（會顯示正確的 server URL）
open https://your-app.vercel.app/api-docs
```

## 常見問題

### Q: 為什麼 Swagger UI 顯示錯誤的 server URL？
A: 檢查 `VERCEL_URL` 是否自動提供。如果沒有，可以手動設定或使用 `FRONTEND_ORIGIN` 作為替代。

### Q: 如何確認環境變數是否正確設定？
A: 在 Vercel Dashboard 的 Environment Variables 頁面查看，或檢查部署日誌。

### Q: Preview 部署使用哪些環境變數？
A: Preview 部署會使用 Preview 環境的變數。如果沒有設定，會回退到 Production 變數。


# PostgreSQL 遷移說明

## 已完成的工作

1. ✅ 更新 Prisma schema：provider 改為 `postgresql`
2. ✅ 簡化 Prisma Client 初始化（移除所有 Turso/libSQL 代碼）
3. ✅ 更新依賴套件（移除 Turso 依賴，添加 `pg`）
4. ✅ 建立 `podman-compose.yml` 用於本地測試
5. ✅ 更新測試設定
6. ✅ 建立 `.env.example`

## 需要執行的步驟

### 1. 刪除舊的 SQLite Migrations

舊的 SQLite migrations 需要刪除，因為 PostgreSQL 使用不同的 SQL 語法：

```bash
cd backend/prisma/migrations
rm -rf 20251023153906_init
rm -rf 20251025151600_add_member_timestamps
rm -rf 20251025165851_add_travel_mode
rm -rf 20251026155404_add_offline_members
```

或者使用一行指令：

```bash
cd backend/prisma/migrations && rm -rf 2025* && cd ../..
```

### 2. 啟動 PostgreSQL 資料庫

使用 podman-compose 啟動 PostgreSQL：

```bash
# 從專案根目錄
podman-compose up -d postgres
```

等待 PostgreSQL 啟動完成（健康檢查通過）。

### 3. 設定環境變數

確保 `backend/.env` 檔案包含正確的 PostgreSQL 連接字串：

```bash
DATABASE_URL="postgresql://meethalf:meethalf_password@localhost:5432/meethalf"
```

### 4. 建立新的 PostgreSQL Migration

```bash
cd backend
npm run prisma:migrate -- --name init_postgres
```

這會：
- 根據當前的 schema 生成 PostgreSQL 相容的 SQL
- 建立新的 migration 檔案
- 執行 migration 並應用變更到資料庫

### 5. 驗證 Migration

檢查資料庫是否正確建立：

```bash
# 開啟 Prisma Studio 查看資料庫
npm run prisma:studio
```

或使用 PostgreSQL 客戶端：

```bash
# 使用 podman-compose 中的 PostgreSQL
podman-compose exec postgres psql -U meethalf -d meethalf -c "\dt"
```

## 本地開發

### 啟動所有服務

```bash
# 從專案根目錄
podman-compose up -d
```

這會啟動：
- PostgreSQL (port 5432)
- pgAdmin (port 5050) - 可選的資料庫管理工具
- Backend (port 3000)
- Frontend (port 5173)

### 停止服務

```bash
podman-compose down
```

### 查看日誌

```bash
podman-compose logs -f backend
```

## Vercel 部署

在 Vercel 環境變數中設定：

```
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
```

建議使用 Neon PostgreSQL（專為 Serverless 設計）。

## 注意事項

1. **資料遷移**：如果現有 SQLite 資料需要遷移，需要手動匯出並匯入到 PostgreSQL
2. **測試資料庫**：測試需要使用獨立的 PostgreSQL 資料庫，可在 `.env` 中設定 `TEST_DATABASE_URL`
3. **Migration 歷史**：刪除舊 migrations 意味著失去 migration 歷史記錄，但這對於從 SQLite 遷移到 PostgreSQL 是必要的


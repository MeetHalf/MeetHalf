# PostgreSQL 遷移完成總結

## ✅ 已完成的變更

### 1. Prisma Schema
- ✅ `backend/prisma/schema.prisma`: provider 改為 `postgresql`
- ✅ `backend/prisma/migrations/migration_lock.toml`: provider 改為 `postgresql`
- ✅ 環境變數統一使用 `DATABASE_URL`

### 2. Prisma Client 初始化
- ✅ `backend/src/lib/prisma.ts`: 完全簡化，移除所有 Turso/libSQL 相關代碼
- ✅ 使用標準 `PrismaClient` 初始化

### 3. 依賴套件
- ✅ 移除 `@libsql/client` 和 `@prisma/adapter-libsql`
- ✅ 添加 `pg` (PostgreSQL 驅動) 和 `@types/pg`
- ✅ `backend/package.json` 已更新

### 4. 環境變數
- ✅ `backend/src/types/env.d.ts`: 移除 Turso 相關類型定義
- ✅ `backend/.env.example`: 建立，包含 PostgreSQL 連接字串範例

### 5. 測試設定
- ✅ `backend/tests/setup.ts`: 更新為使用 PostgreSQL

### 6. 容器化配置
- ✅ `podman-compose.yml`: 建立完整的 PostgreSQL + pgAdmin + Backend + Frontend 服務
- ✅ `backend/Dockerfile`: 建立，包含 PostgreSQL 客戶端工具
- ✅ `frontend/Dockerfile`: 建立
- ✅ `.dockerignore` 檔案已建立

### 7. 文檔更新
- ✅ `README.md`: 所有 SQLite 引用已改為 PostgreSQL
- ✅ `backend/POSTGRESQL_MIGRATION.md`: 建立詳細的遷移指南

### 8. 工具腳本
- ✅ `backend/scripts/reset-migrations.sh`: 建立，用於清理舊的 SQLite migrations

## 📋 接下來需要執行的步驟

### 1. 刪除舊的 SQLite Migrations

```bash
cd backend/prisma/migrations
rm -rf 20251023153906_init
rm -rf 20251025151600_add_member_timestamps
rm -rf 20251025165851_add_travel_mode
rm -rf 20251026155404_add_offline_members
```

或使用提供的腳本：

```bash
cd backend
./scripts/reset-migrations.sh
```

### 2. 啟動 PostgreSQL 資料庫

```bash
# 從專案根目錄
podman-compose up -d postgres
```

等待資料庫啟動完成（健康檢查通過）。

### 3. 設定環境變數

確保 `backend/.env` 檔案包含：

```env
DATABASE_URL="postgresql://meethalf:meethalf_password@localhost:5432/meethalf"
JWT_SECRET="your_super_secret_jwt_key_min_32_chars_please_change_this"
GOOGLE_MAPS_SERVER_KEY="your_google_maps_server_api_key_here"
FRONTEND_ORIGIN="http://localhost:5173"
NODE_ENV="development"
PORT=3000
```

### 4. 建立新的 PostgreSQL Migration

```bash
cd backend
npm run prisma:migrate -- --name init_postgres
```

這會根據當前的 schema 生成 PostgreSQL 相容的 SQL 並建立新的 migration。

### 5. 驗證安裝

```bash
# 開啟 Prisma Studio 查看資料庫
npm run prisma:studio

# 或使用 PostgreSQL 客戶端
podman-compose exec postgres psql -U meethalf -d meethalf -c "\dt"
```

### 6. 啟動所有服務

```bash
# 從專案根目錄
podman-compose up -d
```

這會啟動：
- PostgreSQL (port 5432)
- pgAdmin (port 5050)
- Backend (port 3000)
- Frontend (port 5173)

## 🔄 Vercel 部署

在 Vercel 環境變數中設定：

```
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
```

建議使用 **Neon PostgreSQL**（專為 Serverless 設計，與 Vercel 整合良好）。

## ⚠️ 注意事項

1. **資料遷移**: 如果現有 SQLite 資料需要遷移，需要手動匯出並匯入到 PostgreSQL
2. **Migration 歷史**: 刪除舊 migrations 意味著失去 migration 歷史記錄，但這是必要的（SQL 語法不同）
3. **測試資料庫**: 建議使用獨立的測試資料庫，可在 `.env` 中設定 `TEST_DATABASE_URL`

## 📚 相關文檔

- `backend/POSTGRESQL_MIGRATION.md` - 詳細的遷移步驟
- `podman-compose.yml` - 容器配置說明

## ✨ 已清理的內容

- ❌ 所有 Turso/libSQL 相關代碼
- ❌ `@libsql/client` 和 `@prisma/adapter-libsql` 依賴
- ❌ Turso 環境變數定義
- ❌ SQLite 相關文檔引用

## 🎉 遷移完成

所有程式碼變更已完成！現在只需要執行上述步驟來建立新的 PostgreSQL migration 並啟動資料庫。


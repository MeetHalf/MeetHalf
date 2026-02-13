# Architecture Decision Records (ADR)

本目錄包含 MeetHalf 專案的所有架構決策記錄。

## 什麼是 ADR？

Architecture Decision Records (ADR) 是一種記錄重要架構決策的文檔格式。每個 ADR 記錄一個決策、其背景、理由和後果。

## ADR 列表

| ADR | 標題 | 狀態 |
|-----|------|------|
| [0001](./0001-record-architecture-decisions.md) | 記錄架構決策 | 已接受 |
| [0002](./0002-use-react-typescript-frontend.md) | 使用 React + TypeScript 作為前端框架 | 已接受 |
| [0003](./0003-use-nodejs-express-backend.md) | 使用 Node.js + Express + TypeScript 作為後端框架 | 已接受 |
| [0004](./0004-use-prisma-orm.md) | 使用 Prisma ORM 進行資料庫操作 | 已接受 |
| [0005](./0005-use-repository-pattern.md) | 使用 Repository 模式分離資料存取層 | 已接受 |
| [0006](./0006-use-pusher-channels-realtime.md) | 使用 Pusher Channels 實現即時通訊 | 已接受 |
| [0007](./0007-use-pusher-beams-push-notifications.md) | 使用 Pusher Beams 實現推播通知 | 已接受 |
| [0008](./0008-use-react-query-state-management.md) | 使用 React Query 進行伺服器狀態管理 | 已接受 |
| [0009](./0009-use-jwt-oauth-authentication.md) | 使用 JWT + OAuth 進行身份驗證 | 已接受 |
| [0010](./0010-use-lru-cache-backend.md) | 使用 LRU Cache 進行後端快取 | 已接受 |
| [0011](./0011-support-pwa.md) | 支援 PWA (Progressive Web App) | 已接受 |
| [0012](./0012-use-google-maps-api.md) | 使用 Google Maps API 進行地圖和位置服務 | 已接受 |

## ADR 格式

每個 ADR 文件應包含以下部分：

1. **狀態**: 決策的當前狀態（已接受、已拒絕、已取代等）
2. **背景**: 決策的背景和上下文
3. **決策**: 做出的決策
4. **理由**: 為什麼做出這個決策
5. **後果**: 決策帶來的正面和負面影響

## 如何新增 ADR

1. 複製現有 ADR 作為模板
2. 使用下一個序號（如 0013）
3. 填寫所有必要的部分
4. 提交 PR 並進行 code review

## 參考資料

- [ADR GitHub](https://github.com/joelparkerhenderson/architecture-decision-record)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)


# MeetHalf 本機工作區恢復檢查點

日期：2026-10-13

## 工作區狀態

目前使用原始 `main` 基線的 worktree：`work/MeetHalf-original`。本次沒有 reset、revert、discard、branch 切換、merge、push，也沒有修改正式環境。

`git status` 顯示 28 個既有修改檔案，以及兩個新增測試檔：

- `backend/tests/original-flow.test.ts`
- `frontend/src/__tests__/CreateEvent.test.tsx`

`git diff --stat`：28 個已追蹤檔案，162 insertions、242 deletions。未提交修改已完整保留。

## 已完成的修復

- `frontend/src/pages/CreateEvent.tsx`
  - 手動修改集合地點時清除舊地址與座標，避免送出過期座標。
  - 推薦地點選取改用推薦地點自身座標，並保留 `0` 緯度等有效值。
  - 建立活動時保留集合地點欄位，即使啟用 MeetHalf。
  - 訪客在未啟用 MeetHalf 時可看見並填寫暱稱欄位。
  - 加強時間與集合地點的送出驗證。
  - 修正中點結果欄位名稱，並明確顯示交通時間是到地理中點的估算。
- `backend/src/routes/events.ts`
  - 活動修改與 share-token 操作改用已驗證的帳號或事件範圍 guest token。
  - 阻止僅靠 request body 的偽造 `ownerId` 修改活動。
  - guest token 必須屬於目前事件。
  - 部分更新也會驗證儲存後的開始／結束時間順序。
- `backend/src/utils/jwt.ts`
  - 區分帳號 JWT 與 guest/member JWT，拒絕格式不符的 token。
- `frontend/src/components/MapContainer.tsx`、`frontend/src/pages/MapView.tsx`
  - 接通地圖縮放與 marker 點擊回呼，修正原版地圖頁的元件介面落差。
  - 支援可為 null 的 marker 地址，並簡化 marker 清理與更新。
- `frontend/src/router.tsx`、`frontend/src/lib/googleMapsLoader.ts`
  - 移除不存在的 Social import。
  - Maps 載入失敗後允許重試，不讓失敗 Promise 永久卡住。
- 其餘前端檔案
  - 修正原有測試與型別／API 介面不一致、未使用 import、React Query v5 `gcTime`、null userId 等問題。

## 已通過的驗證

- 前端 Vitest：6 個 test files、18 tests passed。
- 新增 `CreateEvent.test.tsx`：驗證訪客選取地點可送出，以及修改地點後不會送出舊座標。
- 新增 `MapContainer.test.tsx`：驗證 Maps 載入、縮放、marker 點擊與刪除、載入失敗提示。
- 後端隔離流程測試 `backend/tests/original-flow.test.ts`：10 tests passed，涵蓋：
  - guest 建立活動與 `0` 緯度集合點
  - guest 取得／解析邀請碼
  - guest 加入活動
  - verified host 修改與越權阻擋
  - 錯誤事件範圍 guest token 與錯誤時間更新
  - 帳號／guest JWT 分離
  - profile 的零值座標
  - 好友邀請、私訊、群組建立與讀取
- 前端 production build：passed。
- 正式 Prisma PostgreSQL 連線曾以唯讀方式驗證成功，並讀到既有資料表；沒有寫入或修改正式資料。
- Google Maps server key 曾成功完成 Geocoding、推薦地點與交通時間 smoke test。

## 尚未完成或未完整驗證

- 尚未執行並確認完整 backend test suite 的最終結果；上一輪已啟動完整測試，但本 checkpoint 刻意不再重跑。
- 尚未完成正式 OAuth 登入、Pusher 即時聊天／通知、瀏覽器 Google Places autocomplete、手機實機與部署環境的端到端驗證。
- 本機 PostgreSQL 的一般 embedded server 受共享記憶體限制；後續改用 PGlite socket 只完成連線與 schema 探索，尚未把整套本機資料庫流程整理成正式開發腳本。
- 前端 TypeScript 仍有舊元件與測試相關錯誤的歷史紀錄；production build 不包含完整 type check。最後一次針對修改後型別檢查的輸出未整理成乾淨的基線報告。
- 原版 `CreateEvent` 的 MeetHalf 計算仍需要登入使用者、好友／假人出發點與完整 Maps 設定；guest-first PR 的 `/find` 流程已停止採用。

## 已知 Bug 與阻礙

- 若沒有可用的本機 PostgreSQL／PGlite 開發資料庫，建立活動、登入、好友、聊天等需要資料庫的流程無法由 localhost 完整操作。
- Google OAuth callback 目前指向 `http://localhost:3000`，必須與 OAuth provider 的允許 redirect URI 一致。
- Pusher secret、Google OAuth secret 與資料庫連線資訊屬敏感設定；本 checkpoint 不會把它們提交到 Git，也不會修改 Vercel 或其他正式環境。
- Google Maps 後端金鑰與前端瀏覽器金鑰用途不同；前端來源限制的金鑰不能代替 server key。
- 目前工作區仍有未提交的程式與測試修改，尚未經使用者 review 或 commit。

## 下一步最小可執行工作

1. 由使用者先 review 此 checkpoint 與目前 diff，確認要保留哪些修復。
2. 固定一個隔離的本機 PostgreSQL 測試連線，重新跑一次指定的前端測試、`original-flow.test.ts` 與 backend 完整測試，記錄乾淨結果。
3. 只針對測試仍失敗的原版流程逐項修復，再由使用者確認是否要提交 commit。

本文件建立後停止開發與自動修復；沒有在 checkpoint 之後新增功能或執行完整測試。

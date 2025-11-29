# Event Room 功能開發 Issues

## 📋 Issue 分類與優先級

- 🔴 **P0 (必做)**: 核心功能，MVP 必須
- 🟡 **P1 (重要)**: 重要功能，增強體驗
- 🟢 **P2 (可選)**: 錦上添花，時間允許再做

---

## Week 1: 基礎設定與 API 層

### Issue #1: 環境設定與 API 規格文件 🔴 P0
**Branch**: `feature/#1-api-spec-and-setup`

**描述**:
設定專案環境並撰寫完整的 Events API 規格文件供後端參考

**任務清單**:
- [ ] 安裝 Pusher 相關套件
  ```bash
  npm install pusher-js
  npm install --save-dev @types/pusher-js
  ```
- [ ] 在 `frontend/.env.example` 加入 Pusher 環境變數範例
  ```
  VITE_PUSHER_KEY=your_pusher_key
  VITE_PUSHER_CLUSTER=ap3
  ```
- [ ] 撰寫 `EVENTS_API_SPEC.md` 完整規格
  - 所有 API 端點定義
  - Request/Response schema
  - Pusher 事件定義
  - curl 範例

**檔案**:
- `frontend/package.json`
- `frontend/.env.example`
- `EVENTS_API_SPEC.md` (新建)

**驗收條件**:
- ✅ Pusher 套件安裝成功
- ✅ API 規格文件完整，包含至少 8 個端點
- ✅ 後端可以根據規格開始實作

**預估時間**: 3-4 小時

**標籤**: `frontend`, `documentation`, `priority-high`

---

### Issue #2: Mock Data 與 TypeScript 定義 🔴 P0
**Branch**: `feature/#2-mock-data`

**描述**:
建立 Mock Data 和完整的 TypeScript interfaces，讓前端可以獨立開發

**任務清單**:
- [ ] 建立 `frontend/src/mocks/eventData.ts`
- [ ] 定義 TypeScript interfaces:
  - `Event`
  - `EventMember`
  - `LocationUpdate`
  - `PokeRecord`
  - `EventResult`
- [ ] 建立至少 3 個完整的 mock events
- [ ] 建立 5-8 個 mock members
- [ ] 建立模擬的定位資料

**檔案**:
- `frontend/src/mocks/eventData.ts` (新建)
- `frontend/src/types/events.ts` (新建)

**驗收條件**:
- ✅ 所有 interface 定義完整且符合 API 規格
- ✅ Mock data 資料合理且豐富
- ✅ 可以被其他元件 import 使用

**預估時間**: 2-3 小時

**標籤**: `frontend`, `mock`, `priority-high`

---

### Issue #3: Events API 層實作 🔴 P0
**Branch**: `feature/#3-events-api-layer`

**描述**:
實作 Events API 函式庫，使用 feature flag 控制 mock/real data

**任務清單**:
- [ ] 建立 `frontend/src/api/events.ts`
- [ ] 實作所有 API 函式:
  - `getEvent(id)`
  - `createEvent(data)`
  - `joinEvent(id, guestData)`
  - `updateLocation(id, lat, lng)`
  - `markArrival(id)`
  - `pokeUser(eventId, targetId)`
  - `getEventResult(id)`
  - `getMyEvents()`
  - `getMyStats()`
- [ ] 使用 `USE_MOCK_DATA` flag 控制
- [ ] 加入適當的錯誤處理

**檔案**:
- `frontend/src/api/events.ts` (新建)

**驗收條件**:
- ✅ 所有 API 函式定義完整
- ✅ Mock 模式可正常運作
- ✅ TypeScript 類型正確
- ✅ 錯誤處理完善

**預估時間**: 4-5 小時

**標籤**: `frontend`, `api`, `priority-high`

---

### Issue #4: Pusher Hook 實作 🔴 P0
**Branch**: `feature/#4-pusher-hook`

**描述**:
建立 usePusher custom hook 處理 Pusher 連線和事件訂閱

**任務清單**:
- [ ] 建立 `frontend/src/hooks/usePusher.ts`
- [ ] 實作 Pusher 初始化邏輯
- [ ] 實作 channel 訂閱
- [ ] 實作清理邏輯 (unsubscribe & disconnect)
- [ ] 加入 TypeScript 型別定義
- [ ] 處理連線錯誤

**檔案**:
- `frontend/src/hooks/usePusher.ts` (新建)

**驗收條件**:
- ✅ Hook 可正常連線到 Pusher
- ✅ 可訂閱 event channel
- ✅ 組件卸載時正確清理
- ✅ 錯誤處理完善

**預估時間**: 2-3 小時

**標籤**: `frontend`, `hooks`, `pusher`, `priority-high`

---

## Week 2: EventRoom 核心功能

### Issue #5: EventRoom 基本框架 🔴 P0
**Branch**: `feature/#5-event-room-basic`

**描述**:
建立 EventRoom 頁面的基本結構，包含倒數計時、地圖、成員列表

**任務清單**:
- [ ] 建立 `frontend/src/pages/EventRoom.tsx`
- [ ] 實作頂部倒數計時卡片
- [ ] 整合現有的 MapContainer 元件
- [ ] 實作基本成員列表 UI
- [ ] 整合 usePusher hook
- [ ] 加入路由到 `router.tsx`

**檔案**:
- `frontend/src/pages/EventRoom.tsx` (新建)
- `frontend/src/router.tsx` (修改)

**驗收條件**:
- ✅ 可透過 `/events/:id` 訪問頁面
- ✅ 倒數計時正確運作
- ✅ 地圖可正常顯示
- ✅ 成員列表顯示 mock data
- ✅ Mobile 排版正確

**預估時間**: 5-6 小時

**標籤**: `frontend`, `page`, `priority-high`

---

### Issue #6: 即時定位更新功能 🔴 P0
**Branch**: `feature/#6-location-tracking`

**描述**:
實作智能定位更新邏輯，包含時間窗檢查和移動偵測

**任務清單**:
- [ ] 實作時間窗檢查邏輯
- [ ] 使用 `watchPosition` 持續監聽位置
- [ ] 實作移動偵測 (50m 閾值)
- [ ] 整合 Pusher 接收其他成員位置
- [ ] 在地圖上即時更新標記位置
- [ ] 加入定位權限請求 Dialog

**檔案**:
- `frontend/src/pages/EventRoom.tsx` (修改)
- `frontend/src/components/LocationPermissionDialog.tsx` (新建)

**驗收條件**:
- ✅ 只在時間窗內啟用定位
- ✅ 移動超過 50m 才更新
- ✅ 其他成員位置即時顯示
- ✅ 權限請求 UX 友善

**預估時間**: 4-5 小時

**標籤**: `frontend`, `geolocation`, `priority-high`

---

### Issue #7: 成員列表與狀態顯示 🔴 P0
**Branch**: `feature/#7-member-list-status`

**描述**:
完善成員列表，顯示各種狀態和即時更新

**任務清單**:
- [ ] 建立 `MemberListItem` 元件
- [ ] 顯示成員頭像、名字、狀態
- [ ] 實作狀態圖示:
  - ✓ 已到達 (綠色)
  - ⏰ 移動中 (藍色)
  - ❌ 遲到 (紅色)
  - 📍 未分享位置 (灰色)
- [ ] 顯示距離資訊
- [ ] 透過 Pusher 即時更新狀態

**檔案**:
- `frontend/src/components/MemberListItem.tsx` (新建)
- `frontend/src/pages/EventRoom.tsx` (修改)

**驗收條件**:
- ✅ 所有狀態正確顯示
- ✅ 即時更新無延遲
- ✅ Mobile 排版美觀
- ✅ 狀態變化有過渡動畫

**預估時間**: 3-4 小時

**標籤**: `frontend`, `component`, `priority-high`

---

### Issue #8: 「我到了」按鈕與到達邏輯 🔴 P0
**Branch**: `feature/#8-arrival-button`

**描述**:
實作到達按鈕和相關邏輯，包含 API 呼叫和 Pusher 通知

**任務清單**:
- [ ] 在 EventRoom 底部加入固定按鈕
- [ ] 實作點擊處理邏輯
- [ ] 呼叫 `markArrival` API
- [ ] 監聽 Pusher `member-arrived` 事件
- [ ] 顯示到達 Toast 通知
- [ ] 按鈕狀態管理 (已到達後禁用)

**檔案**:
- `frontend/src/pages/EventRoom.tsx` (修改)
- `frontend/src/components/ArrivalButton.tsx` (新建，選用)

**驗收條件**:
- ✅ 按鈕固定在底部
- ✅ 點擊後正確標記到達
- ✅ 收到其他人到達通知
- ✅ Toast 顯示友善
- ✅ Mobile 觸控區域足夠大

**預估時間**: 2-3 小時

**標籤**: `frontend`, `component`, `priority-high`

---

### Issue #9: 戳人功能 🟡 P1
**Branch**: `feature/#9-poke-feature`

**描述**:
實作戳人互動功能，包含按鈕、動畫、限制和通知

**任務清單**:
- [ ] 建立 `PokeButton` 元件
- [ ] 實作戳人 API 呼叫
- [ ] 加入震動動畫 (CSS keyframes)
- [ ] 限制每人最多戳 3 次
- [ ] 監聽 Pusher `poke` 事件
- [ ] 被戳時顯示通知 + 震動
- [ ] 顯示被戳次數 badge

**檔案**:
- `frontend/src/components/PokeButton.tsx` (新建)
- `frontend/src/pages/EventRoom.tsx` (修改)
- `frontend/src/styles/animations.css` (新建)

**驗收條件**:
- ✅ 戳按鈕有趣且易用
- ✅ 震動動畫流暢
- ✅ 限制邏輯正確
- ✅ 被戳通知明顯
- ✅ Badge 顯示正確

**預估時間**: 3-4 小時

**標籤**: `frontend`, `component`, `interaction`, `priority-medium`

---

### Issue #10: EventResultPopup 排行榜 ⭐ 🔴 P0
**Branch**: `feature/#10-result-popup-ranking`

**描述**:
實作聚會結束後的排行榜彈窗，這是視覺亮點！

**任務清單**:
- [ ] 建立 `EventResultPopup.tsx` 主元件
- [ ] 建立 `RankingList.tsx` 排行榜列表
- [ ] 建立 `PokeAwards.tsx` 戳人特別獎
- [ ] 建立 `StatsCard.tsx` 統計卡片
- [ ] 建立 `PersonalCard.tsx` 個人戰績
- [ ] 實作全螢幕 Dialog
- [ ] 加入漸層背景
- [ ] 實作前三名特殊樣式 (金銀銅)
- [ ] 實作 stagger 動畫
- [ ] 加入紙屑動畫
- [ ] 實作「儲存到歷史」功能
- [ ] 實作「分享排行榜」功能 (選用)

**檔案**:
- `frontend/src/components/EventResultPopup.tsx` (新建)
- `frontend/src/components/RankingList.tsx` (新建)
- `frontend/src/components/PokeAwards.tsx` (新建)
- `frontend/src/components/StatsCard.tsx` (新建)
- `frontend/src/components/PersonalCard.tsx` (新建)

**驗收條件**:
- ✅ 全螢幕 Dialog 美觀
- ✅ 排行榜前三名有金銀銅背景
- ✅ 依序彈出動畫流暢
- ✅ 紙屑動畫有趣
- ✅ 所有狀態標籤正確
- ✅ Mobile 完美適配
- ✅ 可儲存到歷史記錄

**預估時間**: 8-10 小時 (最重要的功能！)

**標籤**: `frontend`, `component`, `popup`, `priority-high`, `visual-highlight`

---

## Week 3: Sidebar 與 RWD

### Issue #11: Sidebar 基本結構 🔴 P0
**Branch**: `feature/#11-sidebar-structure`

**描述**:
建立 Sidebar 元件的基本結構和 Tab 切換

**任務清單**:
- [ ] 建立 `Sidebar.tsx` 主元件
- [ ] 使用 MUI Drawer 元件
- [ ] 實作 4 個 Tabs
- [ ] 實作響應式 (mobile: temporary, desktop: permanent)
- [ ] 整合到 Layout 元件
- [ ] 加入開關狀態管理

**檔案**:
- `frontend/src/components/Sidebar.tsx` (新建)
- `frontend/src/components/Layout.tsx` (修改)

**驗收條件**:
- ✅ Drawer 在 mobile 可滑出
- ✅ Desktop 固定在左側
- ✅ Tab 切換正常
- ✅ 樣式美觀

**預估時間**: 3-4 小時

**標籤**: `frontend`, `component`, `sidebar`, `priority-high`

---

### Issue #12: Sidebar Tab 1 - 我的聚會列表 🔴 P0
**Branch**: `feature/#12-sidebar-events-list`

**描述**:
實作「我的聚會」Tab，顯示進行中和歷史聚會

**任務清單**:
- [ ] 建立 `MyEventsList.tsx` 元件
- [ ] 實作「進行中」/「歷史記錄」切換
- [ ] 顯示聚會卡片（名稱、時間、人數）
- [ ] 點擊可進入聚會頁面
- [ ] 呼叫 `getMyEvents` API
- [ ] 加入空狀態提示

**檔案**:
- `frontend/src/components/MyEventsList.tsx` (新建)
- `frontend/src/components/Sidebar.tsx` (修改)

**驗收條件**:
- ✅ 列表正確顯示
- ✅ 切換功能正常
- ✅ 可導航到聚會頁面
- ✅ 空狀態友善

**預估時間**: 3-4 小時

**標籤**: `frontend`, `component`, `sidebar`, `priority-high`

---

### Issue #13: Sidebar Tab 2 - 個人統計 🟡 P1
**Branch**: `feature/#13-sidebar-stats`

**描述**:
實作個人統計 Tab，顯示參加次數、準時率等資料

**任務清單**:
- [ ] 建立 `PersonalStats.tsx` 元件
- [ ] 顯示統計數據:
  - 參加次數
  - 準時次數 / 遲到次數
  - 平均遲到時間
  - 被戳總次數
- [ ] 使用進度條視覺化準時率
- [ ] 呼叫 `getMyStats` API
- [ ] 加入圖表 (選用，如使用 recharts)

**檔案**:
- `frontend/src/components/PersonalStats.tsx` (新建)
- `frontend/src/components/Sidebar.tsx` (修改)

**驗收條件**:
- ✅ 所有統計正確顯示
- ✅ 進度條視覺化清楚
- ✅ 數字格式化友善
- ✅ Mobile 排版正確

**預估時間**: 3-4 小時

**標籤**: `frontend`, `component`, `sidebar`, `stats`, `priority-medium`

---

### Issue #14: Sidebar Tab 3 - 排行榜 🟡 P1
**Branch**: `feature/#14-sidebar-leaderboard`

**描述**:
實作排行榜 Tab，顯示準時王和遲到王

**任務清單**:
- [ ] 建立 `Leaderboards.tsx` 元件
- [ ] 實作「準時王」/「遲到王」切換
- [ ] 顯示前 10 名列表
- [ ] 高亮當前使用者
- [ ] 顯示排名、名字、數據
- [ ] 呼叫排行榜 API

**檔案**:
- `frontend/src/components/Leaderboards.tsx` (新建)
- `frontend/src/components/Sidebar.tsx` (修改)

**驗收條件**:
- ✅ 排行榜正確顯示
- ✅ 切換功能正常
- ✅ 當前使用者高亮
- ✅ 排版美觀

**預估時間**: 3-4 小時

**標籤**: `frontend`, `component`, `sidebar`, `leaderboard`, `priority-medium`

---

### Issue #15: Sidebar Tab 4 - 朋友 (Coming Soon) 🟢 P2
**Branch**: `feature/#15-sidebar-friends`

**描述**:
實作朋友 Tab 的 Coming Soon 佔位元件

**任務清單**:
- [ ] 建立 `ComingSoon.tsx` 元件
- [ ] 顯示「即將推出」訊息
- [ ] 列出未來功能預告
- [ ] 美觀的佔位設計

**檔案**:
- `frontend/src/components/ComingSoon.tsx` (新建)
- `frontend/src/components/Sidebar.tsx` (修改)

**驗收條件**:
- ✅ 顯示 Coming Soon 訊息
- ✅ 設計美觀

**預估時間**: 1 小時

**標籤**: `frontend`, `component`, `sidebar`, `priority-low`

---

### Issue #16: Navbar 擴充與整合 🔴 P0
**Branch**: `feature/#16-navbar-update`

**描述**:
更新 Navbar，加入漢堡選單、建立聚會按鈕等

**任務清單**:
- [ ] 加入漢堡選單按鈕 (mobile)
- [ ] 連結 Sidebar toggle 狀態
- [ ] 加入「建立聚會」按鈕
- [ ] 加入「查看結果」按鈕 (僅 EventRoom 頁面)
- [ ] 優化 mobile 排版
- [ ] 整合路由偵測

**檔案**:
- `frontend/src/components/Navbar.tsx` (修改)

**驗收條件**:
- ✅ 漢堡選單可開關 Sidebar
- ✅ 按鈕在正確頁面顯示
- ✅ Mobile 排版正確
- ✅ 觸控區域足夠

**預估時間**: 2-3 小時

**標籤**: `frontend`, `component`, `navbar`, `priority-high`

---

### Issue #17: Mobile-First RWD 優化 🔴 P0
**Branch**: `feature/#17-mobile-rwd`

**描述**:
全面優化 Mobile 體驗，確保所有頁面在手機上完美運作

**任務清單**:
- [ ] 調整 EventRoom 手機版佈局
- [ ] 優化觸控按鈕大小 (min 44px)
- [ ] 測試所有斷點 (xs, sm, md, lg)
- [ ] 優化 Sidebar 滑動手勢
- [ ] 調整字體大小和間距
- [ ] 測試橫豎屏切換
- [ ] 優化 EventResultPopup 手機版

**檔案**:
- `frontend/src/pages/EventRoom.tsx` (修改)
- `frontend/src/components/*.tsx` (修改多個)
- `frontend/src/theme/index.ts` (可能修改)

**驗收條件**:
- ✅ 所有頁面 mobile 完美顯示
- ✅ 觸控體驗流暢
- ✅ 無橫向滾動
- ✅ 所有按鈕易於點擊
- ✅ 在 iPhone 和 Android 測試通過

**預估時間**: 5-6 小時

**標籤**: `frontend`, `rwd`, `mobile`, `priority-high`

---

## Week 4: 動畫、優化與整合

### Issue #18: 動畫效果實作 🟡 P1
**Branch**: `feature/#18-animations`

**描述**:
加入各種動畫效果提升使用者體驗

**任務清單**:
- [ ] 頁面轉場動畫 (Fade)
- [ ] Sidebar 滑入/滑出動畫
- [ ] 成員標記更新動畫 (Pulse)
- [ ] 倒數計時顏色漸變
- [ ] 戳按鈕震動動畫
- [ ] 排行榜 stagger 動畫
- [ ] 紙屑動畫 (可用套件如 react-confetti)
- [ ] Toast 通知動畫

**檔案**:
- `frontend/src/styles/animations.css` (新建)
- 多個元件檔案 (加入動畫)

**驗收條件**:
- ✅ 所有動畫流暢 (60fps)
- ✅ 不影響效能
- ✅ 增強使用體驗
- ✅ Mobile 動畫正常

**預估時間**: 4-5 小時

**標籤**: `frontend`, `animation`, `ux`, `priority-medium`

---

### Issue #19: 效能優化 🟡 P1
**Branch**: `feature/#19-performance`

**描述**:
優化 React 效能，減少不必要的 re-render

**任務清單**:
- [ ] 使用 React.memo 包裝列表項目
- [ ] 使用 useCallback 包裝 Pusher callbacks
- [ ] 使用 useMemo 快取計算結果
- [ ] 地圖標記批次更新
- [ ] 圖片懶載入
- [ ] 檢查並修復 memory leaks

**檔案**:
- 多個元件檔案

**驗收條件**:
- ✅ React DevTools Profiler 無明顯問題
- ✅ 地圖更新流暢
- ✅ 無 memory leaks
- ✅ Bundle size 合理

**預估時間**: 3-4 小時

**標籤**: `frontend`, `performance`, `optimization`, `priority-medium`

---

### Issue #20: Guest 模式支援 🔴 P0
**Branch**: `feature/#20-guest-mode`

**描述**:
實作 Guest 模式，讓未登入使用者也能透過連結加入聚會

**任務清單**:
- [ ] 修改路由，EventRoom 不需要 ProtectedRoute
- [ ] 實作 Guest 加入流程
- [ ] Guest token 儲存在 localStorage
- [ ] Guest 暱稱輸入 Dialog
- [ ] Guest 與登入使用者的 UI 區別
- [ ] 處理 Guest 權限限制

**檔案**:
- `frontend/src/router.tsx` (修改)
- `frontend/src/pages/EventRoom.tsx` (修改)
- `frontend/src/components/GuestJoinDialog.tsx` (新建)

**驗收條件**:
- ✅ 未登入可訪問聚會連結
- ✅ Guest 可填暱稱加入
- ✅ Guest 功能正常運作
- ✅ Token 正確儲存
- ✅ 離開後可重新加入

**預估時間**: 4-5 小時

**標籤**: `frontend`, `auth`, `guest-mode`, `priority-high`

---

### Issue #21: 錯誤處理與 Loading 狀態 🟡 P1
**Branch**: `feature/#21-error-handling`

**描述**:
完善錯誤處理和 Loading 狀態顯示

**任務清單**:
- [ ] 加入全域錯誤邊界 (ErrorBoundary)
- [ ] API 錯誤統一處理
- [ ] 加入 Loading Skeleton
- [ ] 網路錯誤提示
- [ ] Pusher 連線失敗處理
- [ ] 定位失敗友善提示
- [ ] 404 頁面優化

**檔案**:
- `frontend/src/components/ErrorBoundary.tsx` (新建)
- `frontend/src/components/LoadingSkeleton.tsx` (新建)
- 多個頁面和元件

**驗收條件**:
- ✅ 所有錯誤有友善提示
- ✅ Loading 狀態清楚
- ✅ 網路斷線可恢復
- ✅ 不會白屏或卡死

**預估時間**: 3-4 小時

**標籤**: `frontend`, `error-handling`, `ux`, `priority-medium`

---

### Issue #22: 測試與 Bug 修復 🟡 P1
**Branch**: `feature/#22-testing-bugfix`

**描述**:
測試所有功能並修復發現的 bug

**任務清單**:
- [ ] 手動測試所有功能流程
- [ ] 測試不同裝置和瀏覽器
- [ ] 測試 Pusher 即時功能
- [ ] 測試極端情況 (0 人、100 人)
- [ ] 修復發現的 bug
- [ ] 撰寫關鍵功能的單元測試 (選用)

**檔案**:
- 多個檔案 (bug fix)

**驗收條件**:
- ✅ 所有功能正常運作
- ✅ 無明顯 bug
- ✅ 跨瀏覽器相容
- ✅ Mobile 測試通過

**預估時間**: 6-8 小時

**標籤**: `frontend`, `testing`, `bugfix`, `priority-medium`

---

### Issue #23: API 切換與整合測試 🔴 P0
**Branch**: `feature/#23-api-integration`

**描述**:
切換到真實 API，進行整合測試

**任務清單**:
- [ ] 將 `USE_MOCK_DATA` 改為 `false`
- [ ] 測試所有 API 端點
- [ ] 測試 Pusher 即時推送
- [ ] 修復 API 整合問題
- [ ] 確認資料格式一致
- [ ] 測試錯誤處理

**檔案**:
- `frontend/src/api/events.ts` (修改)
- 可能需要修改多個元件

**驗收條件**:
- ✅ 所有 API 正常運作
- ✅ Pusher 事件正確觸發
- ✅ 資料格式正確
- ✅ 錯誤處理完善
- ✅ 與後端整合無問題

**預估時間**: 4-6 小時

**標籤**: `frontend`, `backend`, `integration`, `priority-high`

---

## 📊 總結

### 優先級分佈
- 🔴 **P0 (必做)**: 14 個 issues
- 🟡 **P1 (重要)**: 7 個 issues  
- 🟢 **P2 (可選)**: 1 個 issue

### 預估總時間
- **Week 1**: 約 15-18 小時
- **Week 2**: 約 25-30 小時
- **Week 3**: 約 20-25 小時
- **Week 4**: 約 20-28 小時

**總計**: 約 80-100 小時

### 建議工作順序
1. 先完成 Week 1 的所有 issues (基礎設定)
2. Week 2 優先做 #10 (排行榜) - 最重要的視覺亮點
3. 其他 issues 可平行開發
4. Week 4 留給測試和整合

### 分支命名規範
所有 feature branch 都從 `frontend-dev` 分出來：
```bash
git checkout frontend-dev
git pull origin frontend-dev
git checkout -b feature/#1-api-spec-and-setup
```

### PR 流程
1. 完成 feature branch 開發
2. 自我測試
3. 提交 PR 到 `frontend-dev`
4. Code review
5. 合併後刪除 feature branch

---

**準備好開始了嗎？建議從 Issue #1 開始！** 🚀


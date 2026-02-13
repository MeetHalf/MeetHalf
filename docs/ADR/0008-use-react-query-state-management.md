# ADR-0008: 使用 React Query 進行伺服器狀態管理

## 狀態
已接受

## 背景
需要管理從 API 獲取的伺服器狀態，包括：
- 活動列表
- 聊天訊息
- 好友列表
- 通知列表

傳統的狀態管理方案（如 Redux）對於伺服器狀態管理過於複雜。

## 決策
使用 React Query (TanStack Query) 進行伺服器狀態管理。

## 理由
- **自動快取**:
  - 自動快取 API 響應
  - 減少不必要的 API 請求
  - 提高應用性能

- **樂觀更新**:
  - 支援樂觀更新，立即更新 UI
  - 提供回滾機制
  - 改善用戶體驗

- **後台重新驗證**:
  - 自動在背景重新獲取資料
  - 保持資料新鮮度
  - 可配置的重新驗證策略

- **與 Pusher 整合**:
  - 可以輕鬆整合 Pusher 即時更新
  - 使用 `queryClient.setQueryData` 更新快取
  - 保持 UI 與伺服器狀態同步

- **開發體驗**:
  - 簡單的 API
  - 優秀的 TypeScript 支援
  - 豐富的開發工具

## 替代方案考慮
- **Redux + RTK Query**: 功能強大但配置複雜
- **SWR**: 功能類似但生態系統較小
- **Apollo Client**: 主要針對 GraphQL

## 後果
- 需要學習 React Query 的概念（如 query keys、mutations）
- 對於簡單的本地狀態，仍需要使用 `useState`
- 但對於伺服器狀態管理，React Query 提供了最佳解決方案


# ADR-0007: 使用 Pusher Beams 實現推播通知

## 狀態
已接受

## 背景
需要實現 Web Push 通知功能，讓用戶在瀏覽器關閉時也能收到通知（如戳人提醒、活動更新等）。

## 決策
使用 Pusher Beams 作為推播通知解決方案。

## 理由
- **與 Pusher Channels 整合**:
  - 使用同一個服務提供商，簡化配置和管理
  - 統一的帳號和計費

- **Web Push 支援**:
  - 原生支援 Web Push API
  - 自動處理 Service Worker 註冊
  - 支援多平台（Web、iOS、Android）

- **Device Interest 模式**:
  - 可以針對特定設備或用戶發送通知
  - 支援興趣訂閱（如 `event-{id}-member-{id}`）
  - 靈活的通知路由

- **易於使用**:
  - 簡單的 SDK 和 API
  - 良好的文檔和範例

## 替代方案考慮
- **Firebase Cloud Messaging (FCM)**: 需要整合 Firebase，增加複雜度
- **OneSignal**: 功能豐富但配置較複雜
- **自建 Web Push**: 需要處理 VAPID 金鑰、Service Worker 等，開發成本高

## 後果
- 需要用戶授予通知權限
- 需要配置 Service Worker
- 依賴第三方服務
- 但 Pusher Beams 提供了最簡單且可靠的解決方案


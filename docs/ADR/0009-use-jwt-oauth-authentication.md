# ADR-0009: 使用 JWT + OAuth 進行身份驗證

## 狀態
已接受

## 背景
需要實現用戶身份驗證系統，支援：
- 傳統的電子郵件/密碼登入
- OAuth 登入（Google、GitHub）
- Guest 模式（無需註冊即可加入活動）
- 安全的會話管理

## 決策
使用 JWT (JSON Web Token) + OAuth 進行身份驗證。

## 實現細節
- **JWT Token**:
  - 存儲在 HttpOnly Cookie 中，防止 XSS 攻擊
  - 包含用戶 ID 和基本資訊
  - 設置過期時間

- **OAuth 整合**:
  - 支援 Google OAuth
  - 支援 GitHub OAuth
  - 使用 Passport.js 簡化 OAuth 流程

- **Guest Token**:
  - 為未註冊用戶生成臨時 token
  - 允許 Guest 用戶加入活動
  - 限制 Guest 用戶的功能

## 理由
- **安全性**:
  - HttpOnly Cookie 防止 XSS 攻擊
  - JWT 簽名確保 token 完整性
  - OAuth 避免密碼存儲風險

- **用戶體驗**:
  - OAuth 提供一鍵登入
  - Guest 模式降低使用門檻
  - 無需複雜的密碼重置流程

- **無狀態**:
  - JWT 無需伺服器端會話存儲
  - 適合 serverless 和分散式部署
  - 易於擴展

## 替代方案考慮
- **Session-based**: 需要伺服器端會話存儲，不適合 serverless
- **OAuth Only**: 限制用戶選擇，不支援傳統登入
- **API Keys**: 不適合用戶身份驗證

## 後果
- JWT 一旦發放無法撤銷（除非實現 token 黑名單）
- 需要處理 token 過期和刷新
- OAuth 整合需要額外的配置
- 但對於本專案需求，JWT + OAuth 是最佳選擇


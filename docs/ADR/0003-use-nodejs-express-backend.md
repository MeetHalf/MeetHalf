# ADR-0003: 使用 Node.js + Express + TypeScript 作為後端框架

## 狀態
已接受

## 背景
需要選擇一個後端框架來構建 RESTful API 和處理業務邏輯。主要需求包括：
- 與前端技術棧保持一致（TypeScript）
- 良好的性能和可擴展性
- 豐富的中間件生態系統
- 易於部署到 serverless 環境

## 決策
使用 Node.js + Express + TypeScript 作為後端技術棧。

## 理由
- **Node.js**:
  - 與前端使用相同的 JavaScript/TypeScript，降低上下文切換成本
  - 優秀的非同步 I/O 性能，適合處理大量並發請求
  - 豐富的 npm 生態系統

- **Express**:
  - 最流行的 Node.js Web 框架
  - 簡單且靈活的路由系統
  - 豐富的中間件生態系統
  - 易於整合其他服務（Pusher、Prisma 等）

- **TypeScript**:
  - 與前端保持一致，共享型別定義
  - 提供型別安全，減少 API 契約錯誤
  - 更好的重構支援

## 後果
- 單線程模型可能成為 CPU 密集型任務的瓶頸（但可通過 worker threads 解決）
- 需要額外的型別定義維護
- 與 Go、Rust 等編譯型語言相比，運行時性能可能較低，但對本專案需求已足夠


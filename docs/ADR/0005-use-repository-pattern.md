# ADR-0005: 使用 Repository 模式分離資料存取層

## 狀態
已接受

## 背景
需要組織後端代碼結構，確保業務邏輯與資料存取邏輯分離，提高可測試性和可維護性。

## 決策
採用 Repository 模式，將資料存取邏輯封裝在 Repository 層，業務邏輯放在 Service 層。

## 架構分層
```
Routes (API 端點)
  ↓
Services (業務邏輯)
  ↓
Repositories (資料存取)
  ↓
Prisma (ORM)
```

## 理由
- **關注點分離**:
  - Service 層專注於業務邏輯
  - Repository 層專注於資料存取
  - 清晰的職責劃分

- **可測試性**:
  - 可以輕鬆 mock Repository 層進行單元測試
  - Service 層測試不依賴實際資料庫

- **可維護性**:
  - 資料庫結構變更時，只需修改 Repository 層
  - 業務邏輯變更時，只需修改 Service 層

- **可重用性**:
  - 多個 Service 可以重用同一個 Repository
  - 減少重複的資料存取代碼

## 後果
- 增加了一層抽象，可能增加代碼量
- 需要團隊成員理解分層架構
- 對於簡單的 CRUD 操作，可能顯得過度設計
- 但對於複雜業務邏輯，這種分層帶來的好處遠大於成本


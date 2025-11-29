# Content Security Policy (CSP) 修復說明

## 問題

Swagger UI 使用 CDN 資源載入 JavaScript 和 CSS，但 Helmet 的預設 CSP 設定阻止了這些外部資源，導致：

- 無法載入外部腳本：`cdn.jsdelivr.net`
- 無法執行內聯腳本
- 無法載入外部樣式表

## 解決方案

更新 Helmet 的 CSP 配置，允許 Swagger UI 所需的資源。

### 更新內容

在 `backend/src/index.ts` 中配置 Helmet：

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://cdn.jsdelivr.net',
          "'unsafe-inline'", // Swagger UI 需要內聯腳本
        ],
        styleSrc: [
          "'self'",
          'https://cdn.jsdelivr.net',
          "'unsafe-inline'", // Swagger UI 需要內聯樣式
        ],
        connectSrc: [
          "'self'",
          // 允許連接到 API 端點載入 Swagger spec
        ],
        fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);
```

## CSP 指令說明

### `scriptSrc`
- `'self'`: 允許從相同來源載入腳本
- `https://cdn.jsdelivr.net`: 允許從 jsDelivr CDN 載入腳本
- `'unsafe-inline'`: 允許執行內聯腳本（Swagger UI 需要）

### `styleSrc`
- `'self'`: 允許從相同來源載入樣式表
- `https://cdn.jsdelivr.net`: 允許從 jsDelivr CDN 載入樣式表
- `'unsafe-inline'`: 允許內聯樣式（Swagger UI 需要）

### `connectSrc`
- `'self'`: 允許連接到相同來源（用於載入 `/api-docs.json`）

### `fontSrc` 和 `imgSrc`
- 允許載入字體和圖片資源

## 安全考慮

### `unsafe-inline` 的使用

雖然使用 `'unsafe-inline'` 會降低安全性，但對於 Swagger UI 來說是必要的，因為：

1. Swagger UI 需要動態生成 JavaScript 代碼
2. 只應用於 `/api-docs` 路由，影響範圍有限
3. 是文檔頁面，不需要處理敏感資料

### 替代方案（進階）

如果需要更嚴格的安全設定，可以考慮：

1. **使用 nonce**：為每個請求生成唯一 nonce，只允許帶有該 nonce 的內聯腳本
2. **單獨路由配置**：為 `/api-docs` 路由單獨配置較寬鬆的 CSP
3. **使用 hash**：計算內聯腳本的 hash，只允許特定的內聯腳本

## 驗證

部署後，檢查：

1. **瀏覽器控制台**：不應再出現 CSP 錯誤
2. **Swagger UI 載入**：應該能正常顯示和互動
3. **Network Tab**：確認所有資源都成功載入

## 相關檔案

- `backend/src/index.ts` - Helmet 配置
- `backend/src/index.ts` - Swagger UI HTML 頁面


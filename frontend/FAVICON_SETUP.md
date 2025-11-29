# Favicon 設置說明

## 當前設置

已將 favicon 相關程式碼添加到 `index.html`：

- ✅ 標準 favicon (`/favicon.ico`)
- ✅ 多尺寸支援（32x32, 16x16）
- ✅ Apple Touch Icon 支援（iOS 設備）
- ✅ Theme Color 設定

## Favicon 位置

Favicon 檔案位於：
```
frontend/public/favicon.ico
```

在 Vite 專案中，`public` 目錄下的檔案會被直接複製到建置輸出的根目錄，可以通過絕對路徑 `/favicon.ico` 訪問。

## 當前 HTML 設置

```html
<!-- Favicon -->
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/favicon.ico" />
```

## 進階優化（可選）

如果你想要更好的跨平台支援，可以創建多種尺寸的 favicon：

### 推薦的 Favicon 檔案

```
frontend/public/
├── favicon.ico          # 傳統 ICO 格式（16x16, 32x32, 48x48）
├── favicon-16x16.png    # 16x16 PNG
├── favicon-32x32.png    # 32x32 PNG
├── favicon-96x96.png    # 96x96 PNG
├── apple-touch-icon.png # 180x180 PNG (iOS)
└── android-chrome-192x192.png # 192x192 PNG (Android)
```

### 優化後的 HTML（可選）

如果你有多個 favicon 檔案，可以使用：

```html
<!-- Favicon -->
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />

<!-- Web App Manifest (可選) -->
<link rel="manifest" href="/site.webmanifest" />
```

### 創建多尺寸 Favicon 的工具

1. **線上工具**：
   - [Favicon Generator](https://realfavicongenerator.net/)
   - [Favicon.io](https://favicon.io/)

2. **命令行工具**：
   ```bash
   # 使用 ImageMagick
   convert favicon.png -define icon:auto-resize=16,32,48 favicon.ico
   ```

## 驗證

部署後，可以通過以下方式驗證 favicon 是否正常工作：

1. **瀏覽器標籤頁**：檢查是否顯示 favicon
2. **書籤**：將網站加入書籤，檢查書籤圖示
3. **移動設備**：在 iOS 上加入主畫面，檢查圖示
4. **開發工具**：檢查 Network tab 確認 favicon 載入成功

## 注意事項

- Favicon 檔案名稱必須是 `favicon.ico` 或通過 `<link>` 標籤明確指定
- 檔案必須放在 `public` 目錄下（Vite 專案）
- 更新 favicon 後，瀏覽器可能會有快取，需要清除快取或使用無痕模式測試
- 如果 favicon 沒有顯示，檢查瀏覽器控制台的 Network tab 是否有 404 錯誤

## 當前狀態

✅ Favicon 已設置並正確引用
✅ 支援標準瀏覽器
✅ 支援 iOS 設備
✅ 基本 Meta 標籤已添加

目前設置已經可以正常工作。如果需要更完整的跨平台支援，可以按照上述「進階優化」部分進行擴展。


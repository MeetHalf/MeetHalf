# 手機測試指南 - PWA 邀請連結功能

## 設置 ngrok

### 1. 安裝 ngrok
```bash
# 使用 Homebrew (Mac)
brew install ngrok

# 或下載 https://ngrok.com/download
```

### 2. 啟動前端開發伺服器
```bash
cd frontend
npm run dev
# 伺服器會在 http://localhost:5173 運行
```

### 3. 啟動 ngrok 隧道
```bash
# 在新的終端視窗中
ngrok http 5173
```

ngrok 會顯示一個 HTTPS URL，例如：
```
Forwarding  https://abc123.ngrok.io -> http://localhost:5173
```

### 4. 設置後端 API URL（如果需要）
如果後端也在本地運行，你需要：
1. 為後端也啟動一個 ngrok 隧道（端口 3000）
2. 在前端的 `.env` 或 `.env.local` 中設置：
   ```
   VITE_API_BASE_URL=https://your-backend-ngrok-url.ngrok.io
   ```

## 查看手機上的 Console Log

### iOS Safari

1. **在 Mac 上啟用 Web Inspector**：
   - 打開 Mac 的 Safari
   - Preferences → Advanced → 勾選 "Show Develop menu in menu bar"

2. **在 iPhone 上啟用 Web Inspector**：
   - Settings → Safari → Advanced → 開啟 "Web Inspector"

3. **連接設備並查看**：
   - 用 USB 連接 iPhone 到 Mac
   - 在 Mac 的 Safari: Develop → [你的 iPhone] → [網站名稱]
   - Console 會顯示在 Mac 的 Safari 開發者工具中

### Android Chrome

1. **連接設備**：
   - 用 USB 連接 Android 設備到電腦
   - 在 Android 設備上啟用 USB 調試：Settings → Developer Options → USB Debugging

2. **查看 Console**：
   - 在電腦上打開 Chrome
   - 訪問 `chrome://inspect`
   - 點擊 "inspect" 連結你的設備上的網站
   - Console 會顯示在電腦的 Chrome DevTools 中

### 替代方案：使用 Eruda（手機上的開發者工具）

如果你想直接在手機上查看 Console，可以添加 Eruda：

1. 在 `index.html` 中添加（僅開發環境）：
```html
<script>
  if (import.meta.env.DEV) {
    import('https://cdn.jsdelivr.net/npm/eruda@3.0.0/eruda.js')
      .then(eruda => eruda.init());
  }
</script>
```

## 日誌說明

所有日誌都使用前綴標識來源：

- `[App]` - App.tsx 組件的日誌
- `[RootLayout]` - 路由根布局的日誌
- `[PWA Navigation]` - PWA 導航處理器的日誌
- `[InvitePage]` - 邀請頁面的日誌

### 關鍵日誌點

1. **應用啟動時**：
   - `[App] ===== App Component Mounted =====`
   - 顯示初始 localStorage 狀態

2. **訪問邀請連結時**：
   - `[InvitePage] ===== Component Mounted =====`
   - `[InvitePage] ===== Storing Route in localStorage =====`
   - 顯示存儲前後的 localStorage 狀態

3. **從主畫面打開 PWA 時**：
   - `[RootLayout] ===== RootLayout Mounted =====`
   - `[PWA Navigation] ===== Handler Effect Triggered =====`
   - `[PWA Navigation] ===== Starting Check (after 200ms delay) =====`
   - 顯示檢查和導航過程

### localStorage 狀態日誌格式

每次檢查 localStorage 時，會顯示：
```javascript
{
  pending_invite_route: "/events/123",  // 待處理的路由
  allItems: {                            // 所有 localStorage 項目
    "pending_invite_route": "/events/123",
    // ... 其他項目
  },
  timestamp: "2025-12-20T12:34:56.789Z"  // 時間戳
}
```

## 測試流程

### 步驟 1：在手機瀏覽器中打開邀請連結

1. 使用 ngrok URL 訪問邀請連結：
   ```
   https://your-ngrok-url.ngrok.io/invite/你的token
   ```

2. **預期日誌**：
   ```
   [App] ===== App Component Mounted =====
   [RootLayout] ===== RootLayout Mounted =====
   [InvitePage] ===== Component Mounted =====
   [InvitePage] Token from URL: xxx
   [InvitePage] ===== Storing Route in localStorage =====
   [InvitePage] ✓ Successfully stored route in localStorage
   ```

3. **檢查 localStorage**：
   - 在 Console 中輸入：`localStorage.getItem('pending_invite_route')`
   - 應該返回：`"/events/123"`（或對應的 event ID）

### 步驟 2：加入主畫面

1. 按照頁面上的指示操作（iOS Safari 或 Android Chrome）
2. 確認應用程式圖示出現在主畫面

### 步驟 3：從主畫面打開 PWA

1. 從主畫面點擊應用程式圖示
2. **預期日誌**：
   ```
   [App] ===== App Component Mounted =====
   [RootLayout] ===== RootLayout Mounted =====
   [PWA Navigation] ===== Handler Effect Triggered =====
   [PWA Navigation] PWA Detection: { isPWA: true, ... }
   [PWA Navigation] ===== NAVIGATING TO PENDING ROUTE =====
   [PWA Navigation] From: /
   [PWA Navigation] To: /events/123
   [PWA Navigation] ✓ Removed pending route from localStorage
   ```

3. **應該自動跳轉到活動頁面**

## 疑難排解

### 問題：看不到任何日誌

- 確認已連接遠程調試工具（iOS Safari 或 Chrome DevTools）
- 確認瀏覽器控制台已打開
- 檢查是否有 JavaScript 錯誤阻止了代碼執行

### 問題：localStorage 沒有存儲

- 檢查是否有存儲錯誤日誌：`[InvitePage] ✗ Failed to store in localStorage`
- 確認瀏覽器允許使用 localStorage（不是無痕模式）
- 檢查瀏覽器存儲限制是否已滿

### 問題：PWA 打開時沒有自動導航

- 檢查 PWA 檢測日誌：`[PWA Navigation] PWA Detection`
- 確認 `isPWA: true`
- 檢查是否有 pending route：`[PWA Navigation] Checking localStorage`
- 確認當前路徑不是目標路徑（避免重複導航）

### 問題：日誌顯示在手機上，無法在電腦 terminal 看到

這是正常的！前端的 `console.log` 只會顯示在瀏覽器的開發者工具中。要查看：
- 使用上述的遠程調試方法（推薦）
- 或使用 Eruda 在手機上直接查看

## 快速測試命令

在瀏覽器 Console 中執行以下命令來檢查狀態：

```javascript
// 檢查 localStorage
localStorage.getItem('pending_invite_route')

// 檢查所有 localStorage
Object.keys(localStorage).reduce((obj, key) => {
  obj[key] = localStorage.getItem(key);
  return obj;
}, {})

// 檢查 PWA 狀態
console.log({
  standalone: window.navigator.standalone,
  displayMode: window.matchMedia('(display-mode: standalone)').matches
})

// 清除測試數據
localStorage.removeItem('pending_invite_route')
```


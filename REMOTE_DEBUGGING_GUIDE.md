# 遠程調試完整指南

## iOS Safari 遠程調試

### 前提條件
- ✅ Mac 電腦（必須）
- ✅ iPhone/iPad
- ✅ Lightning/USB-C 連接線

### 設置步驟

#### Step 1: iPhone 設定
1. 打開「設定」App
2. 滾動到「Safari」
3. 點擊「進階」
4. 開啟「Web Inspector」（網頁檢閱器）

#### Step 2: Mac Safari 設定
1. 打開 Safari 瀏覽器
2. 選單列：Safari → 偏好設定（Preferences）
3. 點擊「進階」標籤
4. 勾選「在選單列中顯示『開發』選單」

#### Step 3: 連接調試
1. 用 USB 線連接 iPhone 到 Mac
2. 在 iPhone 上打開你的網站
   - 在 Safari 瀏覽器中打開
   - 或從主畫面打開 PWA
3. 在 Mac 的 Safari 選單列：
   ```
   開發 → [你的 iPhone 名稱] → [網站/App 名稱]
   ```
4. 會彈出開發者工具視窗

#### 可用功能
- ✅ Console：查看所有 console.log
- ✅ Elements：檢查 DOM
- ✅ Network：查看網路請求
- ✅ Sources：調試 JavaScript
- ✅ Storage：查看 localStorage、cookies

#### 常見問題

**Q: 選單中沒有看到我的 iPhone**
- 確認已用 USB 線連接
- 確認 iPhone 已解鎖
- 在 iPhone 上點擊「信任此電腦」
- 重新啟動 Safari

**Q: 看到多個同名頁面**
- Safari 瀏覽器中的頁面會顯示在「Safari」下
- PWA（從主畫面打開）會顯示在 App 名稱下

---

## Android Chrome 遠程調試

### 前提條件
- ✅ 任何電腦（Windows/Mac/Linux）
- ✅ Android 手機（Android 4.4+）
- ✅ USB 連接線
- ✅ 電腦上安裝 Chrome 瀏覽器

### 設置步驟

#### Step 1: 啟用開發者模式
1. 打開「設定」
2. 滾動到「關於手機」
3. 連續點擊「版本號碼」或「Build number」7 次
4. 會顯示「您已成為開發人員」

#### Step 2: 啟用 USB 偵錯
1. 返回「設定」
2. 找到「系統」→「開發人員選項」
   （不同手機位置可能不同）
3. 開啟「USB 偵錯」
4. 開啟「USB 偵錯（安全性設定）」（如果有）

#### Step 3: 連接手機
1. 用 USB 線連接 Android 手機到電腦
2. 手機會彈出提示：「允許 USB 偵錯？」
3. 勾選「一律允許這部電腦進行偵錯」
4. 點擊「允許」

#### Step 4: 電腦端調試
1. 在電腦上打開 Chrome 瀏覽器
2. 在地址欄輸入：`chrome://inspect`
3. 確認「Discover USB devices」已勾選
4. 等待幾秒，會看到你的手機設備
5. 在手機上打開你的網站（Chrome 或 PWA）
6. 在電腦的 chrome://inspect 頁面會看到該頁面
7. 點擊「inspect」按鈕
8. 會彈出 DevTools 視窗

#### 可用功能
- ✅ Console：查看所有 console.log
- ✅ Elements：檢查 DOM
- ✅ Network：查看網路請求
- ✅ Sources：調試 JavaScript
- ✅ Application：查看 PWA、localStorage、Service Worker
- ✅ Performance：性能分析
- ✅ Lighthouse：PWA 審核

#### 進階功能

**截圖/錄屏：**
1. 在 DevTools 中按 `Cmd/Ctrl + Shift + P`
2. 輸入「screenshot」或「screencast」
3. 可以截取手機螢幕或錄製操作

**Port forwarding：**
在 chrome://inspect 中設置，可以讓手機訪問電腦的 localhost

#### 常見問題

**Q: 看不到我的設備**
- 確認 USB 線連接正常
- 確認已啟用 USB 偵錯
- 在手機上點擊「允許 USB 偵錯」
- 嘗試不同的 USB 端口
- 重新啟動 Chrome

**Q: 提示「Offline」**
- 手機可能鎖定了
- 解鎖手機後重試

**Q: 無法調試 WebView**
- 需要在 App 中啟用 WebView debugging
- PWA 不受此限制

---

## 方案 3：Eruda（無需連線的開發者工具）

如果你：
- ❌ 沒有 Mac（無法調試 iOS）
- ❌ 沒有 USB 線
- ❌ 無法啟用開發者模式

可以使用 **Eruda**，一個在手機上運行的開發者工具。

### 安裝方法

在 `frontend/index.html` 中添加：

```html
<!doctype html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MeetHalf</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    
    <!-- Eruda 開發者工具（僅開發模式） -->
    <script>
      // 檢查是否應該載入 Eruda
      const urlParams = new URLSearchParams(window.location.search);
      const shouldLoadEruda = 
        // 方法 1: URL 參數 ?eruda=true
        urlParams.get('eruda') === 'true' ||
        // 方法 2: localStorage
        localStorage.getItem('eruda_enabled') === 'true' ||
        // 方法 3: 開發模式（需要在 Vite 中設置）
        window.location.hostname === 'localhost';
      
      if (shouldLoadEruda) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/eruda';
        document.body.appendChild(script);
        script.onload = function() {
          eruda.init();
          console.log('✅ Eruda 開發者工具已啟用');
        };
      }
    </script>
  </body>
</html>
```

### 使用方法

**方法 1: URL 參數（臨時使用）**
```
https://your-site.com?eruda=true
```

**方法 2: localStorage（持久使用）**
在任何頁面的 Console 中執行：
```javascript
localStorage.setItem('eruda_enabled', 'true');
window.location.reload();
```

關閉：
```javascript
localStorage.removeItem('eruda_enabled');
window.location.reload();
```

**方法 3: 自動啟用（本地開發）**
在 localhost 會自動啟用

### Eruda 功能

啟用後，頁面右下角會出現一個藍色圖示 🔧

點擊後可以：
- ✅ Console：查看日誌
- ✅ Elements：檢查 DOM
- ✅ Network：查看請求
- ✅ Resources：查看 localStorage、cookies
- ✅ Sources：查看源碼
- ✅ Info：設備信息

### 優缺點

**優點：**
- ✅ 不需要電腦
- ✅ 不需要 USB 線
- ✅ iOS 和 Android 都可用
- ✅ 可以在任何地方使用

**缺點：**
- ❌ 功能較少（相比真正的 DevTools）
- ❌ 在小螢幕上操作不便
- ❌ 性能略有影響

---

## 快速對比

| 方法 | iOS | Android | 需要電腦 | 需要 USB | 功能完整度 |
|------|-----|---------|----------|----------|------------|
| Safari 遠程調試 | ✅ | ❌ | ✅ Mac | ✅ | ⭐⭐⭐⭐⭐ |
| Chrome 遠程調試 | ❌ | ✅ | ✅ 任何 | ✅ | ⭐⭐⭐⭐⭐ |
| Eruda | ✅ | ✅ | ❌ | ❌ | ⭐⭐⭐ |

---

## 推薦流程

### 你有 Mac + iPhone
→ 使用 Safari 遠程調試（最佳體驗）

### 你有任何電腦 + Android
→ 使用 Chrome 遠程調試（最佳體驗）

### 你沒有電腦或 USB 線
→ 使用 Eruda

### 你只想快速測試
→ 使用 Eruda + URL 參數：`?eruda=true`

---

## 測試 PWA 檢測的完整流程

### 1. 在瀏覽器中（驗證返回 false）

```javascript
// 在 Console 執行
console.log('Browser Test:', {
  standalone: window.navigator.standalone,
  displayMode: window.matchMedia('(display-mode: standalone)').matches,
  isPWA: window.navigator.standalone === true || 
         window.matchMedia('(display-mode: standalone)').matches
});
```

預期：`isPWA: false`

### 2. 加入主畫面

按照手機系統的指示添加

### 3. 從主畫面打開 PWA（驗證返回 true）

- **關閉瀏覽器**（重要！）
- 從主畫面圖示打開
- 連接遠程調試
- 執行相同的測試

預期：`isPWA: true`

### 4. 測試完整導航流程

```javascript
// 設置測試數據
localStorage.setItem('pending_invite_route', '/events/999');

// 重新載入
window.location.reload();

// 應該會看到自動跳轉到 /events/999
```

---

## 需要幫助嗎？

如果遇到問題，提供以下資訊：
1. 手機型號和系統版本（iOS/Android）
2. 使用的調試方法
3. 看到的錯誤訊息
4. Console 的輸出


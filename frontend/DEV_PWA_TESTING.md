# 開發模式 PWA 測試指南

## 快速測試 PWA 邏輯（無需實際加入主畫面）

在開發過程中，你可以使用以下方法強制啟用 PWA 模式，無需每次都從手機加入主畫面。

## 方法 1：使用 URL 參數（推薦，臨時測試）

在任何頁面的 URL 後面加上 `?force_pwa=true`：

```
http://localhost:5173/events?force_pwa=true
```

這會讓 `isPWA()` 函數返回 `true`，模擬 PWA 模式。

### 完整測試流程

1. **在瀏覽器中設置 pending route**：
   ```javascript
   // 在瀏覽器 Console 中執行
   localStorage.setItem('pending_invite_route', '/events/123');
   console.log('✓ Set pending route:', localStorage.getItem('pending_invite_route'));
   ```

2. **訪問帶有 force_pwa 的頁面**：
   ```
   http://localhost:5173/events?force_pwa=true
   ```

3. **檢查 Console 日誌**：
   - 應該看到 `[isPWA] 🔧 DEV MODE: Forcing PWA mode via override`
   - 應該看到 `[Events] ===== NAVIGATING TO PENDING ROUTE =====`
   - 應該自動跳轉到 `/events/123`

## 方法 2：使用 localStorage（持久化，整個開發階段）

如果你想在整個開發階段都模擬 PWA 模式：

```javascript
// 在瀏覽器 Console 中執行一次
localStorage.setItem('dev_force_pwa', 'true');
console.log('✓ PWA dev mode enabled');
```

之後每次訪問頁面都會自動啟用 PWA 模式。

### 關閉 PWA 開發模式

```javascript
// 在 Console 中執行
localStorage.removeItem('dev_force_pwa');
console.log('✓ PWA dev mode disabled');
```

## 完整測試場景示例

### 場景：測試邀請連結 → PWA 導航流程

1. **清除舊數據**（可選）：
   ```javascript
   localStorage.clear();
   ```

2. **模擬用戶在瀏覽器中打開邀請連結**：
   ```
   http://localhost:5173/invite/your-token-here
   ```
   
   或手動設置：
   ```javascript
   localStorage.setItem('pending_invite_route', '/events/456');
   ```

3. **啟用 PWA 模式並訪問主頁**：
   ```
   http://localhost:5173/events?force_pwa=true
   ```

4. **預期結果**：
   - Console 顯示 PWA 檢測為 true
   - 自動從 `/events` 跳轉到 `/events/456`
   - localStorage 中的 `pending_invite_route` 被清除

## 檢查命令

在 Console 中執行以下命令來檢查狀態：

```javascript
// 檢查 PWA 狀態
console.log('PWA Status:', {
  isPWAForced: localStorage.getItem('dev_force_pwa') === 'true',
  standalone: window.navigator.standalone,
  displayMode: window.matchMedia('(display-mode: standalone)').matches,
});

// 檢查 pending route
console.log('Pending Route:', localStorage.getItem('pending_invite_route'));

// 一鍵測試設置
localStorage.setItem('dev_force_pwa', 'true');
localStorage.setItem('pending_invite_route', '/events/999');
console.log('✓ Test setup complete! Refresh page to test.');

// 清除測試數據
localStorage.removeItem('dev_force_pwa');
localStorage.removeItem('pending_invite_route');
console.log('✓ Test data cleared');
```

## 調試技巧

### 1. 查看所有 localStorage 內容
```javascript
Object.keys(localStorage).forEach(key => {
  console.log(`${key}: ${localStorage.getItem(key)}`);
});
```

### 2. 監控 localStorage 變化
```javascript
// 添加到頁面頂部
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  console.log(`[localStorage] SET ${key} =`, value);
  originalSetItem.apply(this, arguments);
};

const originalRemoveItem = localStorage.removeItem;
localStorage.removeItem = function(key) {
  console.log(`[localStorage] REMOVE ${key}`);
  originalRemoveItem.apply(this, arguments);
};
```

### 3. 強制重新檢查 pending route
如果頁面已經檢查過，可以重新載入：
```javascript
window.location.reload();
```

## 注意事項

- ⚠️ 這些 override 僅用於開發測試
- ⚠️ 部署到生產環境時，這些 override 仍然有效，但只有知道的開發者才會使用
- ⚠️ 記得在完成測試後清除 `dev_force_pwa`，以便測試真實的 PWA 檢測邏輯

## 與實際 PWA 的差異

使用 `force_pwa=true` 時：
- ✅ 模擬 PWA 檢測邏輯
- ✅ 觸發 pending route 導航
- ✅ localStorage 行為相同
- ❌ 不會有真正的 Service Worker
- ❌ 不會有獨立的應用視窗
- ❌ 不會有推送通知功能

如需測試這些功能，仍需在實際設備上安裝 PWA。


# 手機 PWA 測試檢查清單

## 測試前準備

確認以下條件都滿足：

### 1. manifest.json 配置正確
檢查 `frontend/public/manifest.json`：
```json
{
  "display": "standalone",  // ← 必須是 standalone
  "start_url": "/",
  ...
}
```

### 2. Service Worker 已註冊
在瀏覽器 DevTools → Application → Service Workers
確認有一個 active 的 service worker

## 測試流程

### 階段 1：在瀏覽器中（應該返回 false）

1. 在手機瀏覽器（Safari/Chrome）中訪問你的應用
2. 打開遠程調試（Mac Safari DevTools 或 Chrome DevTools）
3. 在 Console 執行：
```javascript
console.log('Browser Test:', {
  standalone: window.navigator.standalone,
  displayMode: window.matchMedia('(display-mode: standalone)').matches,
  isPWA: window.navigator.standalone === true || 
         window.matchMedia('(display-mode: standalone)').matches
});
```

**預期結果**：
```
{
  standalone: undefined,  // iOS Safari
  displayMode: false,
  isPWA: false  ✅
}
```

### 階段 2：加入主畫面

**iOS Safari：**
1. 點擊分享按鈕（方塊+向上箭頭）
2. 滾動找到「加入主畫面螢幕」
3. 確認添加

**Android Chrome：**
1. 點擊右上角三點選單
2. 選擇「加到主畫面」或「安裝應用程式」
3. 確認添加

### 階段 3：從主畫面打開（應該返回 true）

1. **關閉瀏覽器** 或切換到其他 App
2. 從主畫面點擊應用圖示打開
3. 重新連接遠程調試
4. 在 Console 執行相同的測試：

```javascript
console.log('PWA Test:', {
  standalone: window.navigator.standalone,
  displayMode: window.matchMedia('(display-mode: standalone)').matches,
  isPWA: window.navigator.standalone === true || 
         window.matchMedia('(display-mode: standalone)').matches
});
```

**預期結果**：
```
iOS Safari PWA:
{
  standalone: true,  ✅
  displayMode: false,
  isPWA: true  ✅
}

Android Chrome PWA:
{
  standalone: undefined,
  displayMode: true,  ✅
  isPWA: true  ✅
}
```

## 完整功能測試

### 測試邀請連結 → PWA 導航

1. **在瀏覽器中打開邀請連結**：
```javascript
// 訪問 http://your-ngrok-url/invite/some-token
// 或手動設置：
localStorage.setItem('pending_invite_route', '/events/456');
console.log('✓ Pending route set:', localStorage.getItem('pending_invite_route'));
```

2. **加入主畫面**（如果還沒加入）

3. **關閉瀏覽器，從主畫面打開 PWA**

4. **檢查日誌**，應該看到：
```
[Events] ===== Component Mounted =====
[Events] ===== Checking for Pending Route =====
[Events] PWA Detection: { isPWA: true, ... }
[Events] ===== NAVIGATING TO PENDING ROUTE =====
[Events] From: /events
[Events] To: /events/456
```

5. **確認自動跳轉到 /events/456**

## 疑難排解

### 問題：從主畫面打開仍然顯示 isPWA: false

**iOS 可能原因：**
- 不是從主畫面圖示打開，而是從 Safari 的「最近使用」
- 使用了「無痕模式」添加
- iOS 版本太舊（需要 iOS 11.3+）

**解決方法：**
1. 完全關閉 Safari
2. 確認主畫面有應用圖示
3. 直接點擊圖示打開
4. 檢查是否有獨立的應用視窗（沒有瀏覽器地址欄）

**Android 可能原因：**
- manifest.json 配置錯誤
- Service Worker 未正確註冊
- Chrome 版本太舊

**解決方法：**
1. 檢查 manifest.json 的 `display: "standalone"`
2. DevTools → Application → Manifest 確認配置
3. DevTools → Application → Service Workers 確認已註冊

### 問題：有 pending route 但沒有自動跳轉

檢查：
```javascript
// 檢查所有相關狀態
console.log('Debug:', {
  isPWA: window.matchMedia('(display-mode: standalone)').matches,
  pendingRoute: localStorage.getItem('pending_invite_route'),
  currentPath: window.location.pathname,
});
```

確認：
1. `isPWA` 是 `true`
2. `pendingRoute` 存在且不是 `/events`
3. 查看 Console 是否有錯誤

### 使用開發模式強制測試

如果實際 PWA 檢測有問題，可以先用開發模式驗證邏輯：

```javascript
// 在手機瀏覽器 Console 中執行
localStorage.setItem('dev_force_pwa', 'true');
localStorage.setItem('pending_invite_route', '/events/789');
window.location.reload();
```

這樣可以確認：
- ✅ 如果這樣可以跳轉 → 邏輯正確，是 PWA 檢測的問題
- ❌ 如果這樣也不能跳轉 → 是導航邏輯的問題

## 檢查清單

在報告「無法工作」之前，請確認：

- [ ] 在瀏覽器中 `isPWA` 返回 `false`（正常）
- [ ] 從主畫面打開後 `isPWA` 返回 `true`
- [ ] `localStorage.getItem('pending_invite_route')` 有值
- [ ] Console 有看到 `[Events] PWA Detection` 的日誌
- [ ] 沒有 JavaScript 錯誤
- [ ] 使用 `dev_force_pwa` 測試邏輯可以正常工作


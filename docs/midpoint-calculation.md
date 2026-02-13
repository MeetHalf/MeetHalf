# MeetHalf 聚會中點計算技術文件

## 概述

MeetHalf 提供兩種中點計算方式：

1. **簡單幾何中點**：快速計算座標平均值
2. **MeetHalf 算法**：考慮交通時間的迭代優化

---

## 0. 取得定位

### 前端定位流程

**使用瀏覽器 Geolocation API**
```typescript
navigator.geolocation.watchPosition(
  async (position) => {
    const { latitude, longitude } = position.coords;
    // 更新到後端
    await eventsApi.updateLocation(eventId, { lat, lng });
  },
  { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
);
```

**時間窗口限制**
- 生產模式：活動開始前 30 分鐘 ~ 結束後 30 分鐘
- 開發模式：活動結束前任何時間 ~ 結束後 30 分鐘

**節流機制**
- 更新間隔：30 秒（避免過頻繁的 API 調用）
- 本地狀態立即更新（地圖即時顯示）
- 後端更新節流（減少伺服器負擔）

**後端驗證**
- 檢查是否在活動時間窗口內
- 驗證座標有效性
- 觸發 Pusher 事件廣播位置更新
- 自動計算 ETA（若活動有集合地點）

### API
- `PUT /events/:id/members/:memberId/location` - 更新成員位置

---

## 1. 簡單幾何中點

### 計算流程

1. **計算幾何中心**
```typescript
const midpoint = {
  lat: members.reduce((sum, m) => sum + m.lat, 0) / members.length,
  lng: members.reduce((sum, m) => sum + m.lng, 0) / members.length
};
```

2. **反向地理編碼** → 取得地址
3. **計算交通時間** → 使用 Directions API（支援 driving/transit/walking/bicycling/motorcycle）
4. **查找附近地點** → 1.5 公里內推薦餐廳（前 3 個）

### API
- `GET /events/:id/midpoint`
- `POST /events/calculate-midpoint`

---

## 2. MeetHalf 算法

### 優化目標
- `minimize_max`：最小化最長交通時間
- `minimize_total`：最小化總交通時間

### 算法流程

**階段 1：初始化**
從幾何中心開始

**階段 2：迭代優化（最多 5 次）**
1. 使用 Distance Matrix API 計算所有成員到當前點的交通時間
2. 根據目標函數評估（max 或 total）
3. 向最慢成員方向移動 500 米
4. 若距離最慢成員 < 閾值則收斂

```typescript
// 找出最慢成員並移動
const maxTime = Math.max(...travelTimes);
const slowestMember = members[maxTimeIdx];
currentLat += (slowestMember.lat - currentLat) / distance * 0.005;
```

**階段 3：查找實際地點**
在優化點附近 1 公里內查找咖啡廳（最多 20 個候選）

**階段 4：評分候選地點**
- 使用 Distance Matrix API 批量計算所有成員到所有候選地點的時間
- 根據目標函數評分，選擇最佳地點

**階段 5：返回結果**
地點資訊 + 各成員交通時間統計

### API
- `GET /events/:id/midpoint_by_time?objective=minimize_max|minimize_total`

---

## 3. 緩存機制

- 緩存鍵：活動 ID + 成員位置 + 交通方式 + 優化目標
- TTL：簡單中點 5 分鐘，MeetHalf 算法 10 分鐘
- 支援強制重新計算：`?forceRecalculate=true`

---

## 4. Google Maps Routes API

### 現有問題
- 迭代優化：N 個成員 × 5 次迭代 = 大量 API 調用
- 候選地點：N 個成員 × M 個候選 = N×M 次調用
- 需手動處理 fallback 邏輯

### Routes API 優勢
- 批量計算：一次請求處理多個路線
- 統一介面：減少 API 調用 70-80%
- 簡化代碼：降低複雜度 30-40%

### 遷移考量
1. 確認 SDK 支援
2. 評估成本差異
3. 小規模測試後逐步遷移

---

## 5. 技術架構

### 使用的 API
- **Directions API**：單一路線計算
- **Distance Matrix API**：批量距離/時間計算
- **Places Nearby API**：查找附近地點
- **Geocoding API**：地址轉換

### 資料流程
```
請求 → 驗證 → 檢查緩存 → 計算中點 → 調用 Google Maps API → 緩存結果 → 返回
```

---

## 總結

- **定位追蹤**：使用瀏覽器 Geolocation API，時間窗口限制 + 節流機制
- **簡單幾何中點**：快速預覽，適合建立活動前
- **MeetHalf 算法**：精確優化，考慮交通時間公平性
- **未來優化**：可考慮遷移至 Routes API 簡化實現

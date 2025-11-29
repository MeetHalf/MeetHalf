# Google Maps Directions API - Request/Response 邏輯說明

## 概述

Directions API 用於計算兩點之間的路線，包含行車路線、步行路線、單車路線或大眾運輸路線。

## API 位置

專案中 Directions API 的使用位置：

1. **`backend/src/routes/maps.ts`** - 獨立的 Directions API 端點
2. **`backend/src/routes/groups.ts`** - 在群組功能中使用：
   - 計算成員到中點的旅行時間
   - 取得所有成員到中點的路線

---

## 1. 獨立的 Directions API 端點

### 端點
```
POST /maps/directions
```

### Request（請求）

#### Request Body Schema
```typescript
{
  origin: {
    lat: number,      // 起點緯度
    lng: number       // 起點經度
  },
  destination: {
    lat: number,      // 終點緯度
    lng: number       // 終點經度
  },
  mode: 'driving' | 'walking' | 'bicycling' | 'transit',  // 交通模式（預設：transit）
  departureTime: 'now' | '2024-01-01T10:00:00Z'  // 出發時間（預設：now）
}
```

#### 實際發送到 Google Maps API 的 Request
```javascript
{
  params: {
    origin: "25.033,121.565",           // 格式：lat,lng
    destination: "25.034,121.566",      // 格式：lat,lng
    mode: "driving",                     // 交通模式
    departure_time: 1704110400,         // Unix 時間戳（秒）
    key: "YOUR_API_KEY"                 // Google Maps API Key
  }
}
```

#### 代碼實作
```typescript
// backend/src/routes/maps.ts:268-288
router.post('/directions', async (req: Request, res: Response) => {
  const { origin, destination, mode, departureTime } = directionsBodySchema.parse(req.body);
  
  // 轉換出發時間為 Unix 時間戳
  const departure = departureTime === 'now' 
    ? Date.now() / 1000 
    : new Date(departureTime).getTime() / 1000;

  const response = await gmapsClient.directions({
    params: {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      mode: mode as any,
      departure_time: Math.floor(departure),
      key: GMAPS_KEY,
    },
  });
  
  // ... 處理回應
});
```

---

### Response（回應）

#### Google Maps API 原始回應結構
```typescript
{
  data: {
    status: "OK" | "NOT_FOUND" | "ZERO_RESULTS" | "MAX_ROUTE_LENGTH_EXCEEDED",
    routes: [
      {
        bounds: {
          northeast: { lat: number, lng: number },
          southwest: { lat: number, lng: number }
        },
        legs: [
          {
            distance: {
              text: "2.5 km",      // 人類可讀的距離
              value: 2500          // 距離（公尺）
            },
            duration: {
              text: "15 分鐘",     // 人類可讀的時間
              value: 900           // 時間（秒）
            },
            duration_in_traffic: {
              text: "20 分鐘",
              value: 1200
            },
            start_address: "起始地址",
            end_address: "終點地址",
            start_location: { lat: number, lng: number },
            end_location: { lat: number, lng: number },
            steps: [
              {
                distance: { text: string, value: number },
                duration: { text: string, value: number },
                start_location: { lat: number, lng: number },
                end_location: { lat: number, lng: number },
                polyline: { points: string },
                html_instructions: string,
                travel_mode: string,
                // ... 更多詳細步驟資訊
              }
            ]
          }
        ],
        overview_polyline: {
          points: "encoded_polyline_string"  // 用於在地圖上繪製路線
        },
        summary: "路線摘要",
        warnings: [],
        waypoint_order: []
      }
    ],
    geocoded_waypoints: [],
    available_travel_modes: []
  }
}
```

#### 專案中簡化後的回應
```typescript
// backend/src/routes/maps.ts:290-297
const route = response.data.routes[0];
const leg = route.legs[0];

const result = {
  duration: leg.duration,           // { text: "15 分鐘", value: 900 }
  distance: leg.distance,           // { text: "2.5 km", value: 2500 }
  overview_polyline: route.overview_polyline  // { points: "encoded_string" }
};
```

#### 最終 API 回應
```json
{
  "duration": {
    "text": "15 分鐘",
    "value": 900
  },
  "distance": {
    "text": "2.5 km",
    "value": 2500
  },
  "overview_polyline": {
    "points": "encoded_polyline_string_here"
  },
  "cached": false
}
```

---

## 2. 在群組功能中使用 Directions API

### 使用場景 1: 計算成員到中點的旅行時間

**位置**: `backend/src/routes/groups.ts:565-586`

#### 用途
計算每個群組成員從自己的位置到中點需要多長時間。

#### Request
```typescript
// 對每個成員分別呼叫
gmapsClient.directions({
  params: {
    origin: `${member.lat},${member.lng}`,      // 成員位置
    destination: `${midpoint.lat},${midpoint.lng}`,  // 中點位置
    mode: member.travelMode || 'driving',       // 成員的交通模式
    key: GMAPS_KEY
  }
});
```

#### Response 處理
```typescript
const route = directionsResult.data.routes[0];
const leg = route.legs[0];

return {
  userId: member.userId,
  userEmail: member.user?.email || member.nickname || 'Unknown',
  travelMode: member.travelMode || 'driving',
  duration: leg.duration.text,           // "15 分鐘"
  durationValue: leg.duration.value,     // 900 (秒)
  distance: leg.distance.text,           // "2.5 km"
  distanceValue: leg.distance.value      // 2500 (公尺)
};
```

### 使用場景 2: 取得所有成員到中點的路線

**位置**: `backend/src/routes/groups.ts:1173-1193`

#### 用途
取得每個成員到中點的完整路線（包含 polyline 用於地圖繪製）。

#### Request
```typescript
// 對每個成員分別呼叫
gmapsClient.directions({
  params: {
    origin: `${member.lat},${member.lng}`,
    destination: `${midpointLat},${midpointLng}`,
    mode: (member.travelMode || 'driving') as any,
    key: GMAPS_KEY
  }
});
```

#### Response 處理
```typescript
const route = directionsResult.data.routes[0];
const leg = route.legs[0];

routes.push({
  memberId: member.userId || 0,
  memberEmail: member.user?.email || member.nickname || 'Unknown',
  polyline: route.overview_polyline.points,  // 用於在地圖上繪製路線
  duration: leg.duration.value,              // 秒
  distance: leg.distance.value               // 公尺
});
```

---

## 3. 關鍵概念說明

### 3.1 Routes（路線）
- 一個 Directions API 回應可能包含**多條路線**
- 通常使用 `routes[0]` 取得最佳路線
- 每條路線包含多個 `legs`（路段）

### 3.2 Legs（路段）
- 一條路線可能由多個路段組成（例如：起點 → 中轉點 → 終點）
- 在簡單的點對點路線中，通常只有一個 leg：`legs[0]`
- Leg 包含：
  - `distance`: 距離資訊
  - `duration`: 時間資訊
  - `steps`: 詳細的轉向指示

### 3.3 Overview Polyline
- **編碼的路線坐標**，用於在地圖上繪製路線
- 使用 Google Maps JavaScript API 的 `Polyline` 類別可以解碼並顯示
- 格式：編碼字串，非常緊湊

### 3.4 Duration vs Duration in Traffic
- `duration`: 預估時間（不考慮即時交通）
- `duration_in_traffic`: 考慮即時交通的時間（僅在 `mode=driving` 且有 `departure_time` 時提供）

### 3.5 交通模式（Mode）
- `driving`: 開車
- `walking`: 步行
- `bicycling`: 單車
- `transit`: 大眾運輸（需要 `departure_time` 參數）

---

## 4. 快取機制

### 快取策略
```typescript
// backend/src/routes/maps.ts:271-276
const cacheKey = makeCacheKey('directions', { 
  origin, 
  destination, 
  mode, 
  departureTime 
});

const cached = directionsCache.get(cacheKey);
if (cached) {
  return res.json({ ...cached, cached: true });
}
```

### 快取 TTL
- **5 分鐘**（`5 * 60 * 1000` 毫秒）
- 相同參數的請求在 5 分鐘內會使用快取結果

---

## 5. 錯誤處理

### 常見狀態碼
- `OK`: 成功
- `NOT_FOUND`: 找不到路線
- `ZERO_RESULTS`: 無結果
- `MAX_ROUTE_LENGTH_EXCEEDED`: 路線太長

### 錯誤處理範例
```typescript
try {
  const response = await gmapsClient.directions({ ... });
  
  if (response.data.status === 'OK' && response.data.routes.length > 0) {
    // 處理成功回應
  } else {
    // 處理錯誤狀態
    console.error('Directions API error:', response.data.status);
  }
} catch (error) {
  console.error('Directions error:', error);
  // 返回錯誤回應
}
```

---

## 6. 完整請求流程圖

```
1. 前端/後端發起請求
   ↓
2. 驗證請求參數（Zod schema）
   ↓
3. 檢查快取
   ├─ 有快取 → 返回快取結果
   └─ 無快取 → 繼續
   ↓
4. 準備 Google Maps API 參數
   - 轉換坐標格式：{lat, lng} → "lat,lng"
   - 轉換時間：'now' → Unix timestamp
   ↓
5. 呼叫 Google Maps Directions API
   ↓
6. 處理 API 回應
   - 提取 routes[0]
   - 提取 legs[0]
   - 提取 duration, distance, overview_polyline
   ↓
7. 儲存到快取（TTL: 5分鐘）
   ↓
8. 返回簡化的回應給客戶端
```

---

## 7. 與 Distance Matrix API 的差異

### Directions API
- **用途**: 取得詳細路線資訊（包含轉向指示、路線形狀）
- **回應**: 完整的路線資訊、polyline、步驟
- **使用場景**: 需要在地圖上顯示路線、提供導航指示

### Distance Matrix API
- **用途**: 批量計算多個起點到多個終點的距離和時間
- **回應**: 距離和時間矩陣
- **使用場景**: 比較多個目的地，選擇最佳選項（例如：在 `midpoint_by_time` 中使用）

---

## 8. 實際使用範例

### 範例 1: 取得兩點間的開車路線
```typescript
const response = await gmapsClient.directions({
  params: {
    origin: "25.033,121.565",
    destination: "25.034,121.566",
    mode: "driving",
    departure_time: Math.floor(Date.now() / 1000),
    key: GMAPS_KEY
  }
});

const route = response.data.routes[0];
const leg = route.legs[0];

console.log(`距離: ${leg.distance.text}`);      // "2.5 km"
console.log(`時間: ${leg.duration.text}`);      // "15 分鐘"
console.log(`路線編碼: ${route.overview_polyline.points}`);
```

### 範例 2: 取得大眾運輸路線
```typescript
const response = await gmapsClient.directions({
  params: {
    origin: "25.033,121.565",
    destination: "25.034,121.566",
    mode: "transit",
    departure_time: Math.floor(Date.now() / 1000),  // 必須提供
    key: GMAPS_KEY
  }
});

// 大眾運輸路線會包含多個 legs（換乘）
response.data.routes[0].legs.forEach((leg, index) => {
  console.log(`路段 ${index + 1}:`);
  console.log(`  方式: ${leg.steps[0].travel_mode}`);
  console.log(`  時間: ${leg.duration.text}`);
});
```

---

## 9. 最佳實踐

1. **使用快取**: 避免重複請求相同的路線
2. **處理錯誤**: 檢查 `status` 和 `routes.length`
3. **提供 fallback**: 如果主要交通模式失敗，嘗試其他模式
4. **考慮即時交通**: 使用 `departure_time` 和 `duration_in_traffic`
5. **限制請求頻率**: 注意 API 配額和速率限制

---

## 相關檔案

- **API 端點**: `backend/src/routes/maps.ts`
- **Schema 定義**: `backend/src/schemas/maps.ts`
- **群組功能使用**: `backend/src/routes/groups.ts`
- **Google Maps 客戶端**: `backend/src/lib/gmaps.ts`
- **快取機制**: `backend/src/lib/cache.ts`


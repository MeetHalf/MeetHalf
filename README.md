# MeetHalf - 聚會即時定位追蹤

> 讓每次聚會都不再等待，即時掌握大家位置，記錄誰準時誰遲到

## 🎯 專案簡介

MeetHalf 是一個**聚會即時定位追蹤應用**，解決朋友聚會時「不知道大家到哪了」、「誰又遲到了」的問題。

### 核心功能

**📍 即時定位追蹤**
- 集合前後 30 分鐘自動追蹤成員位置
- 即時地圖顯示所有人的位置
- Pusher 推送，位置更新零延遲

**👥 Guest 模式**
- 無需註冊，填暱稱就能加入
- 一鍵分享連結邀請朋友

**⏰ 到達記錄**
- 點擊「我到了」標記到達時間
- 自動計算準時/遲到
- 戳遲到的朋友（限制 3 次）

**🏆 聚會結束排行榜**
- 金銀銅牌前三名
- 遲到統計與被戳排名
- 儲存歷史記錄

### 可選功能

**🗺️ MeetHalf 智能中點計算**（選用）
- 建立聚會時可選擇用 MeetHalf 找中間點
- 考慮交通時間計算最公平的會面點
- 支援多種交通方式

---

## 🚀 快速開始

### 前置需求

- Node.js 18+
- Google Maps API Key
- Pusher Account（免費方案即可）

### 1. Clone 專案

```bash
git clone https://github.com/MeetHalf/MeetHalf.git
cd MeetHalf
```

### 2. 後端設定

```bash
cd backend
npm install
cp .env.example .env
# 編輯 .env 填入：
# - JWT_SECRET
# - DATABASE_URL
# - PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER

npm run prisma:migrate
npm run dev  # Port 3000
```

### 3. 前端設定

```bash
cd frontend
npm install
cp .env.example .env
# 編輯 .env 填入：
# - VITE_GOOGLE_MAPS_JS_KEY
# - VITE_PUSHER_KEY
# - VITE_PUSHER_CLUSTER

npm run dev  # Port 5173
```

### 4. 訪問應用

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health Check: http://localhost:3000/healthz

---

## 📖 使用者流程

### 主揪（Organizer）

1. **建立聚會**
   - 填寫名稱、時間
   - 選擇地點（直接選 / 用 MeetHalf 計算）
   - 取得分享連結

2. **分享連結**
   - 貼到 Line / Messenger / IG
   - 朋友點開連結就能加入

3. **活動當下**
   - 查看成員即時位置
   - 看誰已到達、誰遲到

4. **活動結束**
   - 查看排行榜
   - 保存到歷史記錄

### 參加者（Participant）

1. **打開連結**
   - 看到聚會資訊（時間、地點、地圖）
   - 點擊「加入聚會」

2. **Guest 加入**
   - 填寫暱稱
   - 選擇是否分享位置

3. **定位分享**
   - 同意後開始追蹤位置（僅時間窗內）
   - 地圖上看到其他人的位置

4. **到達標記**
   - 到了點擊「我到了」
   - 或自動判斷（距離 < 50m）

5. **互動**
   - 戳遲到的朋友
   - 查看排行榜

---

## 🏗️ 技術架構

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **UI**: Material-UI (MUI v5)
- **地圖**: Google Maps JavaScript API
- **即時**: Pusher Channels
- **路由**: React Router v6
- **HTTP**: Axios

### Backend
- **Framework**: Node.js + Express + TypeScript
- **資料庫**: PostgreSQL + Prisma ORM
- **認證**: JWT (HttpOnly Cookie) + Guest Token
- **即時**: Pusher Channels
- **APIs**: Google Maps (Geocoding, Places, Directions, Distance Matrix)
- **安全**: Helmet, CORS, bcrypt, Rate Limiting

### 資料庫 Schema

```prisma
model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String
  groups       Group[]
  members      Member[]
}

model Event {
  id              String   @id @default(cuid())
  title           String
  datetime        DateTime
  meetingPointLat Float
  meetingPointLng Float
  meetingPointName String
  timeWindowBefore Int    @default(30)
  timeWindowAfter  Int    @default(30)
  useMeetHalf     Boolean @default(false)
  ownerId         Int
  status          String   @default("upcoming")
  members         EventMember[]
  createdAt       DateTime @default(now())
}

model EventMember {
  id              String   @id @default(cuid())
  eventId         String
  userId          Int?
  guestId         String?
  nickname        String
  isGuest         Boolean  @default(false)
  shareLocation   Boolean  @default(false)
  currentLat      Float?
  currentLng      Float?
  arrivalTime     DateTime?
  travelMode      String   @default("transit")
}
```

---

## 📂 專案結構

```
MeetHalf/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts          # 認證 API
│   │   │   ├── events.ts        # 聚會 API (新)
│   │   │   ├── groups.ts        # MeetHalf 群組
│   │   │   └── maps.ts          # Google Maps API
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT 驗證
│   │   │   └── rateLimit.ts     # 速率限制
│   │   ├── lib/
│   │   │   ├── prisma.ts
│   │   │   ├── pusher.ts        # Pusher 設定 (新)
│   │   │   └── gmaps.ts
│   │   └── index.ts
│   └── prisma/
│       └── schema.prisma
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── EventRoom.tsx    # 聚會頁面 (新)
│   │   │   ├── Groups.tsx       # MeetHalf 群組列表
│   │   │   └── Login.tsx
│   │   ├── components/
│   │   │   ├── EventResultPopup.tsx   # 排行榜 (新)
│   │   │   ├── Sidebar.tsx            # 側邊欄 (新)
│   │   │   ├── MapContainer.tsx
│   │   │   └── Navbar.tsx
│   │   ├── hooks/
│   │   │   ├── usePusher.ts     # Pusher Hook (新)
│   │   │   └── useAuth.ts
│   │   ├── api/
│   │   │   ├── events.ts        # Events API (新)
│   │   │   └── groups.ts        # MeetHalf API
│   │   ├── types/
│   │   │   └── events.ts        # Event 型別 (新)
│   │   └── mocks/
│   │       └── eventData.ts     # Mock Data (新)
│   └── ...
│
├── EVENTS_API_SPEC.md           # Events API 完整規格
├── COLLABORATION.md             # 協作開發指南
└── README.md
```

---

## 🎬 開發階段

### Stage 1: Events 核心功能 🚧 進行中

#### Week 1: 基礎建設
- ✅ API 規格文件 ([Issue #10](https://github.com/MeetHalf/MeetHalf/issues/10))
- ✅ Mock Data & TypeScript ([Issue #11](https://github.com/MeetHalf/MeetHalf/issues/11))
- ✅ Events API 層 ([Issue #12](https://github.com/MeetHalf/MeetHalf/issues/12))
- 🚧 Pusher Hook ([Issue #13](https://github.com/MeetHalf/MeetHalf/issues/13))

#### Week 2: EventRoom 頁面
- ⏳ EventRoom 基本框架
- ⏳ 即時定位追蹤
- ⏳ 成員列表與狀態
- ⏳ 戳人功能
- ⏳ 排行榜 Popup

#### Week 3: Sidebar & RWD
- ⏳ Sidebar 元件（我的聚會、統計、排行榜）
- ⏳ Mobile-First RWD 優化
- ⏳ Navbar 更新

#### Week 4: 整合與測試
- ⏳ 動畫效果
- ⏳ 後端 API 整合
- ⏳ 測試與 bug 修復

### Stage 2: MeetHalf 整合 ⏳ 計畫中

將現有的 MeetHalf 功能整合為 Events 的可選模組：
- 建立 Event 時選擇「用 MeetHalf 找中間點」
- 參加者填寫出發地與交通方式
- 主揪按「計算中間點」取得建議地點

### Stage 3: 進階功能 💡 未來規劃

- PWA 支援（離線快取、推送通知）
- 朋友系統
- 聚會模板
- 統計圖表
- 匯出報表

---

## 🔧 API 文件

### Events API

完整規格請見 [EVENTS_API_SPEC.md](./EVENTS_API_SPEC.md)

**主要端點**：
- `POST /events` - 建立聚會
- `GET /events/:id` - 取得聚會資訊
- `POST /events/:id/join` - Guest 加入
- `POST /events/:id/location` - 更新位置
- `POST /events/:id/arrival` - 標記到達
- `POST /events/:id/poke` - 戳人
- `GET /events/:id/result` - 取得排行榜
- `GET /events/my-events` - 我的聚會列表
- `GET /users/me/stats` - 個人統計

**Pusher 事件**：
- `location-update` - 位置更新
- `member-arrived` - 成員到達
- `poke` - 戳人通知
- `event-ended` - 聚會結束

### MeetHalf API

- `POST /groups` - 建立群組
- `GET /groups/:id` - 取得群組
- `POST /members` - 加入成員
- `GET /groups/:id/midpoint_by_time` - 計算中點

---

## 🔑 環境變數設定

### 後端 `.env`

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/meethalf"

# JWT
JWT_SECRET="your_super_secret_jwt_key_min_32_chars"

# Google Maps (Server Key)
GOOGLE_MAPS_API_KEY="your_google_maps_server_key"

# Pusher
PUSHER_APP_ID="your_pusher_app_id"
PUSHER_KEY="your_pusher_key"
PUSHER_SECRET="your_pusher_secret"
PUSHER_CLUSTER="ap3"

# CORS
CORS_ORIGIN="http://localhost:5173"
```

### 前端 `.env`

```env
# Google Maps (Browser Key)
VITE_GOOGLE_MAPS_JS_KEY="your_google_maps_browser_key"

# Pusher
VITE_PUSHER_KEY="your_pusher_key"
VITE_PUSHER_CLUSTER="ap3"

# Backend API (optional)
# VITE_API_BASE_URL="http://localhost:3000"
```

---

## 🧪 測試

### 後端測試

```bash
cd backend
npm run test              # 執行測試
npm run test:watch        # Watch 模式
npm run test:coverage     # 覆蓋率報告
```

### 前端測試

```bash
cd frontend
npm run test              # 執行測試
npm run test:ui           # UI 模式
```

---

## 🚢 部署

### Vercel (推薦)

**前端**:
```bash
cd frontend
vercel
```

**後端**:
```bash
cd backend
vercel
```

環境變數需在 Vercel Dashboard 設定。

### Docker

```bash
docker-compose up -d
```

---

## 🤝 協作開發

### 分支策略

- `main` - 生產環境
- `frontend-dev` - 前端開發主分支
- `backend-dev` - 後端開發主分支
- `feature/#X-description` - 功能分支

### Commit Message 規範

```
feat: 新功能
fix: Bug 修復
docs: 文件更新
chore: 環境設定
style: 程式碼格式
refactor: 重構
test: 測試
```

範例：
```bash
git commit -m "feat(events): add EventRoom page with real-time tracking"
git commit -m "fix(pusher): resolve connection timeout issue"
```

### 開發流程

1. 從 `frontend-dev` 或 `backend-dev` 分出 feature branch
2. 完成開發並測試
3. 提交 PR 到對應的 dev branch
4. Code review 後合併
5. 定期將 dev branch 合併到 main

詳見 [COLLABORATION.md](./COLLABORATION.md)

---

## 📝 授權

此專案為 Web Programming 課程 Final Project。

---

## 🙏 致謝

- [React](https://react.dev/)
- [Material-UI](https://mui.com/)
- [Pusher](https://pusher.com/)
- [Google Maps Platform](https://developers.google.com/maps)
- [Prisma](https://www.prisma.io/)

---

**Last Updated**: 2025-11-29  
**Status**: Stage 1 開發中  
**Team**: Frontend + Backend 協作開發

# MeetHalf 協作開發指南

## 📋 專案狀態

- **主要分支**: `main` - 穩定版本
- **前端開發分支**: `frontend-dev` - 前端功能開發
- **當前階段**: Stage 0-6 已完成，進入優化與新功能開發階段

## 🌿 分支策略

### 主要分支
- `main`: 生產環境穩定版本（受保護）
- `frontend-dev`: 前端功能開發主分支
- `backend-dev`: 後端功能開發主分支（建議創建）

### 功能分支命名規範
```
feature/[issue編號]-[簡短描述]
例如: feature/#7-ui-improvement
例如: feature/#8-add-dark-mode
```

### Bug 修復分支
```
fix/[issue編號]-[簡短描述]
例如: fix/#9-map-marker-bug
```

### 開發流程
```
main
 ├── frontend-dev (你負責)
 │    ├── feature/#7-ui-improvement
 │    ├── feature/#8-add-dark-mode
 │    └── fix/#9-map-marker-bug
 │
 └── backend-dev (協作者負責)
      ├── feature/#10-api-optimization
      └── fix/#11-auth-bug
```

## 🎯 前端開發建議 Issue 列表

### 優先級 1（高）- UI/UX 改進

#### Issue #7: 群組列表頁面 UI 優化
**目標**: 改善 `/groups` 頁面的視覺效果和使用者體驗
- [ ] 加入群組卡片的懸浮效果
- [ ] 改善空狀態（無群組時）的提示
- [ ] 加入骨架屏（Skeleton）載入效果
- [ ] 優化手機版 RWD 排版
- **檔案**: `frontend/src/pages/Groups.tsx`
- **預估時間**: 4-6 小時

#### Issue #8: 地圖互動優化
**目標**: 提升地圖操作的流暢度和視覺回饋
- [ ] 加入標記點擊的彈出資訊視窗
- [ ] 改善拖曳標記時的視覺回饋
- [ ] 加入地圖縮放控制按鈕
- [ ] 加入「回到中心點」快速按鈕
- **檔案**: `frontend/src/components/MapContainer.tsx`
- **預估時間**: 6-8 小時

#### Issue #9: 表單驗證優化
**目標**: 改善表單的錯誤提示和即時驗證
- [ ] 加入即時 Email 格式驗證
- [ ] 改善密碼強度提示
- [ ] 加入友善的錯誤訊息
- [ ] 優化表單提交流程
- **檔案**: `frontend/src/pages/Login.tsx`
- **預估時間**: 3-4 小時

### 優先級 2（中）- 新功能

#### Issue #10: 暗黑模式支援
**目標**: 加入深色主題切換功能
- [ ] 設計深色主題配色方案
- [ ] 在 `theme/index.ts` 加入暗黑模式配置
- [ ] 加入主題切換按鈕（Navbar）
- [ ] 使用 localStorage 記住使用者偏好
- **檔案**: 
  - `frontend/src/theme/index.ts`
  - `frontend/src/components/Navbar.tsx`
  - `frontend/src/App.tsx`
- **預估時間**: 8-10 小時

#### Issue #11: 群組搜尋與篩選
**目標**: 在群組列表頁加入搜尋功能
- [ ] 加入搜尋輸入框
- [ ] 實作群組名稱搜尋功能
- [ ] 加入「我的群組」/「所有群組」篩選
- [ ] 加入排序功能（最新/成員數）
- **檔案**: `frontend/src/pages/Groups.tsx`
- **預估時間**: 5-6 小時

#### Issue #12: 成員頭像與個人資訊
**目標**: 加入使用者頭像和個人資料功能
- [ ] 設計個人資料編輯頁面
- [ ] 加入頭像上傳功能（或使用 Gravatar）
- [ ] 在成員列表顯示頭像
- [ ] 加入暱稱設定功能
- **檔案**: 
  - `frontend/src/pages/Profile.tsx` (新建)
  - `frontend/src/components/GroupCard.tsx`
  - `frontend/src/pages/GroupDetail.tsx`
- **預估時間**: 10-12 小時
- **注意**: 需要後端 API 支援

### 優先級 3（低）- 體驗優化

#### Issue #13: 載入動畫優化
**目標**: 改善各種載入狀態的視覺回饋
- [ ] 統一 Loading Spinner 樣式
- [ ] 加入頁面轉場動畫
- [ ] 優化地圖載入過程
- [ ] 加入資料更新的微動畫
- **檔案**: 所有頁面和元件
- **預估時間**: 4-5 小時

#### Issue #14: 錯誤處理改進
**目標**: 提供更友善的錯誤提示
- [ ] 設計統一的錯誤頁面元件
- [ ] 加入 404 頁面
- [ ] 加入網路錯誤提示
- [ ] 加入錯誤重試機制
- **檔案**: 
  - `frontend/src/components/ErrorBoundary.tsx` (新建)
  - `frontend/src/pages/NotFound.tsx` (新建)
- **預估時間**: 4-5 小時

#### Issue #15: 無障礙功能 (A11y)
**目標**: 提升網站的無障礙體驗
- [ ] 加入適當的 ARIA 標籤
- [ ] 改善鍵盤導航
- [ ] 提升色彩對比度
- [ ] 加入螢幕閱讀器支援
- **檔案**: 所有元件
- **預估時間**: 6-8 小時

## 📝 Issue 建立模板

### 功能開發 Issue 模板
```markdown
## 功能描述
[描述要開發的功能]

## 目標
- [ ] 任務 1
- [ ] 任務 2
- [ ] 任務 3

## 相關檔案
- `frontend/src/...`

## 技術細節
[需要使用的技術、套件或方法]

## 測試計畫
- [ ] 單元測試
- [ ] 整合測試
- [ ] 手動測試

## 預估時間
X-Y 小時

## 標籤
`frontend` `enhancement` `priority-high`
```

### Bug 修復 Issue 模板
```markdown
## Bug 描述
[描述問題]

## 重現步驟
1. 步驟 1
2. 步驟 2
3. 步驟 3

## 預期行為
[應該如何運作]

## 實際行為
[實際發生什麼]

## 環境資訊
- 瀏覽器: [例如 Chrome 120]
- 作業系統: [例如 macOS 14]
- 裝置: [例如 Desktop / Mobile]

## 相關檔案
- `frontend/src/...`

## 標籤
`frontend` `bug` `priority-high`
```

## 🔄 Git 工作流程

### 1. 開始新功能
```bash
# 確保在最新的 frontend-dev 分支
git checkout frontend-dev
git pull origin frontend-dev

# 創建新的功能分支
git checkout -b feature/#7-ui-improvement

# 開始開發...
```

### 2. 提交變更
```bash
# 查看變更
git status

# 加入變更（只加入前端相關檔案）
git add frontend/src/...

# 提交（使用有意義的 commit message）
git commit -m "feat: improve group card hover effect (#7)"
```

### 3. Commit Message 規範
使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <subject>

feat: 新功能
fix: Bug 修復
docs: 文件更新
style: 程式碼格式調整（不影響功能）
refactor: 重構程式碼
test: 測試相關
chore: 建置工具或輔助工具變動
```

範例：
```bash
git commit -m "feat(groups): add skeleton loading to group list (#7)"
git commit -m "fix(map): resolve marker drag position bug (#9)"
git commit -m "style(navbar): improve responsive layout"
```

### 4. 推送到遠端
```bash
# 第一次推送
git push -u origin feature/#7-ui-improvement

# 之後的推送
git push
```

### 5. 建立 Pull Request
1. 前往 GitHub 專案頁面
2. 點擊 "New Pull Request"
3. Base: `frontend-dev` ← Compare: `feature/#7-ui-improvement`
4. 填寫 PR 描述（參考下方模板）
5. 請求 Code Review
6. 通過 Review 後合併到 `frontend-dev`

### Pull Request 模板
```markdown
## 變更摘要
[簡短描述這個 PR 做了什麼]

## 相關 Issue
Closes #7

## 變更類型
- [ ] 新功能
- [ ] Bug 修復
- [ ] 重構
- [ ] 文件更新
- [ ] 樣式調整

## 測試
- [ ] 已測試所有變更
- [ ] 已測試 RWD（手機/平板/桌機）
- [ ] 已通過 ESLint 檢查
- [ ] 瀏覽器相容性測試

## 截圖（如適用）
[貼上變更前後的對比截圖]

## 檢查清單
- [ ] 程式碼遵循專案風格指南
- [ ] 已自我審查程式碼
- [ ] 已加入適當的註解
- [ ] 已更新相關文件
- [ ] 沒有產生新的警告
- [ ] 已測試所有功能正常運作

## 額外說明
[任何需要特別注意的事項]
```

## 🛠️ 開發環境設定

### 前端開發
```bash
cd frontend
npm install
npm run dev  # 啟動開發伺服器 (port 5173)
```

### 程式碼品質檢查
```bash
# Lint 檢查
npm run lint

# 型別檢查
npm run type-check

# 測試
npm run test
```

## 👥 協作最佳實踐

### 1. 溝通
- 開始工作前先認領 Issue（在 GitHub Issue 留言）
- 有問題立即溝通，避免重複工作
- 使用 GitHub Discussions 或 Discord 進行討論
- 定期同步進度（建議每天或每 2 天）

### 2. 程式碼審查
- Pull Request 盡量保持小而專注
- 審查他人的 PR 時給予建設性的回饋
- 接受回饋並積極修正問題
- 使用 GitHub PR Review 功能留下具體建議

### 3. 避免衝突
- 經常從 `frontend-dev` 拉取最新變更
- 在開始新功能前先 `git pull`
- 如果多人編輯同一檔案，事先協調
- 使用 `.gitignore` 避免提交不必要的檔案

### 4. 分工建議
```
你（前端負責人）:
├── UI/UX 改進 (#7, #8, #9)
├── 新功能開發 (#10, #11)
└── 前端測試撰寫

協作者（後端負責人）:
├── API 優化
├── 資料庫效能調整
└── 後端測試撰寫

共同負責:
├── 整合測試
├── Bug 修復
└── 文件更新
```

## 📚 重要檔案說明

### 前端核心檔案
```
frontend/src/
├── pages/              # 頁面元件
│   ├── Groups.tsx      # 群組列表（優先優化）
│   ├── GroupDetail.tsx # 群組詳情頁（互動最複雜）
│   └── Login.tsx       # 登入頁
├── components/         # 共用元件
│   ├── MapContainer.tsx    # 地圖元件（核心）
│   ├── GroupCard.tsx       # 群組卡片
│   ├── Navbar.tsx          # 導覽列
│   └── RouteInfoPanel.tsx  # 路線資訊面板
├── hooks/              # 自訂 Hooks
│   └── useAuth.ts      # 認證邏輯
├── api/                # API 呼叫
│   ├── axios.ts        # Axios 設定
│   └── groups.ts       # 群組相關 API
└── theme/              # 主題設定
    └── index.ts        # Material-UI 主題
```

### 樣式指南
- 使用 Material-UI 的 `sx` prop 進行樣式設定
- 顏色使用專案既有的色票（參考 `GroupDetail.tsx`）
- RWD 斷點：`{ xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 }`

### 主要色彩
```typescript
// 參考現有配色
primary: '#3B82F6'      // 藍色（主要按鈕）
success: '#10B981'      // 綠色（成功狀態）
warning: '#F59E0B'      // 橘色（警告）
error: '#EF4444'        // 紅色（錯誤）
background: '#F9FAFB'   // 背景色
text: '#111827'         // 主要文字
textSecondary: '#6B7280' // 次要文字
```

## 🚀 快速開始

### 第一天工作建議
1. ✅ 已創建 `frontend-dev` 分支
2. 📖 閱讀這份協作指南
3. 🔍 熟悉專案結構和現有程式碼
4. 🎨 選擇一個 Issue 開始（建議從 #7 或 #9 開始）
5. 🌿 創建功能分支並開始開發
6. 💬 與協作者同步進度

### 推薦開發順序
```
第一週：
├── Issue #9: 表單驗證優化（熱身）
├── Issue #7: 群組列表 UI 優化
└── Issue #8: 地圖互動優化

第二週：
├── Issue #11: 搜尋與篩選功能
├── Issue #13: 載入動畫優化
└── Issue #14: 錯誤處理改進

第三週+：
├── Issue #10: 暗黑模式（需較多時間）
├── Issue #12: 成員頭像功能（需後端配合）
└── Issue #15: 無障礙功能
```

## 📞 需要協調的事項

### 需要後端 API 支援的功能
- Issue #12: 成員頭像（需要圖片上傳 API）
- Issue #11: 搜尋功能（後端可加入搜尋端點以提升效能）

### 建議定期會議
- **每週一次**: 同步進度、討論遇到的問題
- **重要決策**: 使用 GitHub Discussion 記錄討論結果

## 🎯 本週目標建議

### 你的目標（前端）
- [ ] 完成 Issue #7: 群組列表 UI 優化
- [ ] 完成 Issue #9: 表單驗證優化
- [ ] 開始 Issue #8: 地圖互動優化

### 團隊目標
- [ ] 所有 Issue 都已建立在 GitHub
- [ ] 確認開發流程和分支策略
- [ ] 設定 PR Review 規則

---

**最後更新**: 2025-11-29
**維護者**: @tinaw (前端) + 協作者 (後端)
**問題回報**: 請在 GitHub Issues 建立新 issue


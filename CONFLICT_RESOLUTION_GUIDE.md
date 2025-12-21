# Git 衝突解決指南

## 原則

**當我們只負責前端時，解決衝突的優先順序：**

1. **保留 main 的所有後端功能** - 優先保留遠端 main 的後端代碼
2. **保留我們的前端更改** - 只保留我們負責的前端相關更改
3. **合併兩者的前端更改** - 如果有其他開發者也在改前端，需要合併

## 衝突解決步驟

### 1. 拉取遠端更新

```bash
git fetch origin
git pull origin main
```

### 2. 如果有衝突，檢查衝突文件

```bash
git status
```

### 3. 根據文件類型決定策略

#### 後端文件（`backend/` 目錄）
- **策略：完全保留遠端 main 的版本**
- 使用：`git checkout --theirs backend/`

#### 前端文件（`frontend/` 目錄）
- **策略：手動合併，保留我們的功能**
- 檢查衝突標記 `<<<<<<<`, `=======`, `>>>>>>>`
- 保留我們的前端更改，同時確保不破壞後端 API 調用

#### 配置文件（`package.json`, `.env`, 等）
- **策略：合併兩者的依賴和配置**
- 手動檢查並合併必要的依賴

### 4. 解決衝突的命令

```bash
# 對於後端文件，完全使用遠端的版本
git checkout --theirs backend/

# 對於前端文件，手動編輯解決衝突
# 或使用工具
git mergetool

# 解決後標記為已解決
git add <resolved-file>

# 完成合併
git commit
```

## 常見衝突場景

### 場景 1: 後端路由衝突

**情況：** 遠端 main 更新了後端路由，我們也修改了相關代碼

**解決：**
```bash
# 保留遠端的後端路由
git checkout --theirs backend/src/routes/
git checkout --theirs backend/src/services/
git checkout --theirs backend/src/repositories/

# 檢查我們的前端 API 調用是否需要更新
# 如果需要，更新 frontend/src/api/ 中的調用
```

### 場景 2: 前端組件衝突

**情況：** 遠端 main 更新了前端組件，我們也修改了同一個組件

**解決：**
- 手動合併，保留兩者的功能
- 確保 UI 和功能都正常工作
- 測試確保沒有破壞現有功能

### 場景 3: 類型定義衝突

**情況：** 遠端 main 更新了 TypeScript 類型，我們也修改了類型

**解決：**
- 合併兩者的類型定義
- 確保類型定義完整且正確
- 更新相關的使用處

## 最佳實踐

1. **經常 pull** - 避免累積太多衝突
   ```bash
   git pull origin main
   ```

2. **提交前先 pull** - 確保本地是最新的
   ```bash
   git pull origin main
   git add .
   git commit -m "your message"
   ```

3. **使用分支** - 在功能分支上工作，完成後再合併到 main
   ```bash
   git checkout -b feature/your-feature
   # 開發...
   git checkout main
   git pull origin main
   git merge feature/your-feature
   ```

4. **測試合併後** - 解決衝突後務必測試
   ```bash
   # 測試前端
   cd frontend && npm run dev
   
   # 測試後端（如果需要）
   cd backend && npm run dev
   ```

## 快速參考

| 文件類型 | 策略 | 命令 |
|---------|------|------|
| `backend/` | 保留遠端 | `git checkout --theirs backend/` |
| `frontend/` | 手動合併 | 編輯文件解決衝突 |
| `package.json` | 合併依賴 | 手動合併依賴列表 |
| `.env` | 保留本地 | `git checkout --ours .env` |

## 注意事項

⚠️ **永遠不要：**
- 強制推送覆蓋遠端的後端更改
- 刪除後端功能而不確認
- 忽略後端 API 變更

✅ **應該：**
- 保留所有後端功能
- 更新前端以適配後端變更
- 測試確保一切正常


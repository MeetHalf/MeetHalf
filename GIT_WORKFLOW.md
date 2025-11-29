# Git 工作流程指南

## 🌿 分支策略

### 主要分支
- `main` - 生產環境（受保護）
- `frontend-dev` - 前端開發主分支
- `backend-dev` - 後端開發主分支

### 功能分支命名
```
feature/#<issue編號>-<簡短描述>
fix/#<issue編號>-<簡短描述>
```

範例：
```bash
feature/#15-git-workflow-guide
fix/#20-map-marker-bug
```

## 📝 Commit Message 格式

使用 [Conventional Commits](https://www.conventionalcommits.org/) 規範：

```
<type>: <description>

[optional body]

[optional footer]
```

### Type 類型
- `feat` - 新功能
- `fix` - Bug 修復
- `docs` - 文件更新
- `chore` - 環境設定、建置工具
- `style` - 程式碼格式（不影響功能）
- `refactor` - 重構
- `test` - 測試
- `perf` - 效能優化

### 範例

```bash
feat: add EventRoom page with real-time tracking
fix: resolve Pusher connection timeout
docs: update README with Events feature
chore: install pusher-js package
```

## 🔗 自動關閉 Issue

在 commit message 中使用關鍵字：

### 支援的關鍵字
- `closes #15`
- `fixes #20`  
- `resolves #18`

### 使用方式

**方式 1: 在描述中**
```bash
git commit -m "docs: add Git workflow guide (closes #15)"
```

**方式 2: 在 body 中**
```bash
git commit -m "docs: add Git workflow guide

This guide covers branch strategy, commit conventions,
and how to auto-close issues.

closes #15"
```

**方式 3: 關閉多個 issues**
```bash
git commit -m "feat: complete EventRoom page

closes #16, closes #17, closes #18"
```

### ⚠️ 重要說明

**Issue 只會在 merge 到 default branch (main) 時自動關閉**

我們的流程：
1. Feature branch commit 寫 `closes #15`
2. Push 到 GitHub
3. Merge 到 `frontend-dev` 或 `backend-dev`（issue 仍保持開啟）
4. 定期將 dev branch merge 到 `main`
5. **Merge 到 main 後，#15 自動關閉**

範例：
```
feature/#15 → frontend-dev → main
            (issue 仍開啟)   (issue 自動關閉✅)
```

## 🔄 完整工作流程

### 1. 開始新功能

```bash
# 確保在最新的 dev branch
git checkout frontend-dev
git pull origin frontend-dev

# 創建功能分支
git checkout -b "feature/#15-git-workflow-guide"
```

### 2. 開發與 Commit

```bash
# 查看變更
git status

# 加入變更
git add <files>

# Commit（記得加 closes #XX）
git commit -m "docs: add Git workflow guide (closes #15)"
```

### 3. Push 到 GitHub

```bash
# 第一次 push
git push -u origin "feature/#15-git-workflow-guide"

# 之後的 push
git push
```

### 4. 創建 Pull Request

在 GitHub 上：
1. 點擊 "New Pull Request"
2. Base: `frontend-dev` ← Compare: `feature/#15-git-workflow-guide`
3. 填寫 PR 描述
4. 請求 Code Review

### 5. Merge 後清理

```bash
# PR merge 後，刪除本地 branch
git checkout frontend-dev
git branch -d "feature/#15-git-workflow-guide"

# 刪除遠端 branch（通常 GitHub 自動刪除）
git push origin --delete "feature/#15-git-workflow-guide"
```

## 🛠️ 常用指令

### 查看狀態
```bash
git status              # 查看工作區狀態
git log --oneline -10   # 查看最近 10 個 commit
git branch -a           # 查看所有分支
```

### 同步最新變更
```bash
git fetch origin                    # 拉取遠端更新
git pull origin frontend-dev        # 拉取並合併
```

### 修改最後一次 commit
```bash
git commit --amend -m "new message"  # 修改 commit message
git commit --amend --no-edit         # 加入新檔案到最後一次 commit
```

### 暫存變更
```bash
git stash               # 暫存當前變更
git stash pop           # 恢復最近的暫存
git stash list          # 查看所有暫存
```

### 解決衝突
```bash
# 當 merge 有衝突時
git status              # 查看衝突檔案
# 手動編輯衝突檔案
git add <resolved-files>
git commit              # 完成 merge
```

## 🚨 注意事項

### ❌ 不要做的事
- 不要 force push 到 main (`git push --force`)
- 不要直接在 main/dev branch 上開發
- 不要 commit `.env` 或 `*.db` 檔案
- 不要跳過 hooks (`--no-verify`)

### ✅ 最佳實踐
- Commit 要小而專注（一個 commit 做一件事）
- Commit message 要清楚描述「做了什麼」
- 經常 pull 最新變更避免衝突
- Push 前先在本地測試
- 使用 `closes #XX` 自動關閉 issue

## 📚 參考資源

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub: Linking PR to Issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue)
- [Git Book](https://git-scm.com/book/zh-tw/v2)

---

**維護者**: Frontend + Backend Team  
**更新日期**: 2025-11-29


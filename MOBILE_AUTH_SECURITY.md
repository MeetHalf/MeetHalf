# 移动设备登录安全方案

## 安全问题分析

### 当前实现的风险

1. **URL 中的 Token**：
   - ❌ 可能被记录在浏览器历史
   - ❌ 可能被记录在服务器日志
   - ❌ 可能出现在 Referrer headers
   - ❌ 可能被分享或截图

2. **localStorage 存储**：
   - ❌ 持久化存储，关闭浏览器后仍存在
   - ❌ 可能被 XSS 攻击访问
   - ❌ 不会自动过期

## 标准做法

### 方案 1：一次性临时 Token 交换（推荐）

**流程**：
1. OAuth callback 后，生成一个**短期、一次性**的临时 token（例如 5 分钟有效期）
2. 将临时 token 通过 URL 传递（风险较低，因为有效期短且只能使用一次）
3. 前端用临时 token 调用后端 API 交换真正的 JWT token
4. 后端验证临时 token 后返回 JWT，并立即使临时 token 失效
5. 前端将 JWT 存储在 sessionStorage（关闭标签页后自动清除）

**优点**：
- ✅ 临时 token 即使泄露，有效期很短
- ✅ 只能使用一次，使用后立即失效
- ✅ JWT 不经过 URL
- ✅ sessionStorage 比 localStorage 更安全

### 方案 2：使用 postMessage API

**流程**：
1. OAuth callback 在 iframe 或新窗口中完成
2. 通过 `postMessage` API 在主窗口和回调窗口之间传递 token
3. Token 不经过 URL

**优点**：
- ✅ Token 完全不经过 URL
- ✅ 更安全

**缺点**：
- ❌ 实现较复杂
- ❌ 某些浏览器可能阻止 iframe

### 方案 3：使用 OAuth state 参数

**流程**：
1. 在 OAuth 请求时生成 state token
2. 存储在 sessionStorage
3. OAuth callback 时验证 state
4. 如果验证成功，通过其他方式传递 token

## 推荐实现：一次性临时 Token 交换

这是最平衡安全性和实现复杂度的方案。


# 認證流程完整說明 - `/auth/me` 登入邏輯

## 概述

MeetHalf 使用 **JWT (JSON Web Token) + HttpOnly Cookie** 進行認證。本文檔詳細說明從登入到驗證身份的完整流程。

---

## 完整認證流程圖

```
1. 用戶登入
   POST /auth/login
   ↓
2. 驗證帳密（bcrypt）
   ↓
3. 生成 JWT Token
   ↓
4. 設置 HttpOnly Cookie
   ↓
5. 前端自動調用 GET /auth/me
   ↓
6. 認證中間件驗證 Cookie 中的 Token
   ↓
7. 返回用戶資訊
```

---

## 1. 登入流程 (`POST /auth/login`)

### 請求
```typescript
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### 處理步驟

#### Step 1: 驗證請求參數
```typescript
// backend/src/routes/auth.ts:184
const { email, password } = loginSchema.parse(req.body);
```

#### Step 2: 查找用戶
```typescript
// backend/src/routes/auth.ts:187-189
const user = await prisma.user.findUnique({
  where: { email },
});
```

如果用戶不存在，返回：
```json
{
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

#### Step 3: 驗證密碼
```typescript
// backend/src/routes/auth.ts:200
const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
```

使用 bcrypt 比較明文密碼與資料庫中的雜湊密碼。

#### Step 4: 生成 JWT Token
```typescript
// backend/src/routes/auth.ts:211
const token = signToken(user.id);

// backend/src/utils/jwt.ts:10-16
export function signToken(userId: number): string {
  return jwt.sign(
    { userId },                    // Payload: 只有 userId
    JWT_SECRET,                    // 簽名密鑰（環境變數）
    { expiresIn: '7d' }            // 有效期：7 天
  );
}
```

**JWT Payload 結構**：
```typescript
{
  userId: number,  // 用戶 ID
  iat: number,     // 簽發時間（自動添加）
  exp: number      // 過期時間（自動添加，7天後）
}
```

#### Step 5: 設置 HttpOnly Cookie
```typescript
// backend/src/routes/auth.ts:217-223
const isProduction = process.env.NODE_ENV === 'production';
res.cookie('token', token, {
  httpOnly: true,                              // ✅ 防止 JavaScript 存取（防 XSS）
  sameSite: isProduction ? 'none' : 'lax',    // 跨站點設定
  secure: isProduction,                        // ✅ 僅 HTTPS 傳輸
  maxAge: 7 * 24 * 60 * 60 * 1000,           // 7 天有效期
  domain: process.env.COOKIE_DOMAIN,          // 可選：Cookie 域名
});
```

**Cookie 屬性說明**：
- `httpOnly: true` - JavaScript 無法存取，防止 XSS 攻擊
- `sameSite: 'none'` (生產) / `'lax'` (開發) - 跨站點 Cookie 設定
- `secure: true` (生產) - 僅在 HTTPS 時傳輸
- `maxAge: 7 天` - Cookie 有效期

#### Step 6: 返回用戶資訊
```typescript
// backend/src/routes/auth.ts:225-232
res.json({
  message: 'Login successful',
  user: {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  },
});
```

---

## 2. 驗證身份流程 (`GET /auth/me`)

### 請求流程

#### 前端自動調用
```typescript
// frontend/src/hooks/useAuth.ts:25-34
const refreshMe = useCallback(async () => {
  try {
    const response = await api.get('/auth/me');
    setUser(response.data.user);
  } catch (error) {
    setUser(null);
  } finally {
    setLoading(false);
  }
}, []);

// 在應用啟動時自動調用
useEffect(() => {
  refreshMe();
}, [refreshMe]);
```

前端使用 `axios` 發送請求，**自動帶上 Cookie**：
```typescript
// frontend/src/api/axios.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  withCredentials: true,  // ✅ 自動帶上 Cookie
});
```

### 後端處理流程

#### Step 1: 認證中間件驗證

**端點定義**：
```typescript
// backend/src/routes/auth.ts:277
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  // ...
});
```

**中間件邏輯**：
```typescript
// backend/src/middleware/auth.ts:13-38
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Step 1: 從 Cookie 中提取 token
    const token = req.cookies.token;

    // Step 2: 檢查 token 是否存在
    if (!token) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    // Step 3: 驗證 token
    const payload = verifyToken(token);
    
    // Step 4: 將用戶資訊附加到 request 物件
    req.user = payload;  // { userId: number }
    
    // Step 5: 繼續到下一個處理函數
    next();
  } catch (error) {
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: error instanceof Error ? error.message : 'Invalid token',
    });
  }
}
```

#### Step 2: JWT Token 驗證

```typescript
// backend/src/utils/jwt.ts:18-29
export function verifyToken(token: string): JWTPayload {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  try {
    // 驗證 token 簽名和有效期
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;  // { userId: number }
  } catch (error) {
    // Token 無效或已過期
    throw new Error('Invalid or expired token');
  }
}
```

**驗證過程**：
1. 檢查 `JWT_SECRET` 是否存在
2. 使用 `jwt.verify()` 驗證：
   - 簽名是否正確
   - 是否過期（檢查 `exp`）
   - Payload 格式是否正確
3. 返回解碼後的 payload：`{ userId: number }`

#### Step 3: 從資料庫獲取用戶資訊

```typescript
// backend/src/routes/auth.ts:287-294
const user = await prisma.user.findUnique({
  where: { id: req.user.userId },  // 使用 JWT 中的 userId
  select: {
    id: true,
    email: true,
    createdAt: true,
    // 注意：不返回 passwordHash
  },
});
```

**安全考慮**：
- 只返回必要的用戶資訊
- **不返回** `passwordHash`（即使有 select 也不會返回）

#### Step 4: 檢查用戶是否存在

```typescript
// backend/src/routes/auth.ts:296-302
if (!user) {
  res.status(404).json({
    code: 'USER_NOT_FOUND',
    message: 'User not found',
  });
  return;
}
```

這種情況可能發生在：
- JWT 中的 userId 對應的用戶已被刪除
- 資料庫異常

#### Step 5: 返回用戶資訊

```typescript
// backend/src/routes/auth.ts:304
res.json({ user });
```

**回應格式**：
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 3. 關鍵組件說明

### 3.1 JWT Token

**結構**：
```
Header.Payload.Signature
```

**Payload**：
```json
{
  "userId": 1,
  "iat": 1704110400,  // 簽發時間
  "exp": 1704715200   // 過期時間（7天後）
}
```

**特點**：
- 自包含：包含用戶 ID 和過期時間
- 無狀態：服務器不需要儲存 session
- 簽名驗證：使用 `JWT_SECRET` 防止篡改

### 3.2 HttpOnly Cookie

**安全性優勢**：
- ✅ **防止 XSS 攻擊**：JavaScript 無法存取
- ✅ **自動發送**：瀏覽器自動帶上（設置 `withCredentials: true`）
- ✅ **僅 HTTPS**：生產環境使用 `secure: true`

**Cookie 內容**：
```
token=<JWT_TOKEN_STRING>
```

### 3.3 認證中間件

**擴展 Express Request**：
```typescript
// backend/src/middleware/auth.ts:5-11
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;  // { userId: number }
    }
  }
}
```

這樣在所有路由中都可以使用 `req.user.userId`。

### 3.4 前端狀態管理

**使用 React Context**：
```typescript
// frontend/src/hooks/useAuth.ts
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);
```

**自動驗證**：
- 應用啟動時自動調用 `/auth/me`
- 如果 token 有效 → `user` 被設置
- 如果 token 無效 → `user` 為 `null`

---

## 4. 錯誤處理

### 4.1 登入失敗

| 錯誤 | 狀態碼 | 原因 |
|------|--------|------|
| `VALIDATION_ERROR` | 400 | 請求參數格式錯誤 |
| `INVALID_CREDENTIALS` | 401 | 帳號或密碼錯誤 |
| `INTERNAL_ERROR` | 500 | 伺服器內部錯誤 |

### 4.2 驗證失敗 (`/auth/me`)

| 錯誤 | 狀態碼 | 原因 |
|------|--------|------|
| `UNAUTHORIZED` | 401 | 沒有 token 或 token 無效 |
| `USER_NOT_FOUND` | 404 | JWT 中的 userId 對應的用戶不存在 |
| `INTERNAL_ERROR` | 500 | 伺服器內部錯誤 |

**前端處理**：
```typescript
// frontend/src/hooks/useAuth.ts:25-34
const refreshMe = useCallback(async () => {
  try {
    const response = await api.get('/auth/me');
    setUser(response.data.user);
  } catch (error) {
    // 任何錯誤都將 user 設為 null（未登入狀態）
    setUser(null);
  } finally {
    setLoading(false);
  }
}, []);
```

---

## 5. 登出流程

### 請求
```typescript
POST /auth/logout
```

### 處理
```typescript
// backend/src/routes/auth.ts:332-346
router.post('/logout', (req: Request, res: Response): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    domain: process.env.COOKIE_DOMAIN,
  });
  res.json({ message: 'Logout successful' });
});
```

**流程**：
1. 清除 Cookie（設置過期時間為過去）
2. 前端清除用戶狀態：`setUser(null)`

---

## 6. 安全機制

### 6.1 密碼保護
- ✅ 使用 bcrypt 雜湊（10 rounds）
- ✅ 不返回 `passwordHash` 給前端

### 6.2 Token 保護
- ✅ HttpOnly Cookie（防止 XSS）
- ✅ Secure Cookie（僅 HTTPS）
- ✅ 簽名驗證（防止篡改）
- ✅ 過期時間（7 天自動失效）

### 6.3 請求保護
- ✅ 認證中間件驗證所有受保護路由
- ✅ CORS 設定限制來源
- ✅ 錯誤訊息不洩露敏感資訊

---

## 7. 完整請求示例

### 7.1 登入請求
```bash
curl -X POST https://api.example.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  -c cookies.txt

# 回應
# Set-Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=None
# {
#   "message": "Login successful",
#   "user": {
#     "id": 1,
#     "email": "user@example.com",
#     "createdAt": "2024-01-01T00:00:00.000Z"
#   }
# }
```

### 7.2 驗證請求
```bash
curl -X GET https://api.example.com/auth/me \
  -b cookies.txt \
  -H "Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 回應
# {
#   "user": {
#     "id": 1,
#     "email": "user@example.com",
#     "createdAt": "2024-01-01T00:00:00.000Z"
#   }
# }
```

---

## 8. 相關檔案

### 後端
- `backend/src/routes/auth.ts` - 認證路由（login, logout, /me）
- `backend/src/middleware/auth.ts` - 認證中間件
- `backend/src/utils/jwt.ts` - JWT 生成和驗證
- `backend/src/lib/prisma.ts` - 資料庫查詢

### 前端
- `frontend/src/hooks/useAuth.ts` - 認證 Context 和 Hook
- `frontend/src/api/axios.ts` - Axios 配置（withCredentials）
- `frontend/src/pages/Login.tsx` - 登入頁面

---

## 9. 流程總結

### 登入時
1. 用戶輸入帳號密碼
2. 前端發送 `POST /auth/login`
3. 後端驗證帳號密碼
4. 後端生成 JWT 並設置 HttpOnly Cookie
5. 前端接收用戶資訊並設置狀態

### 驗證身份時
1. 應用啟動或頁面刷新
2. 前端自動發送 `GET /auth/me`（帶上 Cookie）
3. 認證中間件從 Cookie 提取 token
4. 驗證 JWT token 有效性
5. 從資料庫查詢用戶資訊
6. 返回用戶資訊給前端
7. 前端更新用戶狀態

### 登出時
1. 前端發送 `POST /auth/logout`
2. 後端清除 Cookie
3. 前端清除用戶狀態

---

## 10. 常見問題

### Q: 為什麼使用 HttpOnly Cookie 而不是 localStorage？
A: HttpOnly Cookie 可以防止 XSS 攻擊，JavaScript 無法存取 token。

### Q: Token 過期了怎麼辦？
A: 前端會在 `/auth/me` 失敗時將用戶設為未登入狀態，用戶需要重新登入。

### Q: 跨站點請求如何處理？
A: 生產環境使用 `sameSite: 'none'` 和 `secure: true` 支援跨站點 Cookie。

### Q: 如何刷新 token？
A: 目前實現沒有 token 刷新機制，7 天後需要重新登入。可以考慮實現 refresh token。


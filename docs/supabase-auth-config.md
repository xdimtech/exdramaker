# Supabase 认证配置指南

解决生产环境登录跳转到 localhost:3000 的问题。

## 问题诊断

**症状**: 点击登录后跳转到 `http://localhost:3000/` 而不是生产域名

**原因**: Supabase 项目中没有配置生产环境的重定向 URL

## 解决步骤

### 1. 登录 Supabase Dashboard

访问: https://app.supabase.com

选择项目: `gqczautqjzphjkkqlwwg`

### 2. 配置 URL 设置

#### 路径
左侧菜单 → **Authentication** → **URL Configuration**

#### 配置项

**A. Site URL**
```
https://exdramaker.curiopal.cn
```
- 这是应用的主 URL
- 用户注册确认邮件会使用这个 URL

**B. Redirect URLs** ⭐ 关键配置
```
https://exdramaker.curiopal.cn/auth/callback
http://localhost:3000/auth/callback
```
- **必须包含生产环境 URL**: `https://exdramaker.curiopal.cn/auth/callback`
- **可选开发环境 URL**: `http://localhost:3000/auth/callback`
- 每行一个 URL
- **确保使用 HTTPS**（生产环境）

**C. Additional Redirect URLs** (如果有多个域名)
```
https://exdramaker.vercel.app/auth/callback  # Vercel 部署
https://www.exdramaker.curiopal.cn/auth/callback  # www 子域名
```

### 3. 配置 OAuth 提供商（Google 登录）

#### 路径
左侧菜单 → **Authentication** → **Providers** → **Google**

#### 启用 Google Provider
1. 切换开关为 **Enabled**
2. 输入 Google OAuth 凭据:
   - **Client ID**: 从 Google Cloud Console 获取
   - **Client Secret**: 从 Google Cloud Console 获取

#### Google Cloud Console 配置

1. 访问: https://console.cloud.google.com/apis/credentials
2. 选择你的项目
3. 找到 OAuth 2.0 Client ID
4. 在 **Authorized redirect URIs** 中添加:
   ```
   https://gqczautqjzphjkkqlwwg.supabase.co/auth/v1/callback
   ```

### 4. 保存并测试

1. **保存所有配置**: 点击 **Save** 按钮
2. **清除浏览器缓存**: `Cmd+Shift+Delete`
3. **测试登录**:
   - 访问 https://exdramaker.curiopal.cn/
   - 点击登录按钮
   - 选择 Google 登录
   - 应该跳转到生产域名而不是 localhost

## 验证配置

### 检查代码中的 redirectTo

文件: `excalidraw-app/auth/useAuth.ts`

```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    //          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //          使用当前域名，无需修改代码
  },
});
```

代码已经正确使用了 `window.location.origin`，所以：
- 本地开发: `http://localhost:3000/auth/callback`
- 生产环境: `https://exdramaker.curiopal.cn/auth/callback`

### 检查环境变量

文件: `.env.production`

```bash
VITE_APP_SUPABASE_URL=https://gqczautqjzphjkkqlwwg.supabase.co
VITE_APP_SUPABASE_ANON_KEY=eyJhbGciOi... # 已配置
```

环境变量正确，无需修改。

## 完整配置示例

### Supabase URL Configuration 截图参考

```
┌─────────────────────────────────────────────┐
│ Site URL                                    │
│ https://exdramaker.curiopal.cn              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Redirect URLs                               │
│ https://exdramaker.curiopal.cn/auth/callback│
│ http://localhost:3000/auth/callback         │
└─────────────────────────────────────────────┘
```

## 常见问题

### 1. 添加 URL 后仍然跳转到 localhost

**解决方案**:
- 清除浏览器缓存
- 等待 1-2 分钟（Supabase 配置生效需要时间）
- 使用无痕窗口测试

### 2. Google 登录报错: "redirect_uri_mismatch"

**原因**: Google Cloud Console 中没有配置正确的回调 URL

**解决方案**:
1. 访问 Google Cloud Console
2. APIs & Services → Credentials
3. 找到 OAuth 2.0 Client ID
4. 添加 Authorized redirect URIs:
   ```
   https://gqczautqjzphjkkqlwwg.supabase.co/auth/v1/callback
   ```

### 3. 邮件中的链接指向错误的域名

**原因**: Site URL 配置不正确

**解决方案**:
- 确认 Site URL 设置为: `https://exdramaker.curiopal.cn`
- 重新发送验证邮件

### 4. 多个域名需要支持登录

**解决方案**:
在 Redirect URLs 中添加所有域名的回调 URL:
```
https://exdramaker.curiopal.cn/auth/callback
https://exdramaker.vercel.app/auth/callback
https://www.exdramaker.curiopal.cn/auth/callback
```

## 安全建议

### 生产环境配置检查清单

- [ ] Site URL 使用 HTTPS
- [ ] Redirect URLs 仅包含信任的域名
- [ ] 不要在 Redirect URLs 中使用通配符
- [ ] Google OAuth Client Secret 保密
- [ ] 定期轮换 API Keys（如有泄露）

### 环境分离

**开发环境** (`.env.development`):
```bash
VITE_APP_SUPABASE_URL=https://gqczautqjzphjkkqlwwg.supabase.co
VITE_APP_SUPABASE_ANON_KEY=eyJ...
# redirectTo: http://localhost:3000/auth/callback
```

**生产环境** (`.env.production`):
```bash
VITE_APP_SUPABASE_URL=https://gqczautqjzphjkkqlwwg.supabase.co
VITE_APP_SUPABASE_ANON_KEY=eyJ...
# redirectTo: https://exdramaker.curiopal.cn/auth/callback
```

无需代码修改，`window.location.origin` 会自动适配。

## 验证流程

```bash
# 1. 本地测试
yarn start
# 访问 http://localhost:3000
# 点击登录 → 应该跳转回 localhost:3000/auth/callback

# 2. 生产测试
yarn build:prod
# 部署到服务器
# 访问 https://exdramaker.curiopal.cn
# 点击登录 → 应该跳转回 https://exdramaker.curiopal.cn/auth/callback
```

## 支持

如果仍有问题:
1. 检查 Supabase Dashboard → Logs → Auth
2. 浏览器控制台查看错误信息
3. 网络标签查看重定向 URL

## 相关文档

- Supabase Auth: https://supabase.com/docs/guides/auth
- Google OAuth: https://developers.google.com/identity/protocols/oauth2

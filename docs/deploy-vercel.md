# Vercel 部署指南

本文档说明如何将 Exdramaker 部署到 Vercel。

## 前置要求

- GitHub/GitLab/Bitbucket 账号
- Vercel 账号（https://vercel.com）
- 项目已推送到 Git 仓库

## 方式一：通过 Vercel Dashboard 部署（推荐）

### 1. 导入项目

1. 访问 https://vercel.com/new
2. 选择你的 Git 提供商（GitHub/GitLab/Bitbucket）
3. 导入 `exdramaker` 仓库

### 2. 配置项目

Vercel 会自动检测 `vercel.json` 配置，但你需要确认以下设置：

#### Framework Preset
- 选择：**Other**（或不选择框架）

#### Build Settings
- **Build Command**: `yarn build:prod`
- **Output Directory**: `excalidraw-app/build`
- **Install Command**: `yarn install`

#### Root Directory
- 保持为默认（项目根目录）

### 3. 配置环境变量

在 Vercel Dashboard → Project Settings → Environment Variables 中添加：

**生产环境变量**（`.env.production` 中的内容）：

```bash
# Supabase Auth
VITE_APP_SUPABASE_URL=https://gqczautqjzphjkkqlwwg.supabase.co
VITE_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# PostHog Analytics
VITE_APP_POSTHOG_ENABLED=true
VITE_APP_POSTHOG_KEY=phc_cDJCC3Qom6hSPBeqDsyf0GwSuMkUbVpIrqERnDMz7hp
VITE_APP_POSTHOG_HOST=https://us.i.posthog.com
VITE_APP_POSTHOG_DEBUG=false

# Backend URLs
VITE_APP_BACKEND_V2_GET_URL=https://json.excalidraw.com/api/v2/
VITE_APP_BACKEND_V2_POST_URL=https://json.excalidraw.com/api/v2/post/

# Library
VITE_APP_LIBRARY_URL=https://libraries.excalidraw.com
VITE_APP_LIBRARY_BACKEND=https://us-central1-excalidraw-room-persistence.cloudfunctions.net/libraries

# Collaboration
VITE_APP_WS_SERVER_URL=https://oss-collab.excalidraw.com

# AI
VITE_APP_AI_BACKEND=https://oss-ai.excalidraw.com

# Firebase
VITE_APP_FIREBASE_CONFIG={"apiKey":"...","authDomain":"..."}

# Plus
VITE_APP_PLUS_LP=https://plus.excalidraw.com
VITE_APP_PLUS_APP=https://app.excalidraw.com

# Plus Export Public Key
VITE_APP_PLUS_EXPORT_PUBLIC_KEY=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApQ0jM9Qz8TdFLzcuAZZX...

# Tracking
VITE_APP_ENABLE_TRACKING=false

# Debug flags (set to false for production)
VITE_APP_DEBUG_ENABLE_TEXT_CONTAINER_BOUNDING_BOX=false
VITE_APP_COLLAPSE_OVERLAY=false
VITE_APP_ENABLE_ESLINT=false
```

**重要提示**：
- 在 Vercel 中添加环境变量时，每个变量要单独添加
- Environment: 选择 **Production**（生产环境）
- 如果需要在预览环境中测试，也要添加到 **Preview** 环境

### 4. 部署

1. 点击 **Deploy** 按钮
2. 等待构建完成（首次构建约 3-5 分钟）
3. 部署成功后，Vercel 会提供一个 URL（如 `https://exdramaker.vercel.app`）

### 5. 配置自定义域名（可选）

1. 在 Vercel Dashboard → Project Settings → Domains
2. 添加你的域名（如 `exdramaker.curiopal.cn`）
3. 按照 Vercel 的提示配置 DNS：
   - **A Record**: `76.76.21.21`
   - 或 **CNAME**: `cname.vercel-dns.com`

## 方式二：通过 Vercel CLI 部署

### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

### 2. 登录

```bash
vercel login
```

### 3. 部署

在项目根目录执行：

```bash
# 首次部署（会提示配置项目）
vercel

# 部署到生产环境
vercel --prod
```

### 4. 配置环境变量

通过 CLI 添加环境变量：

```bash
vercel env add VITE_APP_POSTHOG_KEY production
# 然后输入值
```

或者在 `.env.production` 文件中添加，然后通过 Dashboard 导入。

## 自动部署

Vercel 会自动检测 Git 仓库的变化：

- **Push 到 `main` 分支** → 自动部署到生产环境
- **Push 到其他分支** → 自动创建预览部署
- **Pull Request** → 自动创建预览部署

## 构建优化

### 加速构建

Vercel 已配置：
- 缓存 `node_modules`
- 使用 `.vercelignore` 排除不必要的文件
- 区域：新加坡（`sin1`）- 适合亚洲用户

### 监控构建

1. 访问 Vercel Dashboard → Deployments
2. 查看构建日志
3. 检查构建时间和大小

## 常见问题

### 1. 构建超时

**症状**：构建时间超过 Vercel 免费版限制（约 10 分钟）

**解决方案**：
- 升级到 Vercel Pro 计划
- 或优化构建流程（减少不必要的依赖）

### 2. 环境变量未生效

**症状**：应用运行异常，PostHog 未启动

**解决方案**：
- 确认环境变量名称正确（以 `VITE_APP_` 开头）
- 重新部署（环境变量更改后需要重新部署）

### 3. 路由 404

**症状**：刷新页面后显示 404

**解决方案**：
- 已在 `vercel.json` 中配置 SPA 路由重写
- 确认 `rewrites` 配置存在

### 4. 字体加载失败

**症状**：页面显示但字体未加载

**解决方案**：
- 检查 `fonts/` 目录是否在构建产物中
- 确认 CORS 头部配置正确

## 性能优化

### CDN 缓存

Vercel 自动配置了 CDN 缓存：
- 静态资源（`/assets/*`, `/fonts/*`）：1 年缓存
- HTML：无缓存（实时更新）

### 安全头部

已配置的安全头部：
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: origin`

## 回滚部署

如果新部署有问题，可以快速回滚：

1. Vercel Dashboard → Deployments
2. 找到之前的稳定版本
3. 点击 **Promote to Production**

## 监控和日志

### 实时日志

```bash
vercel logs [deployment-url]
```

### Analytics

Vercel 提供免费的 Web Analytics：
1. Vercel Dashboard → Analytics
2. 查看访问量、性能指标

## 成本估算

**免费版限制**：
- 100 GB 带宽/月
- 100 次部署/天
- 6000 分钟构建时间/月

**超出限制**：考虑升级到 Pro 计划（$20/月）

## 支持

- Vercel 文档: https://vercel.com/docs
- 社区: https://github.com/vercel/vercel/discussions

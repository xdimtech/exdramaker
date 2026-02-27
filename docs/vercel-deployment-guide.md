# Vercel 部署指南

本文档介绍如何将 Excalidraw 项目部署到 Vercel。

## 📋 前置要求

- ✅ Node.js 16+ 已安装
- ✅ Yarn 已安装
- ✅ Vercel 账户（免费即可）
- ✅ GitHub/GitLab/Bitbucket 账户（推荐）

## 🚀 快速部署

### 方法 1: 使用部署脚本（推荐）

```bash
# 1. 登录 Vercel（首次部署需要）
vercel login

# 2. 部署到预览环境
./scripts/deploy-vercel.sh preview

# 3. 部署到生产环境
./scripts/deploy-vercel.sh production
```

### 方法 2: 手动部署

```bash
# 1. 登录 Vercel
vercel login

# 2. 首次部署（会创建项目）
vercel

# 3. 部署到生产环境
vercel --prod
```

## 📦 部署配置

项目已配置好 Vercel 部署文件：

### `vercel.json`

```json
{
  "buildCommand": "yarn build:prod",
  "outputDirectory": "excalidraw-app/build",
  "installCommand": "yarn install",
  "regions": ["sin1"]
}
```

**配置说明：**
- `buildCommand` - 构建命令（生产构建）
- `outputDirectory` - 输出目录
- `installCommand` - 依赖安装命令
- `regions` - 部署区域（新加坡）

### `.vercelignore`

排除不需要上传到 Vercel 的文件：
- `node_modules` - 依赖包（Vercel 会重新安装）
- `docs` - 文档文件
- `.env.local`, `.env.development` - 本地环境变量
- 测试文件和开发工具配置

## 🔐 登录 Vercel

### 首次登录

```bash
vercel login
```

选择登录方式：

**推荐：使用 GitHub 登录**
```
? Log in to Vercel
> Continue with GitHub
  Continue with GitLab
  Continue with Bitbucket
  Continue with Email
  Continue with SAML Single Sign-On
```

按照提示在浏览器中授权即可。

### 验证登录状态

```bash
# 查看当前登录用户
vercel whoami

# 查看团队列表
vercel teams ls

# 查看项目列表
vercel ls
```

## 🎯 部署类型

### Preview（预览部署）

每次推送到非主分支或手动部署时创建：

```bash
vercel
```

**特点：**
- ✅ 独立的预览 URL（例如：`project-abc123.vercel.app`）
- ✅ 适合测试新功能
- ✅ 不影响生产环境
- ✅ 自动过期（30天后）

### Production（生产部署）

部署到生产环境：

```bash
vercel --prod
```

**特点：**
- ✅ 使用自定义域名（如果已配置）
- ✅ 默认 URL：`project.vercel.app`
- ✅ 稳定的生产环境
- ✅ 自动 HTTPS 证书

## ⚙️ 环境变量配置

### 在 Vercel Dashboard 配置

环境变量需要在 Vercel Dashboard 中配置，不要提交到代码库：

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择项目
3. 进入 **Settings → Environment Variables**
4. 添加以下环境变量：

**必需的环境变量：**

```bash
# PostHog Analytics
VITE_APP_POSTHOG_ENABLED=true
VITE_APP_POSTHOG_KEY=phc_YOUR_PRODUCTION_KEY
VITE_APP_POSTHOG_HOST=https://app.posthog.com
VITE_APP_POSTHOG_DEBUG=false

# Tracking
VITE_APP_ENABLE_TRACKING=true

# Supabase（如果使用认证功能）
VITE_APP_SUPABASE_URL=https://your-project.supabase.co
VITE_APP_SUPABASE_ANON_KEY=your_anon_key

# Excalidraw Services
VITE_APP_BACKEND_V2_GET_URL=https://json.excalidraw.com/api/v2/
VITE_APP_BACKEND_V2_POST_URL=https://json.excalidraw.com/api/v2/post/
VITE_APP_LIBRARY_URL=https://libraries.excalidraw.com
VITE_APP_WS_SERVER_URL=wss://your-collab-server.com
```

### 环境变量优先级

Vercel 支持为不同环境设置不同的值：

- **Production** - 生产环境变量（`vercel --prod`）
- **Preview** - 预览环境变量（`vercel`）
- **Development** - 本地开发（`vercel dev`）

## 📊 部署流程

### 首次部署流程

```bash
# 1. 登录 Vercel
$ vercel login
> Continue with GitHub
✓ Logged in

# 2. 开始部署
$ vercel
? Set up and deploy "~/exdramaker"? [Y/n] Y
? Which scope do you want to deploy to? Your Team
? Link to existing project? [y/N] N
? What's your project's name? exdramaker
? In which directory is your code located? ./

Auto-detected Project Settings (Vite):
- Build Command: yarn build:prod
- Output Directory: excalidraw-app/build
- Development Command: yarn dev

? Want to override the settings? [y/N] N

🔗  Linked to your-team/exdramaker
🔍  Inspect: https://vercel.com/...
✅  Production: https://exdramaker.vercel.app [1m]
```

### 后续部署

```bash
# 预览部署
$ vercel
✅  Preview: https://exdramaker-abc123.vercel.app [45s]

# 生产部署
$ vercel --prod
✅  Production: https://exdramaker.vercel.app [1m]
```

## 🔍 部署管理

### 查看部署列表

```bash
vercel ls

# 输出示例：
# Age  Deployment                       Status  Duration  Username
# 2m   exdramaker-abc123.vercel.app     Ready   45s       user
# 1h   exdramaker.vercel.app            Ready   1m        user
```

### 查看部署详情

```bash
vercel inspect https://exdramaker-abc123.vercel.app

# 或使用部署 ID
vercel inspect dpl_abc123
```

### 查看部署日志

```bash
vercel logs https://exdramaker-abc123.vercel.app

# 实时查看日志
vercel logs https://exdramaker-abc123.vercel.app --follow
```

### 删除部署

```bash
vercel rm https://exdramaker-abc123.vercel.app

# 或使用部署 ID
vercel rm dpl_abc123
```

## 🌐 自定义域名

### 添加自定义域名

1. **在 Vercel Dashboard 中添加：**
   - 进入项目 → Settings → Domains
   - 输入域名（例如：`app.example.com`）
   - 按照提示配置 DNS

2. **使用 CLI 添加：**
   ```bash
   vercel domains add app.example.com
   ```

### DNS 配置

**方法 1: CNAME（推荐）**
```
app.example.com  CNAME  cname.vercel-dns.com
```

**方法 2: A Record**
```
app.example.com  A  76.76.21.21
```

### 验证域名

```bash
vercel domains ls

# 输出示例：
# Domain              Verified  Created
# app.example.com     Yes       2h ago
# exdramaker.app      Yes       1d ago
```

## 🔧 本地开发模式

使用 Vercel Dev 在本地模拟 Vercel 环境：

```bash
# 启动本地开发服务器
vercel dev

# 指定端口
vercel dev --listen 3000
```

**特点：**
- ✅ 模拟 Vercel 生产环境
- ✅ 自动加载环境变量
- ✅ 支持 Serverless Functions
- ✅ 热重载

## 📈 性能优化

### 构建优化

项目已配置：

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Edge Network

Vercel 自动使用全球 CDN：
- ✅ 自动缓存静态资源
- ✅ Brotli 压缩
- ✅ HTTP/2 推送
- ✅ 自动优化图片

### 性能监控

在 Vercel Dashboard 查看：
- **Analytics** - 访问统计
- **Speed Insights** - 性能指标（需启用）
- **Logs** - 错误日志

## 🐛 故障排查

### 常见问题

**1. 构建失败**

```bash
# 查看构建日志
vercel logs deployment-url --follow

# 本地测试构建
yarn build:prod
```

**2. 环境变量未生效**

- 检查变量名是否正确（必须以 `VITE_APP_` 开头）
- 确认已在 Vercel Dashboard 中配置
- 重新部署项目

**3. 路由 404 错误**

检查 `vercel.json` 中的 `rewrites` 配置：

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**4. 构建超时**

Vercel 免费版构建限制：
- 构建时间：10 分钟
- 输出大小：100 MB

优化建议：
- 使用 `.vercelignore` 减少上传文件
- 优化依赖（移除未使用的包）
- 使用构建缓存

### 调试命令

```bash
# 查看项目配置
vercel inspect

# 查看环境变量
vercel env ls

# 拉取环境变量到本地
vercel env pull .env.local

# 查看构建日志
vercel logs
```

## 📊 CI/CD 集成

### GitHub Actions 自动部署

创建 `.github/workflows/vercel.yml`：

```yaml
name: Vercel Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### 获取 Vercel Token

```bash
# 创建 token
vercel token create

# 查看 org ID 和 project ID
vercel project ls
```

## 📚 更多资源

- [Vercel 文档](https://vercel.com/docs)
- [Vercel CLI 文档](https://vercel.com/docs/cli)
- [环境变量指南](https://vercel.com/docs/concepts/projects/environment-variables)
- [自定义域名](https://vercel.com/docs/concepts/projects/domains)

## 💡 最佳实践

1. **使用预览部署测试**
   - 每次修改先部署到 Preview
   - 测试通过后再部署到 Production

2. **合理使用环境变量**
   - 敏感信息（API keys）只在 Vercel Dashboard 配置
   - 不要提交 `.env.local` 到代码库

3. **监控部署状态**
   - 定期检查 Vercel Dashboard
   - 设置部署通知（邮件/Slack）

4. **优化构建时间**
   - 使用 `.vercelignore` 减少上传
   - 启用构建缓存
   - 优化依赖安装

5. **配置自定义域名**
   - 使用 CNAME 记录（更灵活）
   - 启用自动 HTTPS
   - 配置 DNS CAA 记录提高安全性

---

**最后更新：** 2026-02-27
**Vercel CLI 版本：** 50.25.1

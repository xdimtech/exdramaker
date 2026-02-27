# 更新现有 Nginx 配置以优化缓存

你的 Nginx 已经配置为反向代理。我们只需要添加缓存控制头即可。

## 🚀 部署步骤

### 1. 备份现有配置

```bash
sudo cp /etc/nginx/sites-available/exdramaker /etc/nginx/sites-available/exdramaker.backup
```

### 2. 更新 Nginx 配置

```bash
# 拉取最新配置文件
cd /root/xdimtech/exdramaker
git pull origin main

# 复制新配置（覆盖旧配置）
sudo cp configs/nginx/exdramaker-proxy.conf /etc/nginx/sites-available/exdramaker
```

### 3. 测试配置

```bash
sudo nginx -t
```

应该看到：
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 4. 重新加载 Nginx

```bash
sudo systemctl reload nginx
```

### 5. 更新 PM2/http-server 缓存设置（可选但推荐）

既然 Nginx 已经控制缓存，可以让 http-server 使用合理的默认缓存：

```bash
pm2 stop exdramaker
pm2 delete exdramaker

cd /root/xdimtech/exdramaker/excalidraw-app
# 使用 -c3600（1小时缓存），Nginx 会覆盖这个设置
pm2 start npx --name exdramaker -- -y http-server@latest -a 0.0.0.0 -p 5001 --cors -c3600 ./build
pm2 save
```

## ✅ 验证配置

### 检查响应头

```bash
# 检查 HTML 缓存头（应该是 no-cache）
curl -I https://exdramaker.curiopal.cn/ | grep -i cache-control
# 期望输出: Cache-Control: no-cache, no-store, must-revalidate

# 检查 JS 文件缓存头（应该是长期缓存）
curl -I https://exdramaker.curiopal.cn/assets/index-u5-1jcPp.js | grep -i cache-control
# 期望输出: Cache-Control: public, max-age=31536000, immutable
```

### 浏览器验证

1. **清除缓存**: 开发者工具 → Network → 右键点击 → Clear browser cache
2. **刷新页面**: `Cmd+Shift+R` (Mac) 或 `Ctrl+Shift+R` (Windows)
3. **检查 Network 标签**:
   - HTML (`/`): 应该每次都是 `200` (from server)
   - JS/CSS (`/assets/*`): 第二次访问应该是 `200` (from disk cache)

## 📊 缓存策略说明

新配置的缓存策略：

| 资源类型 | 路径示例 | Cache-Control | 说明 |
|---------|---------|---------------|------|
| HTML | `/` | `no-cache` | ✅ 始终获取最新版本 |
| JS/CSS | `/assets/*.js` | `max-age=31536000, immutable` | ✅ 1年缓存，文件名有hash |
| 字体 | `*.woff2` | `max-age=31536000` | ✅ 1年缓存 + CORS |
| 图片 | `*.png`, `*.ico` | `max-age=86400` | ✅ 1天缓存 |
| Manifest | `*.json`, `*.webmanifest` | `max-age=3600` | ✅ 1小时缓存 |
| 其他 | 其他路径 | `no-cache` | ✅ 默认不缓存 |

## 🎯 性能提升

优化后的效果：

**首次访问**:
- HTML: ~5KB (快速加载)
- JS bundle: ~3MB (压缩后 ~1MB，有 gzip)
- 其他资源: ~500KB

**重复访问**:
- HTML: ~5KB (每次检查更新)
- JS/CSS: **从缓存读取** (几乎瞬间)
- 其他资源: **从缓存读取**

**部署新版本后**:
- HTML: 立即更新（不缓存）
- JS/CSS: 文件名变了，自动获取新版本（hash 变化）
- 用户无需手动清除缓存

## 🔄 回滚方案

如果新配置有问题，可以快速回滚：

```bash
# 恢复备份配置
sudo cp /etc/nginx/sites-available/exdramaker.backup /etc/nginx/sites-available/exdramaker

# 测试并重新加载
sudo nginx -t
sudo systemctl reload nginx
```

## 📝 配置文件对比

**旧配置**:
- 单一 `location /` 代理所有请求
- 没有缓存控制头
- http-server 用 `-c-1` 禁用所有缓存

**新配置**:
- 多个 `location` 规则，按文件类型分别处理
- 精确的缓存控制头
- HTML 不缓存，静态资源长期缓存
- http-server 用 `-c3600`，但 Nginx 会覆盖

## ⚠️ 注意事项

1. **location 规则顺序很重要**:
   - 精确匹配 (`location = /`) 优先级最高
   - 正则匹配 (`location ~*`) 次之
   - 前缀匹配 (`location /`) 兜底

2. **always 标志**:
   - `add_header ... always` 确保即使是 4xx/5xx 响应也添加头部

3. **proxy_pass 重复**:
   - 每个 location 都要重复 proxy_pass 配置
   - 这是 Nginx 的限制，无法继承

## 🔍 故障排查

### 缓存仍然不生效

```bash
# 检查 Nginx 配置是否真的加载了
sudo nginx -T | grep -A 20 "location ~\* \^/assets/"

# 查看实际响应头
curl -I https://exdramaker.curiopal.cn/assets/index-u5-1jcPp.js

# 检查 Nginx 日志
sudo tail -f /var/log/nginx/exdramaker_error.log
```

### 页面仍然很慢

```bash
# 检查 gzip 是否工作
curl -H "Accept-Encoding: gzip" -I https://exdramaker.curiopal.cn/assets/index-u5-1jcPp.js | grep -i content-encoding
# 期望看到: Content-Encoding: gzip

# 检查 PM2 状态
pm2 status
pm2 logs exdramaker --lines 20
```

### 浏览器仍然缓存旧版本

```bash
# 清除浏览器缓存
# 或使用无痕窗口测试

# 强制刷新
# Mac: Cmd+Shift+R
# Windows: Ctrl+Shift+R
```

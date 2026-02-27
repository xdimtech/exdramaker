# Nginx 部署指南

使用 Nginx 作为反向代理可以精确控制缓存策略，获得最佳性能。

## 部署步骤

### 1. 安装 Nginx（如未安装）

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. 配置 Nginx

```bash
# 复制配置文件
sudo cp configs/nginx/exdramaker.conf /etc/nginx/sites-available/exdramaker.conf

# 创建软链接（Ubuntu/Debian）
sudo ln -s /etc/nginx/sites-available/exdramaker.conf /etc/nginx/sites-enabled/

# 或直接复制到 conf.d（CentOS/RHEL）
sudo cp configs/nginx/exdramaker.conf /etc/nginx/conf.d/
```

### 3. 调整配置中的路径

编辑 `/etc/nginx/sites-available/exdramaker.conf`：

```nginx
# 确认根目录路径正确
root /root/xdimtech/exdramaker/excalidraw-app/build;

# 如果已配置 HTTPS，取消注释相关行
```

### 4. 测试配置

```bash
# 测试 Nginx 配置
sudo nginx -t

# 应该看到：
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. 重启 Nginx

```bash
sudo systemctl reload nginx
```

### 6. 停止 PM2/http-server（可选）

如果使用 Nginx 直接服务静态文件，可以停止 PM2：

```bash
pm2 stop exdramaker
pm2 delete exdramaker
pm2 save
```

**或者保留 PM2 作为备份**：改为监听 localhost:5001，Nginx 可以作为前端。

### 7. 验证

访问 https://exdramaker.curiopal.cn/

检查响应头：

```bash
# 检查 HTML 缓存头
curl -I https://exdramaker.curiopal.cn/ | grep -i cache

# 应该看到：Cache-Control: no-cache, no-store, must-revalidate

# 检查 JS 文件缓存头
curl -I https://exdramaker.curiopal.cn/assets/index-xxx.js | grep -i cache

# 应该看到：Cache-Control: public, max-age=31536000, immutable
```

## 缓存策略说明

| 文件类型 | Cache-Control | 说明 |
|---------|---------------|------|
| HTML | `no-cache, no-store` | 每次都获取最新版本 |
| JS/CSS (assets) | `max-age=31536000, immutable` | 1年缓存，文件名有hash |
| 字体 | `max-age=31536000` | 1年缓存 |
| 图片 | `max-age=86400` | 1天缓存 |
| manifest/sitemap | `max-age=3600` | 1小时缓存 |

## 性能优势

- ✅ HTML 始终最新（无缓存）
- ✅ 资源文件长期缓存（快速加载）
- ✅ Gzip 压缩（减少传输大小）
- ✅ 安全头部（提升安全性）

## 故障排除

### 403 Forbidden

```bash
# 检查文件权限
ls -la /root/xdimtech/exdramaker/excalidraw-app/build/

# 给 Nginx 用户读取权限
sudo chmod -R 755 /root/xdimtech/exdramaker/excalidraw-app/build/
```

### 502 Bad Gateway

```bash
# 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/exdramaker-error.log
```

### 缓存仍然有问题

```bash
# 检查 Nginx 配置是否生效
sudo nginx -T | grep -A 10 "server_name exdramaker"

# 强制重载配置
sudo systemctl restart nginx
```

## 自动部署脚本

使用 `scripts/build-release.sh` 构建后，Nginx 会自动服务最新文件：

```bash
# 本地构建
./scripts/build-release.sh --local --no-pull

# 或服务器上
git pull origin main
yarn build:prod
# Nginx 自动使用新文件，无需重启
```

## 回退到 http-server

如果 Nginx 有问题，可以随时回退：

```bash
# 停止 Nginx
sudo systemctl stop nginx

# 启动 PM2
cd /root/xdimtech/exdramaker/excalidraw-app
pm2 start npx --name exdramaker -- -y http-server@latest -a 0.0.0.0 -p 5001 --cors -c3600 ./build
pm2 save
```

# Ubuntu 服务器部署指南

本文档介绍如何在 Ubuntu 云服务器上部署 ExDramaker 项目。

---

## 一、环境准备

### 1. 登录服务器

```bash
ssh root@你的服务器IP
```

### 2. 切换到 root 用户（如需要）

```bash
sudo -i
```

---

## 二、安装基础软件

### 1. 安装 Node.js 18（使用国内镜像）

```bash
# 方法一：使用 nvm 安装（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 验证
node -v
```

```bash
# 方法二：直接安装
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - \
  && sudo apt-get install -y nodejs
```

### 2. 安装 Nginx（使用清华镜像）

```bash
# 备份源列表
cp /etc/apt/sources.list /etc/apt/sources.list.bak

# 更换为国内镜像源
cat > /etc/apt/sources.list << 'EOF'
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy main restricted universe multiverse
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-updates main restricted universe multiverse
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-backports main restricted universe multiverse
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-security main restricted universe multiverse
EOF

# 更新并安装
apt update
apt install -y nginx

# 验证
nginx -v
```

### 3. 安装 Git

```bash
apt install -y git
```

---

## 三、上传项目代码

### 方式一：Git 拉取

```bash
cd /root
git clone https://gitee.com/你的仓库/exdramaker.git
cd exdramaker
```

### 方式二：SCP 上传

```bash
# 在本地Mac终端执行
scp -r ./exdramaker root@你的服务器IP:/root/
```

---

## 四、安装依赖并构建

```bash
cd /root/xdimtech/exdramaker

# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com
yarn config set registry https://registry.npmmirror.com

# 复制环境变量配置
cp excalidraw-app/.env.development excalidraw-app/.env

# 安装依赖（约2-3分钟）
yarn install

# 构建生产版本（约3-5分钟）
yarn build:prod
```

---

## 五、配置 Nginx

### 1. 创建 Nginx 配置文件

```bash
sudo cat > /etc/nginx/sites-available/exdramaker <<'EOF'
server {
    listen 80;
    server_name exdramaker.curiopal.cn;

    access_log /var/log/nginx/exdramaker_access.log;
    error_log /var/log/nginx/exdramaker_error.log;

    # 启用Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript application/xml text/javascript;
    gzip_comp_level 6;

    client_max_body_size 100M;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    location / {
    proxy_pass http://127.0.0.1:5001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # 超时设置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # 缓冲
    proxy_buffering on;
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
    }
}
EOF
```

### 2. 启用配置

```bash
# 移除默认配置
rm -f /etc/nginx/sites-enabled/default

# 启用新配置
ln -sf /etc/nginx/sites-available/exdramaker /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

### 3. 设置防火墙

```bash
# 开放 80 和 443 端口
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
```

---

## 六、验证部署

```bash
# 检查 Nginx 状态
systemctl status nginx

# 检查端口监听
netstat -tlnp | grep nginx

# 测试访问
curl -I http://localhost
curl -I http://exdramaker.xdimspace.cn
```

---

## 七、域名解析

在域名服务商处添加 DNS 解析：

| 记录类型 | 主机记录   | 记录值        |
| -------- | ---------- | ------------- |
| A        | exdramaker | 你的服务器 IP |

```bash
# 检查解析是否生效
nslookup exdramaker.xdimspace.cn
dig exdramaker.xdimspace.cn
```

---

## 八、启动应用

需要后台运行 http-server（端口 5001），推荐使用 PM2 或 nohup：

### 方法一：使用 PM2（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
cd /root/xdimtech/exdramaker/excalidraw-app
pm2 start npx --name exdramaker -- -y http-server@latest -a 0.0.0.0 -p 5001 ./build

# 设置开机自启
pm2 startup
pm2 save
```

### 方法二：使用 nohup

```bash
cd /root/xdimtech/exdramaker/excalidraw-app
nohup npm run start:production > /var/log/exdramaker.log 2>&1 &
```

---

## 九、后续维护

### 查看运行状态

```bash
pm2 status
# 或
tail -f /var/log/exdramaker.log
```

### 重启服务

```bash
# 重启应用
pm2 restart exdramaker

# 重启 Nginx
systemctl restart nginx
```

### 更新版本

```bash
cd /root/xdimtech/exdramaker

# 拉取新代码
git pull

# 重新构建
yarn build:prod

# 重启应用
pm2 restart exdramaker

# 重启 Nginx
systemctl restart nginx
```

---

## 资源占用

| 阶段   | CPU  | 内存  | 磁盘   |
| ------ | ---- | ----- | ------ |
| 构建时 | 较高 | ~2GB  | ~500MB |
| 运行时 | 极低 | ~50MB | -      |

---

完成！访问 **http://exdramaker.xdimspace.cn** 查看应用。

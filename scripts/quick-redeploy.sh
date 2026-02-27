#!/bin/bash

# 快速重新部署脚本
# 用于修复生产环境问题
# 用法: ssh 到服务器后运行 ./scripts/quick-redeploy.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "========================================="
log_info "快速重新部署 - 修复生产环境问题"
log_info "========================================="
echo ""

# 1. 拉取最新代码
log_info "步骤 1/6: 拉取最新代码..."
BEFORE_COMMIT=$(git rev-parse HEAD)
git pull origin main || {
    log_error "git pull 失败"
    exit 1
}
AFTER_COMMIT=$(git rev-parse HEAD)

if [ "$BEFORE_COMMIT" = "$AFTER_COMMIT" ]; then
    log_info "代码已是最新版本"
else
    log_info "代码已更新: $BEFORE_COMMIT -> $AFTER_COMMIT"
    git log --oneline -3
fi
echo ""

# 2. 清理旧构建
log_info "步骤 2/6: 清理旧构建产物..."
yarn rm:build || log_warn "清理失败，继续执行"
echo ""

# 3. 安装依赖
log_info "步骤 3/6: 安装/更新依赖..."
yarn install
echo ""

# 4. 重新构建
log_info "步骤 4/6: 重新构建生产版本..."
yarn build:prod
echo ""

# 5. 验证构建产物
log_info "步骤 5/6: 验证构建产物..."
if [ ! -f "excalidraw-app/build/index.html" ]; then
    log_error "构建失败！index.html 不存在"
    exit 1
fi

# 检查 HTML 是否包含正确的引用
if grep -q "packages/excalidraw/fonts/fonts.css" excalidraw-app/build/index.html; then
    log_error "构建失败！HTML 仍包含源码路径引用"
    exit 1
fi

if grep -q "index.tsx" excalidraw-app/build/index.html; then
    log_error "构建失败！HTML 仍引用源码文件"
    exit 1
fi

log_info "✓ 构建产物验证通过"
echo ""

# 6. 重启服务
log_info "步骤 6/6: 重启 PM2 服务..."

# 停止旧进程
pm2 stop exdramaker 2>/dev/null || log_warn "未找到运行中的进程"
pm2 delete exdramaker 2>/dev/null || true

# 启动新进程
cd excalidraw-app
# -c-1: 禁用缓存，确保 HTML 文件始终获取最新版本
pm2 start npx --name exdramaker -- -y http-server@latest -a 0.0.0.0 -p 5001 --cors -c-1 ./build
pm2 save

log_info "✓ 服务已重启"
echo ""

log_info "========================================="
log_info "✅ 部署完成！"
log_info "========================================="
echo ""
log_info "访问地址: https://exdramaker.curiopal.cn/"
log_info "查看日志: pm2 logs exdramaker"
log_info "查看状态: pm2 status"
echo ""

# 显示最新的构建文件信息
log_info "构建产物信息:"
ls -lh excalidraw-app/build/index.html
echo ""
log_info "主要资源文件:"
ls -lh excalidraw-app/build/assets/index-*.{js,css} 2>/dev/null | head -5 || true

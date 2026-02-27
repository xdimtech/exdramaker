#!/bin/bash

# 服务器状态诊断脚本
# 用法: ./scripts/diagnose-server.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_check() {
    echo -e "${BLUE}[?]${NC} $1"
}

echo "========================================="
echo "服务器状态诊断"
echo "========================================="
echo ""

# 1. 检查当前目录
log_check "检查 1: 当前目录"
pwd
if [ -f "package.json" ]; then
    log_info "在项目根目录"
else
    log_error "不在项目根目录！请 cd 到项目根目录"
    exit 1
fi
echo ""

# 2. 检查 Git 状态
log_check "检查 2: Git 状态"
git log --oneline -3
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "当前提交: $CURRENT_COMMIT"
echo ""

# 3. 检查构建文件是否存在
log_check "检查 3: 构建产物"
if [ -f "excalidraw-app/build/index.html" ]; then
    log_info "index.html 存在"
    BUILD_TIME=$(stat -f "%Sm" excalidraw-app/build/index.html 2>/dev/null || stat -c "%y" excalidraw-app/build/index.html 2>/dev/null)
    echo "构建时间: $BUILD_TIME"
else
    log_error "index.html 不存在！需要运行构建"
    exit 1
fi
echo ""

# 4. 检查 HTML 内容
log_check "检查 4: HTML 文件内容"
echo "检查是否包含源码路径引用..."

if grep -q "packages/excalidraw/fonts/fonts.css" excalidraw-app/build/index.html; then
    log_error "HTML 包含源码路径: packages/excalidraw/fonts/fonts.css"
    echo "这是旧版本的构建文件！"
    NEED_REBUILD=true
else
    log_info "HTML 不包含源码路径"
fi

if grep -q 'src="index.tsx"' excalidraw-app/build/index.html; then
    log_error "HTML 引用源码文件: index.tsx"
    echo "这是旧版本的构建文件！"
    NEED_REBUILD=true
else
    log_info "HTML 不引用源码文件"
fi

if grep -q '/assets/index-' excalidraw-app/build/index.html; then
    log_info "HTML 正确引用构建产物: /assets/index-*"
else
    log_error "HTML 没有引用构建产物"
    NEED_REBUILD=true
fi
echo ""

# 5. 检查 PM2 状态
log_check "检查 5: PM2 进程状态"
if command -v pm2 &> /dev/null; then
    pm2 list | grep exdramaker || log_warn "未找到 exdramaker 进程"
    echo ""
    echo "PM2 进程详情:"
    pm2 describe exdramaker 2>/dev/null | grep -E "(cwd|script|status)" || log_warn "未找到进程详情"
else
    log_error "PM2 未安装"
fi
echo ""

# 6. 检查构建产物的文件
log_check "检查 6: 构建产物文件列表"
echo "JS bundles:"
ls -lh excalidraw-app/build/assets/index-*.js 2>/dev/null | head -3 || log_error "未找到 JS bundles"
echo ""
echo "CSS bundles:"
ls -lh excalidraw-app/build/assets/index-*.css 2>/dev/null | head -3 || log_error "未找到 CSS bundles"
echo ""

# 7. 检查 favicon 文件
log_check "检查 7: Favicon 文件"
for file in favicon-16x16.png favicon-32x32.png apple-touch-icon.png; do
    if [ -f "excalidraw-app/build/$file" ]; then
        log_info "$file 存在"
    else
        log_error "$file 不存在"
    fi
done
echo ""

# 8. 显示 HTML 中的关键引用
log_check "检查 8: HTML 中的资源引用"
echo "Script 标签:"
grep -o '<script[^>]*src="[^"]*"' excalidraw-app/build/index.html | head -3
echo ""
echo "Link 标签 (CSS):"
grep -o '<link[^>]*href="[^"]*\.css"' excalidraw-app/build/index.html | head -3
echo ""

# 9. 总结
echo "========================================="
echo "诊断总结"
echo "========================================="

if [ "${NEED_REBUILD}" = "true" ]; then
    log_error "需要重新构建！"
    echo ""
    echo "问题：构建文件是旧版本"
    echo ""
    echo "解决方案："
    echo "  1. 运行: ./scripts/quick-redeploy.sh"
    echo "  或者手动执行："
    echo "  2. yarn rm:build"
    echo "  3. yarn build:prod"
    echo "  4. pm2 restart exdramaker"
else
    log_info "构建文件看起来正常"
    echo ""
    echo "如果网站仍然有问题，可能需要："
    echo "  1. 重启 PM2: pm2 restart exdramaker"
    echo "  2. 清除浏览器缓存"
    echo "  3. 检查 nginx/反向代理配置"
fi
echo ""

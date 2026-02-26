#!/bin/bash

# 构建和发布脚本
# 用法: ./scripts/build-release.sh [选项]
# 选项:
#   --docker       构建 Docker 镜像
#   --compose      使用 Docker Compose 启动生产环境
#   --local        本地构建并启动
#   --all          执行全部操作

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Node.js 版本
check_node() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi

    NODE_VERSION=$(node -v)
    log_info "Node.js 版本: $NODE_VERSION"
}

# 本地构建
build_local() {
    log_info "开始本地构建..."
    yarn build:prod
    log_info "本地构建完成！"
    log_info "构建产物: excalidraw-app/build/"
}

# 构建 Docker 镜像
build_docker() {
    log_info "开始构建 Docker 镜像..."
    yarn build:docker
    log_info "Docker 镜像构建完成！"
}

# 使用 Docker Compose 启动生产环境
start_compose_prod() {
    log_info "使用 Docker Compose 启动生产环境..."
    yarn compose:prod:build:detach
    log_info "生产环境已启动！"
    log_info "访问 http://localhost:8080"
}

# 本地启动生产服务器（使用 PM2）
start_local_server() {
    log_info "启动本地生产服务器（PM2）..."

    # 检查 PM2 是否安装
    if ! command -v pm2 &> /dev/null; then
        log_warn "PM2 未安装，正在安装..."
        npm install -g pm2
    fi

    # 停止已有进程
    pm2 stop exdramaker 2>/dev/null || true
    pm2 delete exdramaker 2>/dev/null || true

    # 启动应用
    cd excalidraw-app
    pm2 start npx --name exdramaker -- -y http-server@latest -a 0.0.0.0 -p 5001 --cors ./build
    pm2 save

    log_info "本地服务器已启动！"
    log_info "访问 http://localhost:5001 或通过域名访问"
}

# 显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --docker       构建 Docker 镜像"
    echo "  --compose      使用 Docker Compose 启动生产环境"
    echo "  --local        本地构建并启动"
    echo "  --all          执行全部操作（构建 Docker 并启动 Compose）"
    echo "  -h, --help     显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 --local           # 本地构建"
    echo "  $0 --docker          # 构建 Docker 镜像"
    echo "  $0 --compose         # 启动 Docker Compose 生产环境"
    echo "  $0 --all             # 完整流程"
}

# 主逻辑
main() {
    check_node

    if [ $# -eq 0 ]; then
        log_info "未指定选项，默认执行本地构建..."
        build_local
        start_local_server
        exit 0
    fi

    case "$1" in
        --docker)
            build_docker
            ;;
        --compose)
            start_compose_prod
            ;;
        --local)
            build_local
            start_local_server
            ;;
        --all)
            build_local
            build_docker
            start_compose_prod
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"

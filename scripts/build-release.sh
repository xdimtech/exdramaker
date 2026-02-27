#!/bin/bash

# 构建和发布脚本
# 用法: ./scripts/build-release.sh [选项]
# 选项:
#   --docker       构建 Docker 镜像
#   --compose      使用 Docker Compose 启动生产环境
#   --local        本地构建并启动
#   --all          执行全部操作
#   --no-pull      跳过 git pull（用于本地开发）

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 是否跳过 git pull
SKIP_PULL=false

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
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

# 前置准备：拉取代码、清理、安装依赖
prepare_build() {
    log_step "========================================="
    log_step "准备构建环境"
    log_step "========================================="

    # 1. 拉取最新代码
    if [ "$SKIP_PULL" = false ]; then
        log_info "1/3 拉取最新代码..."
        if git rev-parse --git-dir > /dev/null 2>&1; then
            BEFORE_COMMIT=$(git rev-parse HEAD)
            git pull origin main || {
                log_warn "git pull 失败，继续使用当前代码"
            }
            AFTER_COMMIT=$(git rev-parse HEAD)

            if [ "$BEFORE_COMMIT" = "$AFTER_COMMIT" ]; then
                log_info "代码已是最新版本"
            else
                log_info "代码已更新: $BEFORE_COMMIT -> $AFTER_COMMIT"
                git log --oneline -3
            fi
        else
            log_warn "不是 Git 仓库，跳过 git pull"
        fi
    else
        log_info "1/3 跳过 git pull（--no-pull 选项）"
    fi

    # 2. 清理旧构建产物
    log_info "2/3 清理旧构建产物..."
    yarn rm:build || log_warn "清理构建产物失败，继续执行"

    # 3. 安装/更新依赖
    log_info "3/3 安装/更新依赖..."
    yarn install

    log_step "========================================="
    log_info "准备完成！开始构建..."
    log_step "========================================="
    echo ""
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
    # -c-1: 禁用缓存，确保 HTML 文件始终获取最新版本
    # --cors: 启用 CORS
    # -a 0.0.0.0: 监听所有网络接口
    # -p 5001: 端口号
    pm2 start npx --name exdramaker -- -y http-server@latest -a 0.0.0.0 -p 5001 --cors -c-1 ./build
    pm2 save

    log_info "本地服务器已启动！"
    log_info "访问 http://localhost:5001 或通过域名访问"
    log_info "查看日志: pm2 logs exdramaker"
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
    echo "  --no-pull      跳过 git pull（用于本地开发）"
    echo "  -h, --help     显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 --local                # 服务器部署（拉取最新代码+构建+启动）"
    echo "  $0 --local --no-pull      # 本地开发（仅构建+启动，不拉取代码）"
    echo "  $0 --docker               # 构建 Docker 镜像"
    echo "  $0 --compose              # 启动 Docker Compose 生产环境"
    echo "  $0 --all                  # 完整流程"
}

# 主逻辑
main() {
    check_node

    # 解析 --no-pull 选项
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --no-pull)
                SKIP_PULL=true
                shift
                ;;
            *)
                break
                ;;
        esac
    done

    if [ $# -eq 0 ]; then
        log_info "未指定选项，默认执行本地构建..."
        prepare_build
        build_local
        start_local_server
        exit 0
    fi

    case "$1" in
        --docker)
            prepare_build
            build_docker
            ;;
        --compose)
            prepare_build
            start_compose_prod
            ;;
        --local)
            prepare_build
            build_local
            start_local_server
            ;;
        --all)
            prepare_build
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

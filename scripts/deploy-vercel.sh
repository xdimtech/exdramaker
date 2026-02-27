#!/bin/bash

# Vercel 部署脚本
# 用法: ./scripts/deploy-vercel.sh [production|preview]

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 Vercel 部署脚本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# 检查 Vercel CLI 是否安装
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI 未安装"
    echo "请先安装: npm install -g vercel"
    exit 1
fi

echo "✅ Vercel CLI 已安装: $(vercel --version | head -1)"

# 检查是否已登录
if ! vercel whoami &> /dev/null; then
    echo
    echo "❌ 未登录 Vercel"
    echo "请先执行: vercel login"
    echo
    echo "登录后，重新运行此脚本"
    exit 1
fi

VERCEL_USER=$(vercel whoami 2>&1 | tail -1)
echo "✅ 已登录 Vercel: $VERCEL_USER"
echo

# 确定部署类型
DEPLOY_ENV=${1:-preview}

if [ "$DEPLOY_ENV" = "production" ]; then
    echo "🎯 部署类型: 生产环境 (Production)"
    echo "⚠️  警告: 这将部署到生产环境！"
    echo
    read -p "确认部署到生产环境？(yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ 部署已取消"
        exit 0
    fi
    VERCEL_ARGS="--prod"
else
    echo "🎯 部署类型: 预览环境 (Preview)"
    VERCEL_ARGS=""
fi

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📦 开始部署..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# 执行部署
vercel $VERCEL_ARGS

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ 部署完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "查看部署状态:"
echo "$ vercel ls"
echo
echo "查看项目详情:"
echo "$ vercel inspect"
echo

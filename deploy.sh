#!/bin/bash
# VC Tracker 一键部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e  # 遇到错误立即停止

echo "================================"
echo "🚀 VC Tracker 一键部署脚本"
echo "================================"
echo ""

# 检查是否在正确目录
if [ ! -f "main.py" ]; then
    echo "❌ 错误: 请在 News-about-VC 目录中运行此脚本"
    exit 1
fi

# 获取GitHub用户名
echo "请输入您的GitHub用户名:"
read -r GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo "❌ 错误: GitHub用户名不能为空"
    exit 1
fi

REPO_NAME="News-about-VC"
REPO_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

echo ""
echo "📋 部署信息:"
echo "  GitHub用户名: $GITHUB_USERNAME"
echo "  仓库名: $REPO_NAME"
echo "  仓库地址: $REPO_URL"
echo "  网站地址: https://$GITHUB_USERNAME.github.io/$REPO_NAME/"
echo ""

# 确认
read -p "确认开始部署? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "已取消部署"
    exit 0
fi

echo ""
echo "步骤1/5: 检查Git..."
if ! command -v git &> /dev/null; then
    echo "❌ 错误: 未安装Git，请先安装Git"
    exit 1
fi
echo "✅ Git已安装"

# 检查远程仓库是否存在
echo ""
echo "步骤2/5: 检查远程仓库..."
if git remote get-url origin &> /dev/null; then
    echo "⚠️  发现已有的远程仓库:"
    git remote -v
    read -p "是否覆盖? (y/n): " override
    if [ "$override" != "y" ]; then
        echo "已取消"
        exit 0
    fi
    git remote remove origin
fi

# 初始化Git（如果没有）
echo ""
echo "步骤3/5: 初始化Git仓库..."
if [ ! -d ".git" ]; then
    git init
    echo "✅ Git仓库初始化完成"
else
    echo "✅ Git仓库已存在"
fi

# 配置Git
git config user.email "deploy@vc-tracker.local" || true
git config user.name "VC Tracker Deploy" || true

# 添加所有文件
echo ""
echo "步骤4/5: 提交代码..."
git add .
if git diff --cached --quiet; then
    echo "✅ 没有需要提交的更改"
else
    git commit -m "Initial commit with GitHub Pages support"
    echo "✅ 代码已提交"
fi

# 关联远程仓库并推送
echo ""
echo "步骤5/5: 推送到GitHub..."
git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"

# 创建并切换到main分支
git branch -M main

# 推送
if git push -u origin main; then
    echo "✅ 代码已推送到GitHub"
else
    echo ""
    echo "❌ 推送失败，可能原因:"
    echo "  1. GitHub仓库不存在"
    echo "  2. 没有权限（需要先在GitHub创建仓库）"
    echo "  3. 需要登录GitHub"
    echo ""
    echo "请先在GitHub创建仓库:"
    echo "  1. 访问 https://github.com/new"
    echo "  2. Repository name: $REPO_NAME"
    echo "  3. 点击 'Create repository'"
    echo "  4. 然后重新运行此脚本"
    exit 1
fi

echo ""
echo "================================"
echo "✅ 部署完成！"
echo "================================"
echo ""
echo "📱 请访问: https://$GITHUB_USERNAME.github.io/$REPO_NAME/"
echo ""
echo "⚙️  下一步（必须）:"
echo "  1. 打开 https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo "  2. 点击 Settings → Pages"
echo "  3. Source 选择 'GitHub Actions'"
echo "  4. 点击 Actions 标签，运行工作流"
echo ""
echo "⏰ 自动更新: 每天北京时间 10:00 和 22:00"
echo ""

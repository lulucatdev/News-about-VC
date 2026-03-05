#!/bin/bash
# -*- coding: utf-8 -*-
"""
VC追踪器 Web界面启动脚本
"""

echo "=========================================="
echo "🚀 VC投资热度追踪器 - Web界面启动器"
echo "=========================================="
echo ""

# 检查是否在项目目录中
if [ ! -f "web_server.py" ]; then
    echo "❌ 错误：请确保在项目根目录运行此脚本"
    echo "   正确路径: News-about-VC/"
    exit 1
fi

# 检查虚拟环境
if [ -d "venv" ]; then
    echo "✅ 找到虚拟环境"
    source venv/bin/activate
else
    echo "⚠️  警告：未找到虚拟环境，将使用系统Python"
fi

echo ""
echo "📦 正在启动Web服务器..."
echo ""

# 启动服务器
python web_server.py

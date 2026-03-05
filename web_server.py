# -*- coding: utf-8 -*-
"""
VC投资热度追踪器 - Web服务器 v2.0
支持新的4个数据源：Paul Graham, Hacker News, Product Hunt, IT桔子
"""

import http.server
import socketserver
import json
import threading
import webbrowser
from datetime import datetime
import sys
import os
import subprocess
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vc_tracker.multi_crawler import MultiCrawler

PORT = 8081

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VC追踪器 v2.0 - VC & Startup News</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.98);
            border-radius: 20px;
            box-shadow: 0 25px 80px rgba(0,0,0,0.4);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></svg>');
            background-size: 50px 50px;
            opacity: 0.3;
        }
        
        .header h1 {
            font-size: 2.8em;
            margin-bottom: 15px;
            position: relative;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .header p {
            opacity: 0.95;
            font-size: 1.2em;
            position: relative;
        }
        
        .data-sources {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 20px;
            flex-wrap: wrap;
            position: relative;
        }
        
        .source-badge {
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9em;
            backdrop-filter: blur(10px);
        }
        
        .controls {
            padding: 25px 30px;
            background: #f8f9fa;
            border-bottom: 2px solid #e9ecef;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
        }
        
        .control-group {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 12px 28px;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
        
        .btn-primary:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        
        .btn-secondary {
            background: white;
            color: #667eea;
            border: 2px solid #667eea;
        }
        
        .btn-secondary:hover {
            background: #667eea;
            color: white;
        }
        
        .btn-danger {
            background: #e74c3c;
            color: white;
        }
        
        .btn-danger:hover {
            background: #c0392b;
        }
        
        select, input {
            padding: 12px 18px;
            border: 2px solid #dee2e6;
            border-radius: 10px;
            font-size: 14px;
            background: white;
            min-width: 150px;
        }
        
        select:focus, input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .stats-bar {
            display: flex;
            padding: 20px 30px;
            background: #fff;
            border-bottom: 1px solid #e9ecef;
            gap: 30px;
            flex-wrap: wrap;
        }
        
        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 10px 20px;
            background: #f8f9fa;
            border-radius: 10px;
            min-width: 120px;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        
        .stat-label {
            font-size: 0.9em;
            color: #6c757d;
            margin-top: 5px;
        }
        
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(5px);
        }
        
        .loading-overlay.active {
            display: flex;
        }
        
        .loading-content {
            background: white;
            padding: 40px 60px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        
        .spinner {
            width: 60px;
            height: 60px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .table-container {
            padding: 0;
            overflow-x: auto;
            max-height: 600px;
            overflow-y: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th {
            background: linear-gradient(135deg, #495057 0%, #343a40 100%);
            color: white;
            padding: 18px 15px;
            text-align: left;
            font-weight: 600;
            position: sticky;
            top: 0;
            z-index: 10;
            font-size: 0.95em;
        }
        
        th:first-child {
            text-align: center;
            width: 70px;
        }
        
        td {
            padding: 15px;
            border-bottom: 1px solid #e9ecef;
            vertical-align: top;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        tr:nth-child(even) {
            background: #fafbfc;
        }
        
        tr:nth-child(even):hover {
            background: #f0f1f2;
        }
        
        .source-tag {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .source-paulgraham { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
        .source-hackernews { background: #fff3e0; color: #ef6c00; border: 1px solid #ffcc80; }
        .source-producthunt { background: #fce4ec; color: #c2185b; border: 1px solid #f8bbd0; }
        .source-itjuzi { background: #e3f2fd; color: #1976d2; border: 1px solid #90caf9; }
        
        .sector-tag {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.8em;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .title-link {
            color: #2c3e50;
            text-decoration: none;
            font-weight: 500;
            line-height: 1.5;
            display: block;
        }
        
        .title-link:hover {
            color: #667eea;
            text-decoration: underline;
        }
        
        .empty-state {
            text-align: center;
            padding: 80px 20px;
            color: #6c757d;
        }
        
        .empty-state-icon {
            font-size: 4em;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        
        .footer {
            padding: 25px;
            text-align: center;
            background: #f8f9fa;
            color: #6c757d;
            font-size: 0.9em;
            border-top: 1px solid #e9ecef;
        }
        
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 16px 24px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            display: none;
            align-items: center;
            gap: 12px;
            z-index: 1001;
            animation: slideIn 0.3s ease;
        }
        
        .toast.show {
            display: flex;
        }
        
        .toast.success {
            border-left: 4px solid #4CAF50;
        }
        
        .toast.error {
            border-left: 4px solid #e74c3c;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @media (max-width: 768px) {
            .controls {
                flex-direction: column;
                align-items: stretch;
            }
            
            .control-group {
                justify-content: center;
            }
            
            .header h1 {
                font-size: 2em;
            }
            
            table {
                font-size: 0.9em;
            }
            
            td, th {
                padding: 12px 10px;
            }
        }
    </style>
</head>
<body>
    <div class="loading-overlay" id="loadingOverlay">
        <div class="loading-content">
            <div class="spinner"></div>
            <h3>正在抓取数据...</h3>
            <p id="loadingText">请稍候，这可能需要几分钟</p>
        </div>
    </div>
    
    <div class="toast" id="toast">
        <span id="toastIcon">✓</span>
        <span id="toastMessage">操作成功</span>
    </div>
    
    <div class="container">
        <div class="header">
            <h1>🚀 VC追踪器 v2.0</h1>
            <p>聚合全球创业投资资讯 | Paul Graham · Hacker News · Product Hunt · IT桔子</p>
            <div class="data-sources">
                <span class="source-badge">🇺🇸 Paul Graham</span>
                <span class="source-badge">🇺🇸 Hacker News</span>
                <span class="source-badge">🇺🇸 Product Hunt</span>
                <span class="source-badge">🇨🇳 IT桔子</span>
            </div>
        </div>
        
        <div class="controls">
            <div class="control-group">
                <button class="btn btn-primary" id="refreshBtn" onclick="refreshData()">
                    <span>🔄</span> 立即抓取
                </button>
                <button class="btn btn-secondary" onclick="loadExistingData()">
                    <span>📂</span> 加载已有数据
                </button>
            </div>
            
            <div class="control-group">
                <select id="source-filter" onchange="filterData()">
                    <option value="all">📊 全部来源</option>
                    <option value="Paul Graham">📝 Paul Graham</option>
                    <option value="Hacker News">🔥 Hacker News</option>
                    <option value="Product Hunt">🚀 Product Hunt</option>
                    <option value="IT桔子">💰 IT桔子</option>
                </select>
                
                <input type="text" id="search-input" placeholder="🔍 搜索标题..." onkeyup="filterData()">
            </div>
        </div>
        
        <div class="stats-bar" id="statsBar">
            <div class="stat-item">
                <span class="stat-value" id="totalCount">0</span>
                <span class="stat-label">总新闻数</span>
            </div>
            <div class="stat-item">
                <span class="stat-value" id="pgCount">0</span>
                <span class="stat-label">Paul Graham</span>
            </div>
            <div class="stat-item">
                <span class="stat-value" id="hnCount">0</span>
                <span class="stat-label">Hacker News</span>
            </div>
            <div class="stat-item">
                <span class="stat-value" id="phCount">0</span>
                <span class="stat-label">Product Hunt</span>
            </div>
            <div class="stat-item">
                <span class="stat-value" id="ijCount">0</span>
                <span class="stat-label">IT桔子</span>
            </div>
            <div class="stat-item">
                <span class="stat-value" id="lastUpdate">--</span>
                <span class="stat-label">最后更新</span>
            </div>
        </div>
        
        <div class="table-container">
            <table id="news-table">
                <thead>
                    <tr>
                        <th>序号</th>
                        <th>来源</th>
                        <th>标题 / 摘要</th>
                        <th>领域</th>
                        <th>发布时间</th>
                    </tr>
                </thead>
                <tbody id="table-body">
                    <tr>
                        <td colspan="5">
                            <div class="empty-state">
                                <div class="empty-state-icon">📭</div>
                                <h3>暂无数据</h3>
                                <p>点击"立即抓取"按钮获取最新资讯</p>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>💡 提示：首次使用请点击"立即抓取"按钮获取数据 | 数据自动保留90天</p>
            <p>最后更新: <span id="footerUpdate">从未</span></p>
        </div>
    </div>
    
    <script>
        let allData = [];
        let filteredData = [];
        
        // 页面加载时尝试加载已有数据
        window.onload = function() {
            loadExistingData();
        };
        
        // 显示加载遮罩
        function showLoading(message) {
            document.getElementById('loadingOverlay').classList.add('active');
            if (message) {
                document.getElementById('loadingText').textContent = message;
            }
        }
        
        // 隐藏加载遮罩
        function hideLoading() {
            document.getElementById('loadingOverlay').classList.remove('active');
        }
        
        // 显示提示
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            const icon = document.getElementById('toastIcon');
            const msg = document.getElementById('toastMessage');
            
            toast.className = 'toast ' + type;
            icon.textContent = type === 'success' ? '✓' : '✗';
            msg.textContent = message;
            
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
        
        // 加载已有数据
        async function loadExistingData() {
            try {
                const response = await fetch('/api/data');
                const data = await response.json();
                
                if (data && data.length > 0) {
                    allData = data;
                    filterData();
                    updateStats();
                    showToast(`已加载 ${data.length} 条历史数据`);
                } else {
                    showEmptyState();
                }
            } catch (error) {
                showEmptyState();
                console.error('加载数据失败:', error);
            }
        }
        
        // 刷新数据（抓取新数据）
        async function refreshData() {
            const btn = document.getElementById('refreshBtn');
            btn.disabled = true;
            showLoading('正在从4个数据源抓取最新资讯，请稍候...');
            
            try {
                const response = await fetch('/api/refresh', { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    allData = result.data;
                    filterData();
                    updateStats();
                    showToast(`✅ 抓取成功！共获取 ${result.count} 条新闻`);
                } else {
                    showToast('❌ 抓取失败: ' + result.error, 'error');
                }
            } catch (error) {
                showToast('❌ 网络错误: ' + error.message, 'error');
            } finally {
                hideLoading();
                btn.disabled = false;
            }
        }
        
        // 显示空状态
        function showEmptyState() {
            const tbody = document.getElementById('table-body');
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-state">
                            <div class="empty-state-icon">📭</div>
                            <h3>暂无数据</h3>
                            <p>点击上方"立即抓取"按钮获取最新资讯</p>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        // 显示数据
        function displayData(data) {
            const tbody = document.getElementById('table-body');
            
            if (data.length === 0) {
                showEmptyState();
                return;
            }
            
            let html = '';
            data.forEach((item, index) => {
                const sourceClass = 'source-' + getSourceClass(item.source);
                const title = item.title.length > 100 ? item.title.substring(0, 100) + '...' : item.title;
                const summary = item.summary ? `<br><small style="color: #6c757d; margin-top: 5px; display: block;">${item.summary.substring(0, 150)}${item.summary.length > 150 ? '...' : ''}</small>` : '';
                
                let timeDisplay = '--';
                if (item.publish_time) {
                    const date = new Date(item.publish_time);
                    if (!isNaN(date.getTime())) {
                        timeDisplay = date.toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                }
                
                html += `
                    <tr>
                        <td style="text-align: center; font-weight: bold; color: #667eea;">${index + 1}</td>
                        <td><span class="source-tag ${sourceClass}">${item.source}</span></td>
                        <td>
                            <a href="${item.url}" target="_blank" class="title-link">
                                ${title}
                            </a>
                            ${summary}
                        </td>
                        <td>${item.sector ? `<span class="sector-tag">${item.sector}</span>` : '--'}</td>
                        <td style="white-space: nowrap; color: #6c757d; font-size: 0.9em;">${timeDisplay}</td>
                    </tr>
                `;
            });
            
            tbody.innerHTML = html;
        }
        
        // 获取来源类名
        function getSourceClass(source) {
            if (source.includes('Paul')) return 'paulgraham';
            if (source.includes('Hacker')) return 'hackernews';
            if (source.includes('Product')) return 'producthunt';
            if (source.includes('IT')) return 'itjuzi';
            return 'other';
        }
        
        // 筛选数据
        function filterData() {
            const sourceFilter = document.getElementById('source-filter').value;
            const searchKeyword = document.getElementById('search-input').value.toLowerCase().trim();
            
            filteredData = allData;
            
            // 来源筛选
            if (sourceFilter !== 'all') {
                filteredData = filteredData.filter(item => item.source === sourceFilter);
            }
            
            // 关键词搜索
            if (searchKeyword) {
                filteredData = filteredData.filter(item => 
                    item.title.toLowerCase().includes(searchKeyword) ||
                    (item.summary && item.summary.toLowerCase().includes(searchKeyword))
                );
            }
            
            displayData(filteredData);
            document.getElementById('totalCount').textContent = filteredData.length;
        }
        
        // 更新统计
        function updateStats() {
            const counts = {
                'Paul Graham': 0,
                'Hacker News': 0,
                'Product Hunt': 0,
                'IT桔子': 0
            };
            
            allData.forEach(item => {
                if (counts.hasOwnProperty(item.source)) {
                    counts[item.source]++;
                }
            });
            
            document.getElementById('totalCount').textContent = allData.length;
            document.getElementById('pgCount').textContent = counts['Paul Graham'];
            document.getElementById('hnCount').textContent = counts['Hacker News'];
            document.getElementById('phCount').textContent = counts['Product Hunt'];
            document.getElementById('ijCount').textContent = counts['IT桔子'];
            
            const now = new Date().toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            document.getElementById('lastUpdate').textContent = now;
            document.getElementById('footerUpdate').textContent = now;
        }
    </script>
</body>
</html>
"""


class VCRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自定义请求处理器"""
    
    multi_crawler = MultiCrawler()
    
    def do_GET(self):
        """处理GET请求"""
        if self.path == '/' or self.path == '/index.html':
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode('utf-8'))
        
        elif self.path == '/api/data':
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.end_headers()
            
            # 加载已有数据
            self.multi_crawler.load_data()
            data = [item.to_dict() for item in self.multi_crawler.data]
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
        
        else:
            super().do_GET()
    
    def do_POST(self):
        """处理POST请求"""
        if self.path == '/api/refresh':
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.end_headers()
            
            try:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 开始抓取数据...")
                # 执行抓取
                self.multi_crawler.refresh(max_items_per_site=30)
                self.multi_crawler.save_data()
                
                data = [item.to_dict() for item in self.multi_crawler.data]
                response = {
                    'success': True,
                    'count': len(data),
                    'data': data
                }
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 抓取完成，共 {len(data)} 条")
            except Exception as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 抓取失败: {str(e)}")
                response = {
                    'success': False,
                    'error': str(e)
                }
            
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        
        else:
            self.send_error(404)
    
    def log_message(self, format, *args):
        """覆盖日志方法"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]}")


def start_server():
    """启动服务器"""
    with socketserver.TCPServer(("", PORT), VCRequestHandler) as httpd:
        print(f"\n{'='*70}")
        print(f"🚀 VC投资热度追踪器 v2.0 - Web服务器已启动")
        print(f"{'='*70}")
        print(f"\n📱 请在浏览器中访问:")
        print(f"   http://localhost:{PORT}")
        print(f"\n💡 使用说明:")
        print(f"   1. 点击'立即抓取'按钮获取最新资讯")
        print(f"   2. 支持按来源筛选和关键词搜索")
        print(f"   3. 数据会自动保存并保留90天")
        print(f"\n⚡ 按 Ctrl+C 停止服务器")
        print(f"{'='*70}\n")
        
        # 自动打开浏览器
        threading.Timer(2.0, lambda: webbrowser.open(f'http://localhost:{PORT}')).start()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 服务器已停止")


if __name__ == '__main__':
    start_server()

# VC投资热度追踪器 (v2.0 - 新版)

一个用于追踪和分析多站点VC投资新闻的Python工具，支持Paul Graham、Hacker News、Product Hunt和IT桔子。

## 🚀 新增功能 (v2.0)

- 🔥 **全新4大数据源**: Paul Graham + Hacker News + Product Hunt + IT桔子
- 📝 **Title列表**: 自动刷新和列出所有新闻标题
- 🔄 **智能刷新**: 一键刷新所有数据源
- 🌐 **国际化**: 支持中英文VC资讯

## 支持的数据源

| 数据源 | 网站 | 内容类型 |
|--------|------|----------|
| 🇺🇸 Paul Graham | https://paulgraham.com/articles.html | 创业与投资经典文章 |
| 🇺🇸 Hacker News | https://news.ycombinator.com/ | 技术社区热门讨论 |
| 🇺🇸 Product Hunt | https://www.producthunt.com/ | 新产品发布与趋势 |
| 🇨🇳 IT桔子 | https://www.itjuzi.com/ | 中国投融资数据 |

## 功能特点

- 🕷️ **多站点抓取**: 从4个不同来源抓取VC/创业相关信息
- 📋 **Title列表**: 实时列出和刷新新闻标题
- 📊 **赛道热度分析**: 识别最热门的投资赛道
- 📈 **可视化图表**: 生成多种图表和交互式仪表板
- 💾 **数据导出**: 支持JSON/CSV/HTML格式
- 🔄 **自动刷新**: 支持定时更新和手动刷新
- ⏰ **智能过滤**: 自动过滤90天前的旧数据

## 安装

```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

## 使用方法

### 🎯 快速开始

```bash
# 抓取所有站点并显示标题列表
python main.py multi-all --max-items 20

# 列出所有新闻标题（自动刷新）
python main.py list --refresh

# 刷新所有数据源
python main.py refresh --all
```

### 📰 Title列表功能

```bash
# 列出所有标题
python main.py list

# 刷新后列出
python main.py list --refresh

# 只显示前20条
python main.py list --limit 20

# 按数据源筛选
python main.py list --source paulgraham
python main.py list --source hackernews
python main.py list --source producthunt
python main.py list --source itjuzi
```

### 🌐 多站点抓取

```bash
# 抓取所有4个站点
python main.py multi-crawl --all

# 只抓取指定站点
python main.py multi-crawl --pg --hn    # Paul Graham + Hacker News
python main.py multi-crawl --ph --ij    # Product Hunt + IT桔子

# 抓取Paul Graham和Hacker News
python main.py multi-crawl --pg --hn

# 设置每站点最大条目数
python main.py multi-crawl --all --max-items 50
```

### 🔄 数据刷新

```bash
# 刷新所有数据源
python main.py refresh --all

# 刷新指定数据源
python main.py refresh --pg --hn
python main.py refresh --ph
```

### 📊 分析功能

```bash
# 抓取36kr数据（保留原有功能）
python main.py crawl --pages 5

# 分析数据
python main.py analyze

# 生成可视化图表
python main.py visualize

# 生成报告
python main.py report --format html

# 一键执行全部
python main.py all --pages 10
```

## 使用示例

### 示例1: 查看今日所有VC新闻标题

```bash
python main.py list --refresh --limit 30
```

输出:
```
================================================================================
新闻标题列表 (共 30 条)
================================================================================

  1. [Hacker News]   Show HN: 我开发了一个开源的AI工具...
  2. [Product Hunt]  Product: 新的项目管理工具...
  3. [IT桔子]        某AI公司完成5000万美元B轮融资...
  4. [Paul Graham]   How to Start a Startup...
  ...
```

### 示例2: 抓取并分析特定数据源

```bash
# 抓取Hacker News和Product Hunt
python main.py multi-crawl --hn --ph --max-items 20 --verbose

# 查看抓取结果
python main.py list --limit 40
```

### 示例3: 完整的多站点工作流程

```bash
# 1. 刷新所有数据源
python main.py refresh --all

# 2. 查看标题列表
python main.py list --limit 50

# 3. 筛选感兴趣的来源
python main.py list --source hackernews --limit 20
```

## 数据结构

抓取的数据包含以下字段：

```python
{
    "title": "新闻标题",
    "url": "文章链接",
    "source": "数据来源 (Paul Graham/Hacker News/Product Hunt/IT桔子)",
    "publish_time": "发布时间",
    "summary": "摘要",
    "company": "公司名称（IT桔子数据）",
    "amount": "融资金额（IT桔子数据）",
    "round": "融资轮次（IT桔子数据）",
    "sector": "赛道/行业",
    "investors": ["投资方列表"],
    "unique_id": "唯一标识",
    "crawl_time": "抓取时间"
}
```

## 项目结构

```
News-about-VC/
├── vc_tracker/
│   ├── __init__.py
│   ├── crawler.py          # 36kr爬虫模块
│   ├── multi_crawler.py    # 多站点爬虫（新4个数据源）
│   ├── analyzer.py         # 数据分析模块
│   ├── visualizer.py       # 可视化模块
│   └── utils.py            # 工具函数
├── data/                   # 数据存储
│   ├── funding_data.json   # 36kr数据
│   └── multi_source_news.json  # 多站点数据
├── output/                 # 输出目录
│   ├── charts/             # 图表
│   └── reports/            # 报告
├── config/
│   └── settings.py
├── main.py                 # 主程序入口
├── requirements.txt
├── README.md
├── GITHUB_GUIDE.md
└── .gitignore
```

## 命令速查表

| 命令 | 说明 |
|------|------|
| `python main.py list` | 列出所有标题 |
| `python main.py list --refresh` | 刷新并列出 |
| `python main.py refresh --all` | 刷新所有数据源 |
| `python main.py multi-crawl --all` | 抓取所有4个站点 |
| `python main.py multi-crawl --pg --hn` | 抓取PG和HN |
| `python main.py list --source hackernews` | 只列出HN |
| `python main.py multi-all` | 执行多站点完整流程 |
| `python main.py crawl --pages 5` | 抓取36kr（原有） |
| `python main.py analyze` | 分析数据（原有） |
| `python main.py all` | 36kr完整流程（原有） |

## 各数据源说明

### Paul Graham (paulgraham.com)
- **内容**: Y Combinator创始人的创业与投资文章
- **更新频率**: 不定期
- **特点**: 经典创业指导文章，每条都很有价值

### Hacker News (news.ycombinator.com)
- **内容**: 技术社区热门文章和讨论
- **更新频率**: 实时
- **特点**: 全球技术人关注的热点，包含大量创业和融资信息

### Product Hunt (producthunt.com)
- **内容**: 新产品发布和发现
- **更新频率**: 每日
- **特点**: 发现最新产品和创业趋势

### IT桔子 (itjuzi.com)
- **内容**: 中国投融资数据和公司信息
- **更新频率**: 每日
- **特点**: 最全面的中国创业公司融资数据库

## 注意事项

- ⚠️ 请遵守各网站的robots.txt和爬虫政策
- ⏱️ 建议设置合理的抓取间隔（默认2秒）
- 🔑 **IT桔子和Product Hunt抓取限制**：这两个网站使用JavaScript动态渲染或有严格的反爬虫机制，可能无法直接抓取。详情请查看 `DATA_SOURCE_LIMITS.md`
- 💾 数据文件保存在`data/`目录，不会被推送到GitHub
- 🌐 由于网络原因，部分国外网站可能访问较慢

### 🚨 数据源限制说明

**Product Hunt** 和 **IT桔子** 由于技术限制（JavaScript动态渲染、反爬机制、需要登录），**可能无法正常抓取**。

**建议的数据源组合：**
- ✅ **强烈推荐**：Hacker News（稳定）、Paul Graham（稳定）
- ⚠️ **受限**：Product Hunt（建议直接访问）、IT桔子（建议直接访问）

当抓取受限网站失败时，系统会显示友好的提示信息，并附带直接访问链接。

详情请查看：`DATA_SOURCE_LIMITS.md`
- 🔄 数据保留策略：自动清理超过90天的旧数据

## 更新日志

### v2.0 (当前版本)
- ✨ 全新4大数据源：Paul Graham、Hacker News、Product Hunt、IT桔子
- 🔄 替换原有数据源（36kr、a16z、YC）
- 🎯 更聚焦VC/创业相关内容
- ⏰ 智能90天数据保留策略

### v1.0
- 🎉 初始版本
- 支持36kr、a16z、Y Combinator、Hacker News

## GitHub同步

项目代码位于`News-about-VC`文件夹中，详见`GITHUB_GUIDE.md`获取完整的GitHub同步指南。

快速推送：
```bash
cd "News-about-VC"
git add .
git commit -m "v2.0: 更新为4大新数据源"
git push
```

## License

MIT License

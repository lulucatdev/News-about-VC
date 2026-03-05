# GitHub 同步指南

本项目代码位于 `News-about-VC` 文件夹中，同步到GitHub时保持此结构。

## 快速开始

### 1. 初始化Git仓库（如果尚未初始化）

```bash
cd "News-about-VC"
git init
```

### 2. 添加所有文件到Git

```bash
git add .
```

### 3. 提交代码

```bash
git commit -m "Initial commit: VC投资热度追踪器"
```

### 4. 连接到GitHub远程仓库

**如果你还没有创建GitHub仓库：**

1. 访问 https://github.com/new
2. 创建一个新的仓库（例如 `vc-funding-tracker`）
3. **不要初始化README，因为我们已经有了**

**连接远程仓库：**

```bash
git remote add origin https://github.com/YOUR_USERNAME/vc-funding-tracker.git
```

将 `YOUR_USERNAME` 替换为你的GitHub用户名

### 5. 推送到GitHub

```bash
git branch -M main
git push -u origin main
```

## 后续更新代码

每次修改后，使用以下命令更新GitHub：

```bash
cd "News-about-VC"
git add .
git commit -m "更新说明"
git push
```

## 项目结构说明

```
News-about-VC/
├── vc_tracker/          # 核心代码模块
│   ├── __init__.py
│   ├── crawler.py       # 爬虫模块
│   ├── analyzer.py      # 数据分析
│   ├── visualizer.py    # 可视化
│   └── utils.py         # 工具函数
├── data/                # 数据存储（被gitignore，不推送）
├── output/              # 输出文件（被gitignore，不推送）
│   ├── charts/          # 生成的图表
│   └── reports/         # 生成的报告
├── config/              # 配置文件
│   └── settings.py
├── main.py              # 主程序入口
├── requirements.txt     # Python依赖
├── README.md            # 项目说明
├── .gitignore           # Git忽略文件
└── GITHUB_GUIDE.md      # 本文件
```

## 安装依赖

首次运行前，安装Python依赖：

```bash
cd "News-about-VC"
pip install -r requirements.txt
```

## 使用方法

```bash
# 抓取数据
python main.py crawl --pages 5

# 分析数据
python main.py analyze

# 生成可视化
python main.py visualize

# 生成完整报告
python main.py report --format html

# 一键运行全部
python main.py all --pages 5
```

## 注意事项

1. **数据文件**：`data/` 和 `output/` 目录被 `.gitignore` 排除，不会推送到GitHub，只推送代码
2. **API限制**：36kr可能有反爬虫机制，请合理设置抓取间隔
3. **隐私**：请勿提交包含敏感信息的配置文件

## 问题排查

**推送失败？**
```bash
# 检查远程仓库连接
git remote -v

# 如果错误，重新设置
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/vc-funding-tracker.git
```

**权限错误？**
- 确保已配置GitHub个人访问令牌（PAT）
- 或使用SSH方式连接：`git@github.com:YOUR_USERNAME/vc-funding-tracker.git`

---

Happy Coding! 🚀

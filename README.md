# VC Radar

VC & Tech 资讯聚合平台 —— 自动追踪全球 5 大 VC / 科技领袖的最新动态。

**线上地址**: https://vc-radar.lucas-aff.workers.dev/

---

## 目录

- [这个项目是什么？](#这个项目是什么)
- [技术栈总览](#技术栈总览)
- [架构图](#架构图)
- [项目结构详解](#项目结构详解)
  - [app/ — 前端页面和 API](#app--前端页面和-api)
  - [lib/ — 后端逻辑](#lib--后端逻辑)
  - [worker/ — Cloudflare Workers 入口](#worker--cloudflare-workers-入口)
  - [migrations/ — 数据库迁移](#migrations--数据库迁移)
  - [scripts/ — 开发辅助脚本](#scripts--开发辅助脚本)
  - [配置文件](#配置文件)
- [关键概念解释](#关键概念解释)
  - [什么是 vinext？](#什么是-vinext)
  - [什么是 Cloudflare Workers？](#什么是-cloudflare-workers)
  - [什么是 D1？](#什么是-d1)
  - [什么是 Migration（数据库迁移）？](#什么是-migration数据库迁移)
  - [什么是 Cron Trigger？](#什么是-cron-trigger)
  - [SSR 和 CSR 的区别](#ssr-和-csr-的区别)
- [数据流：一篇文章从爬取到显示的完整路径](#数据流一篇文章从爬取到显示的完整路径)
- [本地开发指南](#本地开发指南)
- [部署到 Cloudflare](#部署到-cloudflare)
- [常用命令速查](#常用命令速查)

---

## 这个项目是什么？

VC Radar 是一个新闻聚合网站。它每小时自动爬取 5 个科技/VC 领域的网站，把文章存到数据库，然后通过一个网页展示给用户。

追踪的 5 个信息源：

| 信源 | 网站 | 爬取方式 |
|------|------|----------|
| **Paul Graham** | paulgraham.com | HTML 页面解析 |
| **Hacker News** | news.ycombinator.com | HTML 页面解析 |
| **Sam Altman** | blog.samaltman.com | HTML 页面解析 |
| **Fred Wilson** | avc.xyz | RSS 订阅 |
| **Benedict Evans** | ben-evans.com | RSS 订阅 |

用户可以：
- 按信源筛选文章
- 搜索文章标题
- 看到每个信源有多少篇文章
- 收到新文章的通知提醒（基于上次访问时间）

---

## 技术栈总览

| 层 | 技术 | 作用 |
|----|------|------|
| **框架** | vinext (Next.js on Vite) | 让我们用 Next.js 的写法（React 组件、API Routes），但底层用 Vite 打包，能部署到 Cloudflare |
| **前端** | React 19 | 页面交互（筛选、搜索、通知弹窗） |
| **运行环境** | Cloudflare Workers | 代码运行在 Cloudflare 的全球边缘节点上，而不是传统的服务器 |
| **数据库** | Cloudflare D1 (SQLite) | 存储爬取到的文章，D1 是 Cloudflare 托管的 SQLite 数据库 |
| **爬虫** | cheerio + rss-parser | cheerio 解析 HTML 页面，rss-parser 解析 RSS 订阅 |
| **定时任务** | Workers Cron Trigger | 每小时自动触发一次爬虫 |
| **构建工具** | Vite 7 + TypeScript | 代码打包和类型检查 |

---

## 架构图

```
用户浏览器
    |
    | 访问网站
    v
┌─────────────────────────────────────────────────────┐
│              Cloudflare Workers (边缘节点)             │
│                                                      │
│  ┌────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │   vinext    │  │ API Routes │  │ Cron Trigger  │  │
│  │   (SSR)     │  │            │  │ 每小时执行     │  │
│  │            │  │ GET /api/  │  │               │  │
│  │ 服务端渲染  │  │ articles   │  │  触发 5 个     │  │
│  │ 首页 HTML   │  │            │  │  爬虫并行爬取  │  │
│  └─────┬──────┘  └─────┬──────┘  └───────┬───────┘  │
│        │               │                 │           │
│        └───────────────┴─────────────────┘           │
│                        │                             │
│                 ┌──────┴──────┐                      │
│                 │     D1      │                      │
│                 │  (SQLite)   │                      │
│                 │  articles表  │                      │
│                 └─────────────┘                      │
└─────────────────────────────────────────────────────┘
```

简单来说：
1. **Cron Trigger** 每小时触发爬虫，爬取 5 个网站，把新文章存入 D1 数据库
2. **用户访问网站时**，vinext 在服务端从 D1 读取文章，渲染成完整 HTML 返回给浏览器
3. **浏览器拿到页面后**，React 接管交互（筛选、搜索、通知）

---

## 项目结构详解

```
vc-radar/
├── app/                    # 前端页面和 API（Next.js 约定）
│   ├── layout.tsx          # 根布局 —— 所有页面共享的 HTML 外壳
│   ├── page.tsx            # 首页 —— 服务端组件，从数据库读数据
│   ├── client-app.tsx      # 客户端交互组件 —— 筛选、搜索、通知
│   ├── globals.css         # 全局样式
│   └── api/
│       ├── articles/route.ts   # GET /api/articles 接口
│       └── refresh/route.ts    # POST /api/refresh 接口（手动触发爬虫）
├── lib/                    # 后端业务逻辑
│   ├── db.ts               # 数据库操作函数（查询、插入文章）
│   ├── env.ts              # 获取 Cloudflare 环境变量（数据库连接）
│   └── crawlers/           # 5 个爬虫 + 管理器
│       ├── base.ts         # 爬虫基类（通用的请求、重试、工具函数）
│       ├── types.ts        # 类型定义（CrawledArticle 接口）
│       ├── paul-graham.ts  # Paul Graham 爬虫
│       ├── hacker-news.ts  # Hacker News 爬虫
│       ├── sam-altman.ts   # Sam Altman 爬虫
│       ├── fred-wilson.ts  # Fred Wilson 爬虫（RSS）
│       ├── benedict-evans.ts   # Benedict Evans 爬虫（RSS）
│       ├── rss-crawler.ts  # RSS 爬虫基类（fred-wilson 和 benedict-evans 共用）
│       ├── crawler-manager.ts  # 爬虫管理器（并行调度、去重、写库）
│       └── index.ts        # 统一导出
├── worker/                 # Cloudflare Workers 入口
│   ├── index.ts            # HTTP 请求入口（vinext 自动生成）
│   └── scheduled.ts        # 定时任务入口（Cron 触发时执行）
├── migrations/             # 数据库迁移文件
│   └── 0001_init.sql       # 建表语句
├── scripts/                # 开发辅助脚本
│   └── seed.ts             # 从 data.json 生成 seed.sql（导入旧数据）
├── vite.config.ts          # Vite 构建配置
├── wrangler.jsonc          # Cloudflare Workers 配置（D1 绑定、Cron 计划）
├── tsconfig.json           # TypeScript 配置
└── package.json            # 依赖和脚本命令
```

---

### app/ — 前端页面和 API

这是 Next.js 的 App Router 约定。文件夹结构直接决定了 URL 路由。

#### `app/layout.tsx` — 根布局

这是所有页面共享的 HTML "外壳"。它定义了：
- `<html lang="zh-CN">` —— 告诉浏览器页面是中文
- Google Fonts 字体加载（Bricolage Grotesque 和 JetBrains Mono）
- 引入全局样式 `globals.css`
- `metadata` 对象定义了页面标题和描述（显示在浏览器标签页和搜索引擎中）

每个页面的内容通过 `{children}` 插入到 `<body>` 中。

#### `app/page.tsx` — 首页（服务端组件）

这是网站的首页。它是一个 **服务端组件（Server Component）**，意味着它的代码只在服务器上运行，不会发送到浏览器。

它做的事情：
1. 通过 `getEnv()` 获取数据库连接
2. 并行查询 4 种数据：文章列表、各源的文章数量、总数、最后爬取时间
3. 把这些数据作为 props 传给 `<ClientApp>` 组件

```
用户请求 → 服务端执行 page.tsx → 查询 D1 数据库 → 渲染 HTML → 返回给浏览器
```

#### `app/client-app.tsx` — 客户端交互组件

文件顶部的 `"use client"` 标记告诉框架：这个组件需要在浏览器里运行（因为它用了 useState、事件监听等浏览器 API）。

它负责所有用户交互：
- **来源筛选**：一个下拉菜单，选择某个信源后只显示该源的文章
- **标题搜索**：一个输入框，实时过滤文章标题
- **通知铃铛**：比对 localStorage 中上次看到的文章列表，找出新增的文章
- **欢迎弹窗**：首次访问时显示，关闭后记录到 localStorage 不再弹出
- **统计卡片**：显示各信源的文章数量

#### `app/api/articles/route.ts` — 文章查询 API

对应 URL: `GET /api/articles`

支持两个查询参数：
- `?source=Sam Altman` —— 按信源筛选
- `?q=AI` —— 按标题搜索

返回 JSON：
```json
{
  "articles": [...],
  "counts": { "Paul Graham": 25, "Hacker News": 30, ... },
  "total": 163,
  "lastCrawl": "2026-03-07T12:00:00.000Z"
}
```

#### `app/api/refresh/route.ts` — 手动触发爬虫 API

对应 URL: `POST /api/refresh`

调用后会立即运行所有 5 个爬虫，把新文章写入数据库，返回爬取结果。目前前端没有按钮调用此接口（已移除），但接口保留供调试使用。

---

### lib/ — 后端逻辑

#### `lib/env.ts` — 环境变量获取

Cloudflare Workers 的环境变量（比如数据库连接）不是通过 `process.env` 获取的，而是通过 `cloudflare:workers` 这个特殊模块。

这个文件封装了获取数据库连接的逻辑。整个项目中所有需要访问 D1 的地方都调用 `getEnv()` 来获取 `DB` 对象。

#### `lib/db.ts` — 数据库操作

包含 5 个函数，每个对应一个 SQL 查询：

| 函数 | 作用 | SQL |
|------|------|-----|
| `getArticles()` | 查询文章列表，支持筛选和搜索 | `SELECT * FROM articles WHERE ... ORDER BY publish_time DESC` |
| `getSourceCounts()` | 统计每个信源有多少文章 | `SELECT source, COUNT(*) ... GROUP BY source` |
| `getTotalCount()` | 查询文章总数 | `SELECT COUNT(*) FROM articles` |
| `getLatestCrawlTime()` | 查最后一次爬取的时间 | `SELECT crawl_time ... ORDER BY crawl_time DESC LIMIT 1` |
| `insertArticles()` | 插入新文章（跳过重复） | `INSERT OR IGNORE INTO articles ...` |

`INSERT OR IGNORE` 的意思是：如果 `unique_id` 已经存在（重复文章），就跳过不插入，不会报错。

#### `lib/crawlers/` — 爬虫系统

**`base.ts` — 爬虫基类**

所有爬虫共用的基础设施：
- `BaseCrawler`：抽象类，定义了 `crawl()` 方法的接口，以及 `makeArticle()` 辅助方法来构造标准格式的文章对象
- `fetchWithRetry()`：带重试的 HTTP 请求（失败自动重试 3 次，每次间隔加倍）
- `generateUniqueId()`：根据标题+URL+来源生成唯一 hash，用于去重
- `parseRelativeTime()`：把 "3 hours ago" 这种相对时间转成绝对时间

**`paul-graham.ts` / `hacker-news.ts` / `sam-altman.ts` — HTML 爬虫**

用 `cheerio`（一个服务端的 jQuery）解析 HTML 页面，从中提取文章标题、链接、时间。

每个爬虫继承 `BaseCrawler`，实现自己的 `crawl()` 方法。逻辑大致是：
1. `fetchWithRetry()` 请求目标网站
2. `cheerio.load(html)` 解析 HTML
3. 用 CSS 选择器找到文章列表元素
4. 遍历提取标题、URL、时间
5. 调用 `makeArticle()` 构造标准格式

**`rss-crawler.ts` / `fred-wilson.ts` / `benedict-evans.ts` — RSS 爬虫**

Fred Wilson 和 Benedict Evans 的网站提供 RSS 订阅源。RSS 是一种标准的 XML 格式，用 `rss-parser` 库可以直接解析成结构化数据，不需要手动解析 HTML。

**`crawler-manager.ts` — 爬虫管理器**

核心调度逻辑：
1. `crawlAll()`：用 `Promise.allSettled()` 并行运行所有 5 个爬虫（某个爬虫失败不影响其他的）
2. 去重：用 `titleCache`（一个 Set）过滤掉标题相同的文章
3. `crawlAndStore()`：先调 `crawlAll()` 爬取，再调 `insertArticles()` 写库

---

### worker/ — Cloudflare Workers 入口

#### `worker/index.ts` — HTTP 入口

由 `vinext deploy` 自动生成。它是 Cloudflare Workers 的主入口文件。

每当有 HTTP 请求到达时，Workers 会调用这个文件的 `fetch()` 函数。它做两件事：
1. 如果是图片优化请求（`/_vinext/image`），走 Cloudflare Images 处理
2. 其他所有请求（页面、API）都交给 vinext 框架处理

你通常不需要修改这个文件。

#### `worker/scheduled.ts` — 定时任务入口

Cron Trigger 触发时执行的代码。逻辑很简单：
1. 获取数据库连接
2. 调用 `crawlAndStore()` 运行所有爬虫
3. 打印日志（在 Cloudflare Dashboard 的 Logs 中可以看到）

`ctx.waitUntil()` 的作用是告诉 Workers：即使已经返回了响应，也要等这个异步操作执行完才能销毁运行环境。

---

### migrations/ — 数据库迁移

#### `0001_init.sql` — 建表

```sql
CREATE TABLE IF NOT EXISTS articles (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  unique_id    TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  url          TEXT NOT NULL,
  source       TEXT NOT NULL,
  publish_time TEXT,
  summary      TEXT DEFAULT '',
  sector       TEXT DEFAULT '',
  crawl_time   TEXT NOT NULL,
  created_at   TEXT DEFAULT (datetime('now'))
);
```

字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | 自增整数 | 数据库自动分配的主键 |
| `unique_id` | 文本，唯一 | 由标题+URL+来源生成的 hash，用来防止插入重复文章 |
| `title` | 文本 | 文章标题 |
| `url` | 文本 | 文章链接 |
| `source` | 文本 | 来自哪个信源（如 "Paul Graham"） |
| `publish_time` | 文本 | 文章发布时间（ISO 格式） |
| `summary` | 文本 | 文章摘要 |
| `sector` | 文本 | 分类标签 |
| `crawl_time` | 文本 | 爬取时间 |
| `created_at` | 文本 | 插入数据库的时间（自动填充） |

还创建了 3 个**索引（Index）**，用来加速查询：
- `idx_source`：按信源查询时更快
- `idx_publish_time`：按时间排序时更快
- `idx_unique_id`：检查去重时更快

---

### scripts/ — 开发辅助脚本

#### `scripts/seed.ts` — 数据导入脚本

把旧版 Python 项目的 `data.json` 转换成 SQL INSERT 语句，写入 `migrations/seed.sql`。这样可以在本地开发时快速导入一批测试数据。

只在初始迁移时需要用一次，之后数据由爬虫自动更新。

---

### 配置文件

#### `wrangler.jsonc` — Cloudflare Workers 配置

```jsonc
{
  "name": "vc-radar",              // Workers 项目名，决定了部署后的 URL
  "main": "worker/index.ts",       // 入口文件
  "compatibility_date": "2026-03-01",  // Workers 运行时版本
  "compatibility_flags": ["nodejs_compat"],  // 启用 Node.js 兼容（cheerio 需要）
  "d1_databases": [{
    "binding": "DB",               // 代码中用 env.DB 访问
    "database_name": "vc-radar-db", // 数据库名称
    "database_id": "e20df195...",   // 线上数据库的 ID
    "migrations_dir": "migrations"  // 迁移文件目录
  }],
  "triggers": {
    "crons": ["0 * * * *"]         // Cron 表达式：每小时整点执行
  }
}
```

**Cron 表达式** `"0 * * * *"` 的含义：
```
 ┌───── 分钟 (0)
 │ ┌─── 小时 (*)  = 每小时
 │ │ ┌─ 日 (*)    = 每天
 │ │ │ ┌ 月 (*)   = 每月
 │ │ │ │ ┌ 星期 (*)= 不限
 0 * * * *
```
即：每小时的第 0 分钟执行一次。

#### `vite.config.ts` — Vite 构建配置

```ts
plugins: [
  vinext(),       // vinext 框架插件（处理 Next.js API、SSR、RSC）
  cloudflare()    // Cloudflare 插件（打包为 Workers 格式）
],
build: {
  rollupOptions: {
    external: ["cloudflare:workers"]  // 告诉打包器不要打包这个模块（运行时由 Workers 提供）
  }
}
```

#### `tsconfig.json` — TypeScript 配置

关键配置：
- `"types": ["@cloudflare/workers-types/experimental"]`：提供 `cloudflare:workers` 模块的类型定义
- `"paths": { "@/*": ["./*"] }`：让 `@/lib/db` 等路径能正确解析

#### `package.json` — 依赖和命令

核心依赖：
- `cheerio`：服务端 HTML 解析（类似 jQuery）
- `rss-parser`：RSS/Atom 订阅源解析
- `react` / `react-dom`：前端 UI
- `vinext`：Next.js on Vite 框架
- `wrangler`：Cloudflare 开发和部署工具

---

## 关键概念解释

### 什么是 vinext？

vinext 是 Cloudflare 开发的一个框架，让你可以用 **Next.js 的写法**（App Router、Server Components、API Routes）来写应用，但底层用 **Vite** 打包，并且可以直接部署到 **Cloudflare Workers**。

为什么不直接用 Next.js？因为 Next.js 默认部署到 Vercel，不支持 Cloudflare Workers。vinext 解决了这个兼容性问题。

### 什么是 Cloudflare Workers？

传统网站需要一台服务器来运行后端代码。Cloudflare Workers 是一种"无服务器"（Serverless）方案：
- 你的代码被分发到 Cloudflare 全球 300+ 个数据中心
- 用户访问时，由离用户最近的节点执行代码
- 不需要管理服务器，按请求量计费
- 免费额度：每天 10 万次请求

### 什么是 D1？

D1 是 Cloudflare 提供的 **托管 SQLite 数据库**。

- **SQLite**：一种轻量级数据库，数据存在一个文件里（不像 MySQL/PostgreSQL 需要运行一个数据库服务器）
- **托管**：Cloudflare 帮你管理这个数据库，你只需要写 SQL
- **本地开发时**：wrangler 工具会在你电脑上创建一个本地 SQLite 文件来模拟 D1
- **线上**：数据存储在 Cloudflare 的基础设施中

在代码中通过 `env.DB` 访问，用法就是写 SQL：
```ts
const { results } = await db.prepare("SELECT * FROM articles").all();
```

### 什么是 Migration（数据库迁移）？

数据库迁移是一种**版本控制数据库结构**的方式。

想象你在开发过程中需要修改数据库表结构（加字段、建新表、改索引等）。如果直接手动改数据库，会有问题：
- 开发环境改了，线上忘了改
- 团队其他人不知道你改了什么
- 无法回滚到之前的状态

所以我们把每次数据库结构变更写成一个 SQL 文件，按顺序编号：
```
migrations/
  0001_init.sql       ← 第一次：建表
  0002_add_tags.sql   ← 第二次：加字段（如果以后需要）
```

运行迁移时，工具会按顺序执行这些 SQL 文件，并记住哪些已经执行过了。

本项目目前只有一个迁移文件 `0001_init.sql`（建表），未来如果需要修改表结构，就添加新的编号文件。

**本地执行迁移**：
```bash
npm run db:migrate
# 实际运行: wrangler d1 execute vc-radar-db --local --file=migrations/0001_init.sql
```

**线上执行迁移**：
```bash
wrangler d1 migrations apply vc-radar-db --remote
```

### 什么是 Cron Trigger？

Cron 是 Unix 系统中用来设置定时任务的工具。Cloudflare Workers 支持 Cron Trigger，即按照你设定的时间表自动触发 Worker 执行。

本项目中，Cron Trigger 每小时整点触发 `worker/scheduled.ts` 中的代码，执行一次完整的 5 源爬取并写入数据库。

你可以在 Cloudflare Dashboard > Workers > vc-radar > Triggers 中看到 Cron 配置和执行日志。

### SSR 和 CSR 的区别

| | SSR (Server-Side Rendering) | CSR (Client-Side Rendering) |
|--|---|---|
| **代码运行在** | 服务器 | 浏览器 |
| **用户看到内容的速度** | 快（HTML 已经包含内容） | 慢（先下载 JS，再请求数据，再渲染） |
| **对搜索引擎** | 友好（爬虫能直接看到内容） | 不友好 |

本项目两者都用：
- `page.tsx` 是 **SSR**：在服务端查询数据库，渲染成完整 HTML
- `client-app.tsx` 是 **CSR**：在浏览器里处理筛选、搜索、通知等交互

这就是 React Server Components 的工作方式：服务端组件负责数据获取，客户端组件负责交互。

---

## 数据流：一篇文章从爬取到显示的完整路径

以一篇 Paul Graham 的新文章为例：

```
1. [Cron Trigger]  每小时整点触发
       |
2. [scheduled.ts]  调用 crawlAndStore()
       |
3. [crawler-manager.ts]  并行启动 5 个爬虫
       |
4. [paul-graham.ts]  请求 paulgraham.com/articles.html
       |                 用 cheerio 解析 HTML
       |                 提取标题、链接、时间
       |                 生成 unique_id（hash 去重标识）
       |
5. [crawler-manager.ts]  收集所有爬虫结果，按标题去重
       |
6. [db.ts - insertArticles()]  INSERT OR IGNORE 写入 D1
       |                        如果 unique_id 已存在则跳过
       |
7. [用户访问网站]
       |
8. [page.tsx]  SELECT * FROM articles ORDER BY publish_time DESC
       |
9. [client-app.tsx]  渲染文章表格，显示统计卡片
       |
10. [浏览器]  用户看到最新文章列表
```

---

## 本地开发指南

### 前置条件

- Node.js 18+
- npm

### 首次设置

```bash
# 1. 安装依赖
npm install

# 2. 建立本地数据库（创建 articles 表）
npm run db:migrate

# 3.（可选）导入测试数据
#    先确保 data/ 目录下有 data.json（旧版数据）
npm run db:seed:gen    # 从 data.json 生成 seed.sql
npm run db:seed        # 把 seed.sql 导入本地 D1
```

### 启动开发服务器

> **注意**：当前 `vite.config.ts` 包含 Cloudflare 插件（用于生产部署），本地开发时需要临时修改两个文件。

编辑 `vite.config.ts`，改成：
```ts
import vinext from "vinext";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vinext()],
});
```

编辑 `lib/env.ts`，改成使用本地数据库：
```ts
import type { D1Database } from "@cloudflare/workers-types";

interface AppEnv { DB: D1Database; }

export async function getEnv(): Promise<AppEnv> {
  const { getPlatformProxy } = await import("wrangler");
  const proxy = await getPlatformProxy<AppEnv>();
  return proxy.env;
}
```

然后启动：
```bash
npx vinext dev --port 3001
```

打开 http://localhost:3001 即可看到网站。

> **重要**：提交代码或部署前记得把这两个文件改回生产版本。

### 运行测试

```bash
npm test
```

测试文件在 `lib/crawlers/__tests__/` 目录下。

### 本地数据库在哪？

wrangler 在项目根目录创建一个 `.wrangler/` 文件夹，本地 D1 数据库的 SQLite 文件就在里面。

你可以直接用 wrangler 查询本地数据库：
```bash
wrangler d1 execute vc-radar-db --local --command "SELECT COUNT(*) FROM articles"
```

---

## 部署到 Cloudflare

### 前置条件

1. 一个 Cloudflare 账号
2. 登录 wrangler：`wrangler login`（会打开浏览器进行 OAuth 认证）

### 首次部署

```bash
# 1. 创建线上 D1 数据库（只需一次）
wrangler d1 create vc-radar-db
# 记下返回的 database_id，填入 wrangler.jsonc

# 2. 在线上数据库建表
wrangler d1 migrations apply vc-radar-db --remote

# 3. 构建并部署
npx vinext deploy
```

部署后会得到一个 URL，如 `https://vc-radar.xxx.workers.dev`。

### 后续更新

改完代码后，只需：
```bash
npx vinext deploy
```

vinext 会自动完成：构建 → 打包 → 上传到 Cloudflare Workers。

### 查看线上日志

```bash
wrangler tail
```

这会实时显示 Worker 的日志输出，包括 Cron Trigger 的执行日志。

---

## 常用命令速查

| 命令 | 作用 |
|------|------|
| `npx vinext dev --port 3001` | 启动本地开发服务器 |
| `npx vinext deploy` | 构建并部署到 Cloudflare |
| `npm run db:migrate` | 在本地 D1 执行建表迁移 |
| `npm run db:seed:gen` | 从 data.json 生成 seed.sql |
| `npm run db:seed` | 导入 seed.sql 到本地 D1 |
| `npm test` | 运行测试 |
| `wrangler d1 execute vc-radar-db --local --command "SQL"` | 在本地数据库执行 SQL |
| `wrangler d1 migrations apply vc-radar-db --remote` | 在线上数据库执行迁移 |
| `wrangler tail` | 查看线上实时日志 |
| `wrangler login` | 登录 Cloudflare（首次部署前） |

---

Product By Chen Zihui

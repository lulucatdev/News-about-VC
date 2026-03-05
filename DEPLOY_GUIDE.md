# 🚀 GitHub Pages 部署指南

将你的VC追踪器部署到GitHub Pages，实现自动抓取和展示！

---

## 📋 前置要求

1. ✅ GitHub账号
2. ✅ 已创建名为 `News-about-VC` 的GitHub仓库
3. ✅ 本地代码已准备好

---

## 🎯 部署架构

```
GitHub Actions (定时抓取)
        ↓
运行Python爬虫 → 生成 data.json
        ↓
部署到GitHub Pages
        ↓
静态网页展示 (JavaScript读取JSON)
```

**优点**：
- ✅ 完全免费
- ✅ 每天自动更新2次
- ✅ 无需维护服务器
- ✅ 全球CDN加速

---

## 📝 步骤1：创建GitHub仓库

### 1.1 在GitHub创建仓库

访问 https://github.com/new

```
Repository name: News-about-VC
Description: VC投资热度追踪器 - 自动抓取创业投资资讯
Public/Private: Public (GitHub Pages需要Public或Pro账号)
Initialize: 不要勾选任何选项
```

### 1.2 本地初始化Git

```bash
# 进入项目目录
cd "News-about-VC"

# 初始化Git仓库
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: VC Tracker with GitHub Pages support"

# 关联远程仓库 (替换为你的用户名)
git remote add origin https://github.com/YOUR_USERNAME/News-about-VC.git

# 推送
git branch -M main
git push -u origin main
```

---

## ⚙️ 步骤2：配置GitHub Pages

### 2.1 启用GitHub Pages

1. 打开GitHub仓库页面
2. 点击 **Settings** → **Pages** (左侧菜单)
3. **Source** 选择 **GitHub Actions**
4. 保存

### 2.2 配置工作流权限

1. 进入 **Settings** → **Actions** → **General**
2. 找到 **Workflow permissions**
3. 选择 **Read and write permissions**
4. 勾选 **Allow GitHub Actions to create and approve pull requests**
5. 保存

---

## 🚀 步骤3：验证部署

### 3.1 手动触发第一次运行

1. 进入GitHub仓库
2. 点击 **Actions** 标签
3. 选择 **VC Tracker Deploy** 工作流
4. 点击 **Run workflow** → 再点击 **Run workflow**
5. 等待运行完成（约2-3分钟）

### 3.2 查看部署结果

1. 工作流运行完成后，点击 **Settings** → **Pages**
2. 查看 **Your site is live at** 后面的URL
3. 通常格式为：`https://yourusername.github.io/News-about-VC/`

### 3.3 访问网站

在浏览器中打开你的GitHub Pages URL，应该能看到VC追踪器网页！

---

## 🔧 配置说明

### 自动更新频率

编辑 `.github/workflows/deploy.yml`：

```yaml
on:
  schedule:
    # 每天UTC 02:00和14:00运行（北京时间10:00和22:00）
    - cron: '0 2,14 * * *'
```

**Cron格式说明**：
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── 星期 (0-7, 0和7都是周日)
│ │ │ └───── 月份 (1-12)
│ │ └─────── 日期 (1-31)
│ └───────── 小时 (0-23)
└─────────── 分钟 (0-59)
```

**常见配置**：
- `'0 */6 * * *'` - 每6小时
- `'0 0 * * *'` - 每天UTC午夜
- `'0 8,20 * * *'` - 每天UTC 8:00和20:00

### 抓取数量配置

在GitHub Actions页面手动运行时，可以设置：
- `max_items`: 每站点抓取数量（默认30）

---

## 📁 文件说明

### 部署相关文件

```
News-about-VC/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions工作流
├── static/
│   ├── index.html              # GitHub Pages静态网页
│   └── data.json               # 抓取的数据（自动生成）
├── data/
│   └── multi_source_news.json  # 数据备份
└── ...
```

### 工作原理

1. **GitHub Actions** 每天定时运行
2. **Python爬虫** 抓取4个数据源
3. **生成 data.json** 保存到static目录
4. **部署到Pages** 自动发布网站
5. **JavaScript** 读取JSON展示数据

---

## 🎨 自定义配置

### 修改网页标题

编辑 `static/index.html`：

```html
<title>你的自定义标题</title>
```

### 修改GitHub链接

在 `static/index.html` 中搜索：

```html
<a href="https://github.com/yourusername/News-about-VC" ...>
```

替换为你的实际仓库地址。

### 添加Google Analytics

在 `static/index.html` 的 `<head>` 中添加：

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

---

## 🔍 故障排除

### 问题1：Actions运行失败

**检查**：
```bash
# 在GitHub仓库 → Actions → 点击失败的工作流
# 查看详细日志
```

**常见原因**：
- Python依赖安装失败 → 检查 `requirements.txt`
- 爬虫超时 → 增加超时时间
- 权限不足 → 检查Workflow权限设置

### 问题2：网页显示404

**解决**：
1. 确认Actions已成功运行
2. 检查 `Settings` → `Pages` 中的Source是否为GitHub Actions
3. 等待1-2分钟后刷新

### 问题3：数据未更新

**检查**：
1. 进入Actions页面查看最近运行记录
2. 检查是否有新的commit推送到main分支
3. 手动触发一次Actions运行

### 问题4：样式显示异常

**解决**：
- 清除浏览器缓存
- 按 `Ctrl+Shift+R` 强制刷新
- 检查浏览器控制台是否有JS错误

---

## 📊 监控和维护

### 查看运行状态

1. **GitHub仓库** → **Actions** 标签
2. 绿色✓表示成功，红色✗表示失败
3. 点击可查看详细日志

### 设置邮件通知

1. GitHub账号设置 → Notifications
2. 开启 **Actions** 通知
3. 选择邮件或Web通知

### 手动更新

如果急需最新数据：

1. 进入GitHub仓库
2. Actions → VC Tracker Deploy
3. Run workflow → 运行

---

## 🌟 高级功能

### 添加自定义域名（可选）

1. 在你的域名DNS提供商添加CNAME记录：
   ```
   CNAME vc.yourdomain.com → yourusername.github.io
   ```

2. 在GitHub仓库创建 `static/CNAME` 文件：
   ```
   vc.yourdomain.com
   ```

3. 在Pages设置中添加自定义域名

### 启用HTTPS

GitHub Pages自动支持HTTPS，无需配置。

---

## 💰 成本分析

| 项目 | 费用 | 说明 |
|------|------|------|
| GitHub仓库 | 免费 | 公开仓库无限制 |
| GitHub Actions | 免费 | 每月2000分钟额度 |
| GitHub Pages | 免费 | 1GB存储，100GB流量/月 |
| 自定义域名 | ~¥50/年 | 可选，根据域名商定价 |

**总计：完全免费！** 🎉

---

## 📝 更新日志

部署后，每次数据更新会自动提交：

```
Git commit history:
├── Update data 2024-01-15 10:00
├── Update data 2024-01-15 22:00
├── Update data 2024-01-16 10:00
└── ...
```

---

## 🎉 完成！

现在你的VC追踪器已经部署到GitHub Pages：

- 🌐 **访问地址**: `https://yourusername.github.io/News-about-VC/`
- 🔄 **自动更新**: 每天2次
- 📱 **响应式设计**: 支持手机和电脑
- ⚡ **全球CDN**: 快速访问

**下一步**：
1. 将你的网站分享给朋友
2. 收藏网址，每天查看最新VC资讯
3. 根据需要调整更新频率

祝你使用愉快！🚀

---

## 📞 需要帮助？

如果遇到问题：
1. 检查GitHub Actions日志
2. 查看 `DATA_SOURCE_LIMITS.md` 了解数据抓取限制
3. 确保所有文件已正确推送到GitHub
4. 在GitHub Issues中提问

---

## 🔗 相关文档

- `README.md` - 项目说明
- `WEB_GUIDE.md` - Web界面使用指南
- `DATA_SOURCE_LIMITS.md` - 数据源限制说明

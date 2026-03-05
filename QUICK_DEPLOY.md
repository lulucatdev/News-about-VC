# 🚀 5分钟完成部署指南

## 步骤1: 创建GitHub仓库（1分钟）

1. 访问 https://github.com/new
2. 填写:
   - **Repository name**: `News-about-VC`
   - **Description**: VC投资热度追踪器
   - **Public**: 勾选
   - **Initialize**: 不勾选任何选项
3. 点击 **Create repository**

## 步骤2: 上传代码（2分钟）

在终端中执行：

```bash
# 进入项目目录
cd "News about VC"

# 初始化Git
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"

# 关联远程仓库（替换YOUR_USERNAME为你的GitHub用户名）
git remote add origin https://github.com/YOUR_USERNAME/News-about-VC.git

# 推送代码
git branch -M main
git push -u origin main
```

## 步骤3: 启用GitHub Pages（1分钟）

### 详细操作：

**第1步：进入设置页面**
1. 打开你的GitHub仓库页面
2. 点击页面顶部的 **Settings** 标签（最右边）

**第2步：找到Pages设置**
1. 在左侧菜单中，向下滚动找到 **Pages**（在Code and automation部分）
2. 点击 **Pages**

**第3步：选择部署源**
1. 在 **Source** 部分，点击下拉菜单
2. 选择 **GitHub Actions**
3. 页面会自动保存（可能需要点击 Save 按钮）

**第4步：确认设置**
- 页面会显示："Your site is currently being built from the GitHub Actions workflow."
- 这表示设置成功！

## 步骤4: 配置权限（1分钟）

**重要：这个步骤必须做，否则Actions无法推送数据！**

### 详细操作：

**第1步：进入Actions设置**
1. 在仓库页面，点击 **Settings**
2. 在左侧菜单中，找到 **Actions**（在Security部分下面）
3. 展开 Actions，点击 **General**

**第2步：修改权限**
1. 向下滚动到 **Workflow permissions** 部分
2. 选择 **Read and write permissions**（第二个选项）
3. 勾选 **Allow GitHub Actions to create and approve pull requests**
4. 点击底部的 **Save** 按钮

### 检查权限设置：
设置完成后，页面应该显示：
- ✅ Read and write permissions
- ✅ Allow GitHub Actions to create and approve pull requests

## 步骤5: 运行工作流（自动）

### 详细操作步骤：

**第1步：进入Actions页面**
1. 打开你的GitHub仓库页面（例如：`https://github.com/YOUR_USERNAME/News-about-VC`）
2. 点击页面顶部的 **Actions** 标签（位于Code、Issues、Pull requests旁边）

**第2步：选择工作流**
1. 在左侧边栏中，找到并点击 **VC Tracker Deploy**
2. 这时会显示工作流的运行历史（如果是第一次，可能是空的）

**第3步：手动触发运行**
1. 在右侧会看到一个 **Run workflow** 按钮（蓝色按钮）
2. 点击 **Run workflow** 按钮
3. 会弹出一个下拉菜单，显示：
   - Branch: main ✓
   - 其他选项（如果有）
4. 再次点击绿色的 **Run workflow** 按钮

**第4步：查看运行状态**
1. 页面会自动刷新，显示一个新的运行记录
2. 你会看到：
   - 🟡 黄色圆点 = 正在运行
   - 🟢 绿色✓ = 成功
   - 🔴 红色✗ = 失败
3. 等待2-3分钟，直到显示绿色✓

**第5步：查看详细日志（可选）**
1. 点击正在运行的任务
2. 可以看到详细的执行步骤：
   - Checkout（检出代码）
   - Setup Python（安装Python）
   - Install dependencies（安装依赖）
   - Run crawler（运行爬虫）
   - Commit data（提交数据）
   - Deploy to Pages（部署到Pages）

### 截图示意：
```
GitHub仓库页面
├── Code
├── Issues  
├── Pull requests
└── Actions ← 点击这里
    
    左侧边栏                右侧内容
    ├── VC Tracker Deploy ← 点击这里
    │   └── Run history
    └── 其他工作流
    
    [Run workflow] 按钮 ← 点击这里
    
    下拉菜单：
    ┌─────────────────┐
    │ Branch: main    │
    │ [Run workflow]  │ ← 再点击这里
    └─────────────────┘
```

## ✅ 完成！

### 如何判断部署成功？

**成功标志：**
1. ✅ Actions页面显示绿色✓（所有步骤都成功）
2. ✅ Settings → Pages 显示 "Your site is live at https://..."
3. ✅ 能正常打开网站并看到数据

### 访问你的网站：

```
https://YOUR_USERNAME.github.io/News-about-VC/
```

（将YOUR_USERNAME替换为你的GitHub用户名）

**例如：** 如果你的GitHub用户名是 `john`，则访问：
```
https://john.github.io/News-about-VC/
```

---

## 🔄 自动更新

网站会自动每天更新2次（北京时间10:00和22:00），无需手动操作。

## 📱 查看数据

- 网站首页会显示抓取的新闻列表
- 支持按来源筛选和搜索
- 点击标题可跳转到原文

## ⚠️ 注意事项

1. **第一次访问可能需要1-2分钟加载**
2. **Product Hunt和IT桔子可能显示提示信息**（技术限制）
3. **如果显示404，请等待2分钟后刷新**

## 🆘 常见问题

### Q1: 找不到 "Run workflow" 按钮？

**可能原因1：权限未开启**
- 先完成 **步骤4：配置权限**
- 刷新页面后重试

**可能原因2：代码还未推送到GitHub**
- 确保步骤2的 `git push` 成功执行
- 在GitHub仓库页面上能看到 `.github/workflows/deploy.yml` 文件

**可能原因3：Actions未启用**
- 进入 Settings → Actions → General
- 确认 **Actions permissions** 设置为 **Allow all actions and reusable workflows**

### Q2: Actions运行失败？

**检查步骤：**
1. 点击失败的任务（红色✗）
2. 查看哪个步骤出错
3. 常见错误：
   - **Install dependencies 失败** → 检查 requirements.txt 是否存在
   - **Run crawler 失败** → 可能是网络问题，重试即可
   - **Commit data 失败** → 检查权限设置（步骤4）

### Q3: 网站显示404？

**解决步骤：**
1. 确认Actions已成功运行（绿色✓）
2. 进入 Settings → Pages，确认显示 "Your site is live at https://..."
3. 等待2-5分钟后刷新
4. 如果还是404，手动触发一次Actions运行

### Q4: 网页样式错乱？

**解决方法：**
- 清除浏览器缓存
- 按 `Ctrl+Shift+R` (Windows) 或 `Cmd+Shift+R` (Mac) 强制刷新
- 检查浏览器控制台是否有错误（按F12 → Console）

### 推送失败
```bash
# 如果提示权限错误，使用SSH方式
git remote set-url origin git@github.com:YOUR_USERNAME/News-about-VC.git
```

### Actions运行失败
1. 检查GitHub仓库中是否有 `.github/workflows/deploy.yml` 文件
2. 确认 `requirements.txt` 存在且内容正确
3. 查看Actions日志获取详细错误信息

### 网页404错误
1. 确认Actions已成功运行（绿色✓）
2. 确认Pages设置中Source为GitHub Actions
3. 等待1-2分钟后刷新页面

---

## 📋 完整流程回顾

```
开始部署
    │
    ├─→ 步骤1: 在GitHub创建仓库
    │   └─→ 访问 github.com/new
    │   └─→ 填写仓库名 News-about-VC
    │
    ├─→ 步骤2: 上传代码
    │   └─→ git push 到GitHub
    │
    ├─→ 步骤3: 启用GitHub Pages
    │   └─→ Settings → Pages
    │   └─→ Source 选择 GitHub Actions
    │
    ├─→ 步骤4: 配置权限（重要！）
    │   └─→ Settings → Actions → General
    │   └─→ 选择 "Read and write permissions"
    │
    └─→ 步骤5: 运行工作流
        ├─→ 点击 Actions 标签
        ├─→ 点击 VC Tracker Deploy
        ├─→ 点击 Run workflow
        └─→ 等待绿色✓

部署完成！
    │
    └─→ 访问 https://YOUR_USERNAME.github.io/News-about-VC/
```

**恭喜！你的VC追踪器已经成功部署到GitHub Pages！** 🎉

# 🔧 GitHub Actions 错误排查指南

## 错误：crawl Process completed with exit code 1

这个错误表示爬虫任务执行失败。以下是常见原因和解决方案：

---

## 🔍 如何查看详细错误信息

### 步骤1：查看Actions日志
1. 打开GitHub仓库 → Actions 标签
2. 点击失败的运行记录（红色✗）
3. 点击 **crawl** 任务展开
4. 查看每个步骤的输出，找到红色的错误信息

### 步骤2：常见错误位置
```
crawl 任务步骤：
├── ✅ Checkout  （通常是成功的）
├── ✅ Setup Python  （通常是成功的）
├── 🟡 Install dependencies  ← 可能在这里失败
├── 🔴 Run crawler  ← 或在这里失败
└── ⏳ Commit data
```

---

## ❌ 常见错误及解决方案

### 错误1：Install dependencies 失败

**症状：**
```
ERROR: Could not find a version that satisfies the requirement xxx
或
pip: command not found
```

**原因：**
- requirements.txt 文件不存在或格式错误
- 某些包在GitHub Actions环境中安装失败

**解决：**
1. 检查 requirements.txt 是否存在：
   ```bash
   ls -la "News-about-VC/requirements.txt"
   ```

2. 检查 requirements.txt 内容：
   ```
   requests>=2.28.0
   beautifulsoup4>=4.11.0
   lxml>=4.9.0
   ```

3. 确保没有系统特定的包（如 pywin32）

---

### 错误2：ModuleNotFoundError（模块未找到）

**症状：**
```
ModuleNotFoundError: No module named 'vc_tracker'
或
ModuleNotFoundError: No module named 'bs4'
```

**原因：**
- Python路径设置错误
- 依赖包未正确安装

**解决：**

修改 `.github/workflows/deploy.yml` 中的 Install dependencies 步骤：

```yaml
- name: Install dependencies
  run: |
    cd "News-about-VC"
    pip install --upgrade pip
    pip install requests beautifulsoup4 lxml
    pip install -e .  # 如果项目有setup.py
```

或者在 Run crawler 步骤中添加 PYTHONPATH：

```yaml
- name: Run crawler
  run: |
    cd "News-about-VC"
    PYTHONPATH="${PYTHONPATH}:$(pwd)" python -c "
import sys
sys.path.insert(0, '.')
from vc_tracker.multi_crawler import MultiCrawler
# ... 其他代码
"
```

---

### 错误3：爬虫运行超时或网络错误

**症状：**
```
TimeoutError: [Errno 110] Connection timed out
或
requests.exceptions.ConnectionError
```

**原因：**
- GitHub Actions服务器在国外，访问国内网站（如IT桔子）可能超时
- 某些网站屏蔽了GitHub Actions的IP

**解决：**

#### 方案A：增加超时时间和重试（已在代码中实现）
代码中已经设置了3次重试，但如果仍然失败：

修改 `multi_crawler.py` 中的 `_make_request` 方法：
```python
def _make_request(self, url: str, retries: int = 0, timeout: int = 30) -> Optional[requests.Response]:
    # 增加超时时间到60秒
    try:
        self._random_delay()
        response = self.session.get(url, timeout=60, allow_redirects=True)  # 改为60秒
        response.raise_for_status()
        return response
    except requests.RequestException as e:
        if retries < 3:
            logger.warning(f"[{self.source_name}] 请求失败，正在重试 ({retries + 1}/3): {url}")
            time.sleep(5)  # 增加等待时间
            return self._make_request(url, retries + 1)
```

#### 方案B：减少抓取数量
修改 deploy.yml：
```yaml
- name: Run crawler
  run: |
    cd "News-about-VC"
    python -c "
# ...
mc.crawl_all(max_items_per_site=10)  # 从30改为10，减少请求次数
# ...
"
```

#### 方案C：只抓取可靠的数据源
修改爬虫代码，跳过容易失败的源：
```python
# 在 multi_crawler.py 的 crawl_all 方法中
for source, crawler in self.crawlers.items():
    if source in ['itjuzi', 'producthunt']:  # 跳过这些源
        logger.info(f"[{source}] 跳过（GitHub Actions环境）")
        continue
    # ... 其他代码
```

---

### 错误4：FileNotFoundError（文件未找到）

**症状：**
```
FileNotFoundError: [Errno 2] No such file or directory: 'data/multi_source_news.json'
或
No such file or directory: 'static'
```

**原因：**
- 目录不存在
- 路径错误

**解决：**

确保目录存在，修改 deploy.yml：
```yaml
- name: Run crawler
  run: |
    cd "News-about-VC"
    mkdir -p data static  # 创建目录
    python -c "
# ... 爬虫代码
"
```

---

### 错误5：Commit data 失败

**症状：**
```
error: pathspec 'News-about-VC/data/' did not match any files
或
Permission denied
```

**原因：**
- 数据目录路径错误
- Git权限不足

**解决：**

1. 检查路径：
```yaml
- name: Commit data
  run: |
    git config user.email "action@github.com"
    git config user.name "GitHub Action"
    # 使用相对路径
    git add "data/" "static/"
    git commit -m "Update data" || echo "No changes"
    git push || echo "No push"
```

2. 确保权限已开启（步骤4）：
   - Settings → Actions → General
   - Workflow permissions: Read and write permissions

---

## 🛠️ 调试技巧

### 方法1：本地测试
在本地先测试是否能正常运行：

```bash
cd "News-about-VC"
python -c "
import sys
sys.path.insert(0, '.')
from vc_tracker.multi_crawler import MultiCrawler
mc = MultiCrawler()
mc.crawl_all(max_items_per_site=5)
print(f'成功抓取 {len(mc.data)} 条数据')
"
```

如果本地能运行但GitHub Actions不行，说明是环境问题。

### 方法2：添加调试输出
修改 deploy.yml，在失败时显示更多信息：

```yaml
- name: Run crawler
  run: |
    cd "News-about-VC"
    python -c "
import sys
import traceback
sys.path.insert(0, '.')

try:
    from vc_tracker.multi_crawler import MultiCrawler
    mc = MultiCrawler()
    mc.crawl_all(max_items_per_site=30)
    mc.save_data()
    import os, shutil
    os.makedirs('static', exist_ok=True)
    shutil.copy('data/multi_source_news.json', 'static/data.json')
    print(f'成功：{len(mc.data)} 条数据')
except Exception as e:
    print(f'错误：{e}')
    traceback.print_exc()
    sys.exit(1)
"
```

### 方法3：分步执行
将一个大步骤拆分成多个小步骤，方便定位问题：

```yaml
- name: Test import
  run: |
    cd "News-about-VC"
    python -c "from vc_tracker.multi_crawler import MultiCrawler; print('导入成功')"

- name: Run crawler
  run: |
    cd "News-about-VC"
    python -c "
from vc_tracker.multi_crawler import MultiCrawler
mc = MultiCrawler()
mc.crawl_all(max_items_per_site=30)
mc.save_data()
"

- name: Copy to static
  run: |
    cd "News-about-VC"
    mkdir -p static
    cp data/multi_source_news.json static/data.json
```

---

## ✅ 推荐的最简配置

如果一直报错，使用这个最简化的 deploy.yml：

```yaml
name: VC Tracker Deploy

on:
  workflow_dispatch:  # 只保留手动触发

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install deps
        run: |
          pip install requests beautifulsoup4 lxml
      
      - name: Crawl
        run: |
          cd "News-about-VC"
          mkdir -p data static
          python -c "
import sys
sys.path.insert(0, '.')
from vc_tracker.multi_crawler import MultiCrawler
mc = MultiCrawler()
# 只抓取可靠的源
mc.crawl_selected(['hackernews', 'paulgraham'], max_items_per_site=20)
mc.save_data()
import shutil
shutil.copy('data/multi_source_news.json', 'static/data.json')
print('Done:', len(mc.data))
"
      
      - name: Commit
        run: |
          git config user.email "action@github.com"
          git config user.name "GitHub Action"
          git add "News-about-VC/data/" "News-about-VC/static/"
          git commit -m "Update" || echo "No changes"
          git push || echo "No push"

  deploy:
    needs: crawl
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - run: |
          mkdir -p docs
          cp "News-about-VC/static/index.html" docs/
          cp "News-about-VC/static/data.json" docs/ || echo '{"data":[]}' > docs/data.json
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## 🆘 如果还是不行

请提供以下信息：
1. 完整的错误日志（点击Actions中的失败任务，复制红色错误信息）
2. 你的GitHub仓库链接
3. 截图显示哪个步骤失败

这样我可以帮你更精确地定位问题！

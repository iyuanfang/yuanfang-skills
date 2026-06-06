---
name: yuanfang-html-image
description: |
  HTML方案生成社交媒体配图。给定文字或URL，自动提取内容，选择模板风格，生成全平台多尺寸精美图片（小红书3:4、朋友圈1:1、微博16:9、公众号封面2.35:1、OG卡片1.9:1）。
  相比AI生图，HTML方案100%可控：文字精确、像素级布局、零API成本、可批量。
当用户提到"配图"、"图片"、"封面"、"海报"、"发小红书"、"发朋友圈"、"多平台配图"时考虑使用此技能。
---

# yuanfang-html-image — HTML方案社交媒体配图生成

## 依赖

本 skill 依赖同仓库 `yuanfang-design/` 共享设计库：
- `../yuanfang-design/base.css` — token CSS 变量
- `../yuanfang-design/themes/*.css` — 12 个主题
- `../yuanfang-design/layout-types/cover.html` — 布局块

如需独立部署，需复制整个 `yuanfang-skills/` 仓库。

---

## 询问用户 (Step 0 — 任何 agent 必读)

执行任何渲染之前, **agent 必须先向用户确认关键信息**. 不要替用户猜 — 猜错了浪费算力, 还得出图返工.

### 必填 3 项 (内容)

1. **标题** — 主标题
2. **正文** — 一句话, 30-80 字
3. **3 个要点** — bullet 列表, 每条 ≤12 字

### 选填 3 项 (样式, 主动问)

4. **主题** — 从 12 个主题中选 1 个
   - 默认推荐: `minimal-white` (干净白底, 通用百搭)
   - 内容情绪不明时, 主动给 2-3 个推荐 (按内容类型)
5. **平台** — 从 6+ 个尺寸中选 1-N 个 (允许多选)
   - 默认推荐: `xiaohongshu` 组 (覆盖小红书竖 + 方)
   - 用户说 "全平台" / "全选" → 选全部
6. **分类标签 (badge)** — 顶部小字
   - 默认: 不渲染
   - 常见: `FEATURED` / `TRENDING` / `ESSENTIAL` / `EXCLUSIVE` / `HOT` / `NEW`
   - 含义对照见 `references/badge-meanings.md` (后续补)

### 不主动问 (用户没提就不问)

- **品牌 (brand)** — 左下角 logo 文字
- **二维码 (qr)** — 中下角
- **来源 (source)** — 已从布局移除, 不再使用

### 询问方式 — 按 agent 能力自适应

| Agent 能力 | 询问方式 |
|---|---|
| ✅ 有原生 UI 工具 (OpenCode `question` / Claude Code `AskUserQuestion`) | 弹选项菜单, 用户点击/键盘选 |
| ⚠️ 无 UI 工具 (Codex / openclaw / 简陋 CLI agent) | 打印带编号的选项列表, 等用户从 stdin 输入编号 (1/2/3 或名称) |
| ❓ 不确定 | 默认按有 UI 做, 失败退回打印+读 stdin |

### 询问顺序 (避免一次问太多)

1. **第一轮** — 主题 + 平台 (一题 2 个并列问题, 用户一并答)
2. **第二轮** — 标题 + 正文 + 3 个要点 (开放式输入)
3. **第三轮** — 分类标签 + 品牌 + 二维码 (可选, 用户回 "不用" 即跳过)

最多 2-3 个问题一组, 等答完再问下一组. 一次问 5 个会吓跑用户.

### 内容类型 → 主题推荐 (agent 备查)

```
干货/教程 → minimal-white / data-infographic / list-ranking
重磅消息 → dark-gold / bold-poster / magazine-cover
深度分析 → editorial / eastern / magazine-cover
个人故事 → warm-handdrawn / minimal-white-editorial
科技资讯 → tech-modern / split-screen / minimal-white-editorial
```

---

## 新版 CLI

```bash
# 推荐用法
node scripts/render.js --theme minimal-white --layout cover --platforms all

# 自动选主题（基于内容关键词）
node scripts/render.js --auto-theme --title "AI 数据报告" --platforms xiaohongshu-v

# 列出可用主题
node scripts/render.js --list-themes

# 列出可用布局
node scripts/render.js --list-layouts

# 输出 HTML 不截图（调试）
node scripts/render.js --preview --theme dark-gold --platforms wechat-cover
```

## 旧版 CLI 兼容

`--template 1` 自动映射到 `--theme minimal-white --layout cover`。旧用法继续工作。

---

[原 SKILL.md 内容继续...]

## 核心理念

**HTML + Playwright 截图 = 稳定、可控、精美的社交图片。**

| 对比 | HTML方案 | AI生图 |
|------|---------|--------|
| 文字准确度 | 100% | 可能出错 |
| 布局控制 | 像素级 | AI自由发挥 |
| 多尺寸输出 | 一键生成全部 | 逐张生成 |
| API成本 | 零 | 每次消耗 |
| 迭代速度 | 改CSS即刻重出 | 需要重新生成 |

## 工作流速览

```
用户提供 文字/URL
    ↓
[Step 0] 询问用户 (主题 / 平台 / 标签 / 品牌 / 二维码)
  → 用 agent 自带的交互工具 (有 UI 则弹菜单, 无 UI 则打印+读 stdin)
  → 用户没主动提的可选项默认跳过
    ↓
[Step 0.5] 提取品牌 (可选, 仅在无现成 brand-spec 时)
  → scripts/extract-brand.js --url <site>
  → 生成 brand-spec.md
    ↓
Step 1: 提取内容 (标题/正文/要点)
  → 来源: Step 0 收集 / URL 抓取 / 文本输入
    ↓
Step 2: 选择模板 (主题已由 Step 0 决定, 此步仅做内容情绪校准)
    ↓
Step 3: 一键生成全平台尺寸 (5种比例 × 1种风格 = 5张图)
    ↓
Step 4: 预览确认 / 迭代优化
```

---

## Step 1: 提取内容

```bash
# URL 提取（项目根目录执行）
source .venv/bin/activate
python3 src/marketing/yuanfang-skills/yuanfang-html-image/scripts/extract.py "https://..." > content.json

# 纯文本提取
python3 src/marketing/yuanfang-skills/yuanfang-html-image/scripts/extract.py "标题\n正文内容\n- 要点1\n- 要点2" > content.json

# 从文件读取
python3 src/marketing/yuanfang-skills/yuanfang-html-image/scripts/extract.py --file article.md > content.json
```

输出格式：
```json
{
  "title": "主标题",
  "content": "正文描述",
  "source": "文章来源（可选）",
  "points": ["要点1", "要点2"]
}
```

提取后展示给用户确认，进入 Step 2。

---

## Step 2: 选择模板

根据内容情绪基调推荐3个模板，展示给用户确认：

### 完整模板库

| # | 名称 | 底色 | 主色 | 视觉特征 | 适合 |
|--:|------|------|------|---------|------|
| 01 | 品牌标准 | `#FFFFFF` | `#4F46E5` | 左侧内容+右侧 Indigo 装饰块，品牌色驱动 | 品牌通用、教程、干货 |
| 02 | 暗金大气 | #1A1A2E | #E2B714 | 对角分割+装饰圆，渐变金字，磨砂纹理 | 重磅消息、产品发布 |
| 03 | 编辑杂志 | #F5F0EB | #C0392B | 大引号+顶部分隔线，红色点缀 | 深度分析、访谈 |
| 04 | 温暖手绘 | #FDF6EC | #D97706 | 纸纹底+手绘下划线，胶带装饰，星星标记 | 个人故事、生活 |
| 05 | 现代科技 | #0F172A | #4FACFE | 终端点数+网格底，代码注释前缀，发光点缀 | AI/科技、数码 |
| 06 | 大字海报 | #000000 | #FF3355 | 对角大幅红色色块，超大字体 | 金句引爆、活动 |
| 07 | 数据信息 | #F8FAFC | #10B981 | 数据卡片+进度条，线图装饰 | 排行、报告、数据 |
| 08 | 东方意境 | #F7F3EE | #8D6E63 | 水墨晕染+竖排标题，印章/竹线装饰 | 文化、哲思、诗词 |
| 09 | 杂志封面 | #F5F0EB | #4F46E5 | 全出血版式，超大标题居中，右下角品牌标签 | 精品文章、封面故事 |
| 10 | 左右分割 | #FFFFFF | #4F46E5 | 左右双色背景，一侧品牌色一侧留白 | 对比/双语/产品展示 |
| 11 | 极简留白 | #FAFAFA | #4F46E5 | 超多留白，精致小字，瑞士风排版 | 高端品牌、艺术、设计 |
| 12 | 列表排行 | #FFFFFF | #4F46E5 | 编号列表，大号数字标记，底部品牌条 | 排行榜、Top 10、步骤流程 |

### 推荐逻辑

```
干货/教程 → 01极简 / 07数据 / 12排行
重磅消息 → 02暗金 / 06大字 / 09封面
深度分析 → 03杂志 / 08东方 / 09封面
个人故事 → 04手绘 / 11留白
科技资讯 → 05科技 / 10分割 / 11留白
```

---

## Step 3: 生成图片

```bash
# 从 content.json 生成
cd src/marketing/yuanfang-skills/yuanfang-html-image
node scripts/render.js \
  --file /path/to/content.json \
  --template 3 \
  --output ./my-images

# 或直接传参数
node scripts/render.js \
  --title "AI 如何改变内容创作" \
  --content "从写作到配图，AI 正在重新定义创意的边界。" \
  --points "效率提升 10x|零门槛创作|AI 不是替代而是增强" \
  --template 1 \
  --output ./output
```

### 输出（默认5种比例）

默认生成5种通用比例。通过 `--platforms` 可精确指定平台：

```bash
# 指定平台
node scripts/render.js --file content.json --template 1 --platforms xiaohongshu-v,moments,weibo

# 全部平台
node scripts/render.js --file content.json --template 1 --platforms all

# 自定义尺寸
node scripts/render.js --file content.json --template 1 --platforms custom:800x600

# 印刷尺寸（自动启用 __PRINT 缩放）
node scripts/render.js --file content.json --template 1 --platforms a4,a3
```

**可用平台 ID：** `xiaohongshu-v` (1080×1440), `xiaohongshu-s` (1080×1080), `wechat-cover` (900×383), `wechat-thumb` (300×300), `moments` (1080×1080), `weibo` (1080×608), `toutiao` (1080×500), `douyin-cover` (1080×1920), `bilibili-cover` (1920×1080), `twitter` (1200×675), `a4` (2480×3508, 300dpi), `a3` (3508×4960, 300dpi)

**平台分组：** `xiaohongshu` (含竖版 + 方版), `wechat` (含公众号头图 + 小图 + 朋友圈)

### 并行生成多个模板

```bash
cd src/marketing/yuanfang-skills/yuanfang-html-image
node scripts/render.js --file content.json --template 1 --output ./out/t1 &
node scripts/render.js --file content.json --template 5 --output ./out/t5 &
wait
```

---

## Step 4: 预览确认

检查项：
1. 文字内容完全正确？
2. 布局在不同比例下正常？（特别是竖向文字的08号）
3. 色彩和风格符合预期？
4. 视觉层次清晰？（大字 > 中字 > 小字）

---

## 模板设计说明

每个模板在 `templates/[编号]-[名称]/` 下有两个文件：

- `template.json` — 配色、字体、字号配置（含 `badge`、`seal`、`brand` 等可选字段）
- `template.html` — HTML 布局（使用 `{{TOKEN}}` 注入）

### 模板变量系统

渲染引擎支持以下变量注入：

| 变量 | 来源 | 说明 |
|------|------|------|
| `{{TITLE}}` | content.title | 主标题 |
| `{{CONTENT}}` | content.body/content | 正文（自动 `<br>` 换行） |
| `{{SOURCE}}` | content.source | 文章来源 |
| `{{POINTS_HTML}}` | content.points | 要点列表 (`<li>` 拼接) |
| `{{W}}` / `{{H}}` | 平台配置 | 输出图片宽高 |
| `{{BG}}` / `{{TEXT}}` | config.colors | 背景色 / 文字色 |
| `{{ACCENT}}` / `{{SECONDARY}}` | config.colors | 品牌色 / 次要色 |
| `{{FONT_TITLE}}` / `{{FONT_BODY}}` | config.fonts | 标题 / 正文字体栈 |
| `{{TITLE_SIZE_V/S/W/C}}` | config.layout | 不同宽高比下的标题字号 |
| `{{CONTENT_SIZE}}` | config.layout | 正文字号基准 |
| `{{BRAND}}` | config.brand | 品牌名称（底部标记） |
| `{{BADGE}}` | config.badge → content.badge | 徽章文字（如 "STORY"、"NEW"） |
| `{{SEAL}}` | config.seal → config.brand → content.seal | 印章文字 |
| `{{METRIC_1/2/3}}` | content.metric1/2/3 | 数据指标数值 |
| `{{METRIC_LABEL_1/2/3}}` | content.metricLabel1/2/3 | 数据指标标签 |

**高级语法：**

1. **`{{COLOR__Axx}}` 带透明度品牌色** — 如 `{{ACCENT__A08}}` → `rgba(79,70,229,0.031)`。`xx` 为十六进制透明度值（00-FF），渲染引擎在 `{{TOKEN}}` 简单替换之前预处理，将 `{{ACCENT__A08}}` 转换为正确的 `rgba()`。

2. **`{{SIZE__PRINT}}` 打印自动缩放** — 如 `calc({{CONTENT_SIZE__PRINT}} * 0.7)`。在 A4/A3 平台渲染时 `__PRINT` 后缀以 `calc(X * 2.5)` 输出，屏幕平台以 `calc(X * 1)` 输出。确保小字（source/badge/brand）在打印时自动放大。

3. **配置优先级**：`{{BADGE}}` 优先取 `content.badge`，回退到 `config.badge`，再回退到字面量 `{{BADGE}}`。`{{SEAL}}` 类似，多一个回退到 `config.brand` 的层级。

### 设计原则

所有模板遵循现代社交媒体卡片设计原则：

1. **3级视觉层次**: 钩子（超大2-3x）→ 上下文（50%钩子大小）→ 品牌（最小）
2. **60-30-10配色**: 60%底色, 30%次要色块, 10%强调色
3. **每个模板有标志性视觉元素**: 色块分割、装饰图形、背景纹理
4. **响应式CSS**: 一个HTML模板适配5种宽高比，布局自动调整
5. **零外部资源**: 所有装饰元素用纯CSS实现

### 文件大小参考

| 模板 | 单图大小 | 5张总大小 | 说明 |
|------|---------|-----------|------|
| 01 | ~65KB | ~330KB | 简洁，文件小 |
| 02 | ~95KB | ~480KB | 渐变+纹理 |
| 05 | ~83KB | ~420KB | 网格+终端圆点 |
| 08 | ~113KB | ~570KB | 径向渐变+竖排文字 |

---

## 文件结构

```
yuanfang-html-image/
├── SKILL.md
├── scripts/
│   ├── render.js               # 核心渲染引擎
│   └── extract.py              # 内容提取（URL/文本）
└── templates/
    ├── 01-minimalist/
    ├── 02-dark-gold/
    ├── 03-editorial/
    ├── 04-warm-handdrawn/
    ├── 05-tech-modern/
    ├── 06-bold-poster/
    ├── 07-data-infographic/
    ├── 08-eastern/
    ├── 09-magazine-cover/
    ├── 10-split-screen/
    ├── 11-minimal-white/
    └── 12-list-ranking/
```

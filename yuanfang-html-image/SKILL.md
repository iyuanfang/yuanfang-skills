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

## Step 0: 提取品牌资产 (URL → logo + 主题色)

**第一步永远是品牌**, 因为它决定了"这套图属于谁". 用户给了 URL, 就自动把品牌资产全抓出来; 给了纯文本, 跳过这步.

### URL 输入 → 自动抓品牌 (建议值, 不是终值)

| 资产 | 来源 | 用途 |
|---|---|---|
| **logo 图片** | `<link rel="apple-touch-icon">` → `og:image` → favicon | 建议值, **Step 2 询问后用户决定** |
| **品牌名** | `og:site_name` → 域名 | 仅供参考 |
| **主题色** | `<meta name="theme-color">`, 兜底: logo 主色 | 建议值, **Step 2 询问后用户决定** |
| **字体** | 页面 `@font-face` / Google Fonts link | 标题/正文字体建议 |

### 抓取结果只作"建议", 用户始终有最终决定权

**Step 0 抓到的东西不是终点, 是"默认值建议"**. Step 2 必须问用户:

1. **logo** (不管抓没抓到都问):
   - 抓到了: "抓到 logo: `data:image/png;...` 或 `<URL>`, 要展示吗? 用这个, 还是换 URL?"
   - 没抓到: "要展示 logo 吗? 给个图片 URL/data URL, 或不要"
   - 不用 logo → 左下角**完全空**, 不用文字兜底 (干净的图片)

2. **品牌色** (不管抓没抓到都问):
   - 抓到了: "抓到主题色: `#4B43E4`, 用这个, 还是换其他颜色?"
   - 没抓到: "要替换主题色吗? 给个 hex (如 `#E11D48`), 或保持主题默认"
   - 不用 → 主题默认色, 右 24% 块 = 主题 indigo

**核心原则**: 自动提取是方便, **最终用户说了算**. 不静默 fallback, 不文字兜底.

### 实现

```bash
# agent 调用 (在项目根目录)
node scripts/extract-brand.js "https://example.com/article"
```

输出存到项目本地 `./.yuanfang/brand-specs/<domain>.json`:

```json
{
  "domain": "yuanfang.skills",
  "extractedAt": "2026-06-06T10:30:00Z",
  "logo": "data:image/png;base64,...",
  "name": "Yuanfang",
  "colors": { "primary": "#5856E9", ... },
  "fonts": { "title": "Outfit", "body": "Inter" }
}
```

### 缓存策略 (项目级)

`./.yuanfang/brand-specs/<domain>.json` 自动缓存, **项目内复用**:

- 同一个项目再访问同一 domain, **直接读缓存, 不重新抓**
- TTL 默认 7 天, 过期自动重抓
- 强制刷新: `--refresh-brand` flag
- **没有全局缓存** — 品牌是项目资产, 不是用户资产. 团队成员通过 git 共享 `.yuanfang/`

### 缓存查找流程

```
URL: https://yuanfang.skills/article/123
    ↓
提取 domain: yuanfang.skills
    ↓
查 ./.yuanfang/brand-specs/yuanfang.skills.json ?
    ├─ 存在且未过期 → 直接用
    ├─ 存在但过期 → 重新抓, 覆盖
    └─ 不存在 → 抓取, 写入
    ↓
返回 brand-spec
```

### 文本输入 → 跳过

纯文本没有品牌信息, brand-spec 不生成. 进 Step 2 时**仍然要问 logo 和颜色**, 用户可以提供.

### 用户没给 URL 也没给文本

跳过 Step 0. 进 Step 2 时主动问 logo + 颜色 (跟文本输入一样的问法).

### Step 0 抓取后的展示 (仅供参考)

```
我从 https://... 抓到了:
  logo: ✓ 抓到 (256×256 PNG)  → 存到 ./.yuanfang/brand-specs/yuanfang.skills.json
  品牌名: Yuanfang
  主题色: #5856E9 (indigo)
  字体: Outfit / Inter

(这些是建议值, 后面 Step 2 你可以改)
```

用户确认 → 进 Step 1 (内容).

---

## Step 1: 提取内容 (URL 或文本 → 标题/正文/要点)

**用户不该被问"标题是什么"** — 应该自动从 URL 或文本提取, 然后给用户改.

### 来源

- **URL** — 已在 Step 0 抓过页面, 复用 HTML 提取 title/body/points
- **纯文本** — agent 调 `extract.js --text` 解析首行/段落/bullet
- **已有 content.json** — 直接用, 跳过提取

### 提取字段

| 字段 | 来源 | 用户可改 |
|---|---|---|
| `title` | `<h1>` / og:title / 文本首行 | ✓ |
| `body` | og:description / 第一段 / 文本摘要 | ✓ |
| `points` | sub-headings / 文本 bullet / 自动归纳 | ✓ |

### 实现

```bash
# URL 已经在 Step 0 抓过, 直接复用
# 文本输入时:
node scripts/extract.js --text "标题\n正文\n- 要点1\n- 要点2" > content.json
```

### 展示给用户

```
我提取了内容:
  标题: AI 重塑内容创作
  正文: 从文案到配图, AI 正在重新定义创意的边界。
  要点: 效率提升 10 倍 / 零门槛创作 / AI 增强而非替代

要改吗? 没问题就继续.
```

---

## Step 2: 询问样式 (按优先级分轮)

### 第一轮 (必答)

- **主题** — 从 12 个主题中选 1 个
  - **如果 Step 0 抓到品牌主色**, 推荐色调最接近的 2-3 个主题, 让用户挑
  - **没抓品牌色**, 默认推荐 `minimal-white` (干净白底, 通用百搭)
- **平台** — 从 6+ 个尺寸中选 1-N 个 (允许多选)
  - 默认推荐: `xiaohongshu` 组 (覆盖小红书竖 + 方)
  - 用户说 "全平台" / "全选" → 选全部

### 第二轮 (logo + 颜色, 都要问)

- **logo** — 左下角
  - **抓到 logo**: 展示给用户 (URL 或 data URL), 问 "用这个, 换 URL, 还是要?"
    - 用这个 → `content.brandImage = <extracted>`
    - 换 URL → `content.brandImage = <new url>`
    - 不要 → `content.brandImage = null` (左下角完全空)
  - **没抓到**: 问 "要加 logo 吗? 给个 URL/data URL, 或不要"
    - 给 URL → `content.brandImage = <url>`
    - 不要 → `content.brandImage = null`
- **品牌色** — `--accent` token
  - **抓到主题色**: 展示给用户 (`#xxx`), 问 "用这个, 换颜色, 还是要?"
    - 用这个 → `brand-spec.colors.primary = <extracted>`
    - 换颜色 → `brand-spec.colors.primary = <new hex>`
    - 不要 → `brand-spec.colors.primary = null` (主题默认)
  - **没抓到**: 问 "要替换主题色吗? 给个 hex, 或保持主题默认"

### 第三轮 (可选, 答 "不用" 跳过)

- **分类标签 (badge)** — 顶部小字
  - 默认: 不渲染
  - 常见: `FEATURED` / `TRENDING` / `ESSENTIAL` / `EXCLUSIVE` / `HOT` / `NEW`
- **二维码 (qr)** — 中下角
  - 默认: 不渲染
  - 用户有现成二维码图片 (公众号 / 视频号 / 收款码) 才会提

### 不再使用的兜底

- ~~品牌名文字 fallback~~: 如果没 logo, 左下角**完全空**, 不显示 "AICS" 这类文字
- ~~主题默认色兜底~~: 改成"显式问用户要不要换", 不要静默用主题默认

### 询问方式 — 按 agent 能力自适应

| Agent 能力 | 询问方式 |
|---|---|
| ✅ 有原生 UI 工具 (OpenCode `question` / Claude Code `AskUserQuestion`) | 弹选项菜单, 用户点击/键盘选 |
| ⚠️ 无 UI 工具 (Codex / openclaw / 简陋 CLI agent) | 打印带编号的选项列表, 等用户从 stdin 输入编号 (1/2/3 或名称) |
| ❓ 不确定 | 默认按有 UI 做, 失败退回打印+读 stdin |

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
用户提供 URL / 文本 / content.json
    ↓
Step 0: 提取品牌资产 (URL → logo + 主题色 + 字体)
  → 自动抓, 用户可换 logo/改色
  → 文本输入则跳过
    ↓
Step 1: 提取内容 (URL/文本 → 标题/正文/要点)
  → 自动提取, 用户可改
    ↓
Step 2: 询问样式 (分两轮)
  → 第一轮 (必答): 主题 + 平台
  → 第二轮 (可选): 分类标签 + 二维码
  → 用 agent 自带的交互工具 (有 UI 弹菜单, 无 UI 打印+读 stdin)
    ↓
Step 3: 渲染 (按选的主题/平台批量生成)
    ↓
Step 4: 预览确认 / 迭代优化
```

---

## 技术参考: extract.js 用法

agent 调用 `extract.js` 提取内容的实际命令:

**前置**: Node.js 18+ (自带 `fetch`, 无需额外依赖).

```bash
# URL 提取（项目根目录执行）
node scripts/extract.js "https://..." > content.json

# 纯文本提取
node scripts/extract.js --text "标题\n正文内容\n- 要点1\n- 要点2" > content.json

# 从文件读取
node scripts/extract.js --file article.md > content.json
```

输出格式：
```json
{
  "title": "主标题",
  "body": "正文描述",
  "points": ["要点1", "要点2"],
  "brand": "品牌名 (从 og:site_name 抓, 可选)",
  "brandImage": "data:image/png;... (从 og:image 抓, 可选)"
}
```

注: `source` 字段已废弃, 不再生成. **无 Python 依赖** — 全栈 Node.js.

---

## 参考: 完整主题库 (12 个)

agent 在 Step 1 推荐主题时备查. 详细视觉特征:

| # | 主题 | 底色 | 主色 | 视觉特征 | 适合 |
|--:|------|------|------|---------|------|
| 01 | minimal-white | `#FFFFFF` | `#5856E9` | 左侧内容+右侧 Indigo 装饰块, 品牌色驱动 | 品牌通用、教程、干货 |
| 02 | dark-gold | #1A1A2E | #E2B714 | 对角分割+装饰圆, 渐变金字, 磨砂纹理 | 重磅消息、产品发布 |
| 03 | editorial | #F5F0EB | #C0392B | 大引号+顶部分隔线, 红色点缀 | 深度分析、访谈 |
| 04 | warm-handdrawn | #FDF6EC | #D97706 | 纸纹底+手绘下划线, 胶带装饰, 星星标记 | 个人故事、生活 |
| 05 | tech-modern | #0F172A | #4FACFE | 终端点数+网格底, 代码注释前缀, 发光点缀 | AI/科技、数码 |
| 06 | bold-poster | #000000 | #FF3355 | 对角大幅红色色块, 超大字体 | 金句引爆、活动 |
| 07 | data-infographic | #F8FAFC | #10B981 | 数据卡片+进度条, 线图装饰 | 排行、报告、数据 |
| 08 | eastern | #F7F3EE | #8D6E63 | 水墨晕染+竖排标题, 印章/竹线装饰 | 文化、哲思、诗词 |
| 09 | magazine-cover | #F5F0EB | #4F46E5 | 全出血版式, 超大标题居中, 右下角品牌标签 | 精品文章、封面故事 |
| 10 | split-screen | #FFFFFF | #4F46E5 | 左右双色背景, 一侧品牌色一侧留白 | 对比/双语/产品展示 |
| 11 | minimal-white-editorial | #FAFAFA | #4F46E5 | 超多留白, 精致小字, 瑞士风排版 | 高端品牌、艺术、设计 |
| 12 | list-ranking | #FFFFFF | #4F46E5 | 编号列表, 大号数字标记, 底部品牌条 | 排行榜、Top 10、步骤流程 |

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
│   ├── render.js               # 核心渲染引擎 (Node.js)
│   ├── extract.js              # 内容提取 (Node.js, URL/文本, 内置 fetch)
│   └── extract-brand.js        # 品牌资产提取 (Node.js, URL → logo/colors/fonts)
├── .yuanfang/                  # 品牌资产缓存 (项目级, 提交到 git)
│   └── brand-specs/
│       └── <domain>.json
└── templates/                  # 旧版模板目录 (兼容性保留, 未来清理)
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

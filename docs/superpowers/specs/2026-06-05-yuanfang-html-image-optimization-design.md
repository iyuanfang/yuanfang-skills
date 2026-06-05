# yuanfang-html-image 优化 & yuanfang-design 系统设计

**日期:** 2026-06-05
**状态:** 设计已批准，待实现
**目标范围:** 本次迭代只做 1 个 layout-type (`cover`) 的完美打磨，配套搭建 yuanfang-design 共享设计库

---

## 0. 项目归属（关键）

**`yuanfang-skills` 是独立项目，与 aics 同级**：
- 仓库位置: `/home/yf/workspace/opencode/yuanfang-skills/`（与 aics 同级）
- GitHub 计划: 后续作为公开项目独立发布
- aics 现状: 当前 `aics/src/marketing/yuanfang-skills/yuanfang-html-image/`（**仅 yuanfang-html-image**）迁出到新仓库
- **huashu-skills 不迁出** — 留在 aics 内部，不属于 yuanfang-skills 项目
- aics 后续: 通过 npm install / git submodule / path 引用新仓库

**本设计文档中的所有路径均为新仓库路径**（`/home/yf/workspace/opencode/yuanfang-skills/` 之下）。

---

## 1. 背景与目标

### 1.1 现状
`yuanfang-html-image` 当前有 12 个独立模板，每个 `templates/XX-name/` 包含 `template.json` + `template.html`（200+ 行硬编码 CSS）。问题：
- 12 份模板之间有大量重复代码（响应式断点、字体栈、颜色块）
- 加一个新风格要复制粘贴 ~200 行
- 改 1 个 token（如 `--accent`）要改 12 个文件
- 没有动画、没有数据可视化、没有进程/时间线/对比图等结构化布局

### 1.2 参考
`lewislulu/html-ppt-skill`（GitHub 5.6k stars）展示了 36 themes + 31 layouts + 47 animations 的 token-driven 架构。我们要**学习其设计思想**，不照搬其实现（我们的输出媒介是 image，不是 PPT slide）。

### 1.3 目标
1. **抽 yuanfang-design 共享库** — token CSS 变量 + theme + layout-type 分离
2. **重做 1 个 layout-type** — `cover`，做到 6 比例下视觉良好
3. **12 个旧模板迁移为 theme** — 保留所有视觉风格，结构代码大幅减少
4. **为未来 `yuanfang-html-ppt` 预留** — design 库是 image + ppt 的共享基础
5. **新仓库独立** — yuanfang-skills 作为独立项目可发 GitHub 公开

### 1.4 非目标
- 本次**不**做 31 个 layout-type（先 cover 完美）
- 本次**不**做 36 个 theme（先从 12 旧模板提取）
- 本次**不**做 chart/diagram/animation（留给后续）
- 本次**不**做 `yuanfang-html-ppt`（仅预留位置）
- 本次**不**做 GitHub 公开发布（只做仓库准备）

---

## 2. 架构

### 2.1 仓库结构（新仓库：`/home/yf/workspace/opencode/yuanfang-skills/`）

```
yuanfang-skills/                              ← 仓库根
├── README.md                                 公开仓库入口
├── LICENSE                                   MIT
├── .gitignore                                忽略 node_modules/、output/ 等
│
├── yuanfang-design/                          ← 父 skill（设计系统）
│   ├── SKILL.md                              design 入口
│   ├── base.css                              token CSS 变量（~80 行）
│   ├── themes/                               12 个主题 .css（~30 行/个）
│   ├── layout-types/
│   │   └── cover.html                        本次打磨（~200 行）
│   ├── animations.css                        共享动画库（本次仅占位）
│   ├── references/
│   │   └── authoring-guide.md                设计规则
│   ├── showcase/                             视觉 QA 工具
│   │   ├── cover-showcase.html
│   │   └── generate.js
│   └── tests/                                base.css 单元测试
│
├── yuanfang-html-image/                      ← 子 skill（image 输出）
│   ├── SKILL.md
│   ├── scripts/
│   │   ├── render.js                         消费 ../yuanfang-design/{base,themes,layout-types}
│   │   └── extract.py
│   ├── tests/                                render.js 单元测试
│   └── output/                               渲染结果（gitignored）
│
└── (future) yuanfang-html-ppt/               后续扩展位（本次不实现）

> **注**: `huashu-skills/` 留在 aics 内部，不属于 yuanfang-skills 项目范围。
```

### 2.2 关系
- **`yuanfang-design/` 是 skill** — 有 `SKILL.md`、有触发词（"提取 design 资源"、"添加新 theme"、"添加新 layout-type"）
- **`yuanfang-html-image/` 是 skill** — 渲染图片输出
- **html-image 引用 design** 通过 `path.join(__dirname, '../yuanfang-design/base.css')` 等相对路径（同一仓库内，无 `../../`）
- **依赖说明**: 在 `yuanfang-html-image/SKILL.md` 开头明确注明"依赖同仓库 `yuanfang-design/`"

### 2.3 部署单位
部署单位是 **`yuanfang-skills/` 整个仓库**，不是某个子目录。每个 skill 单独不可独立运行；如要单独使用，复制整个仓库。

### 2.4 与 aics 的关系
- **aics 当前** `src/marketing/yuanfang-skills/yuanfang-html-image/` **单独迁出**到新仓库
- **aics 当前** `src/marketing/yuanfang-skills/huashu-skills/` **保留在 aics**，不迁移（huashu-skills 是 aics 内部其他团队的内容，不属于 yuanfang-skills 项目）
- **aics 后续** 通过以下方式使用新 yuanfang-skills 仓库：
  - 短期：本地 path 引用（开发期）
  - 中期：git submodule
  - 长期：npm install `yuanfang-skills` 包
- **本设计不涉及** aics 侧的具体改造（独立 PR）

---

## 3. base.css Token 体系

**约 80 行 CSS，仅定义变量默认值（最小可用的 light theme）**。

| Token 组 | 变量 | 默认值 | 用途 |
|---|---|---|---|
| Color | `--bg` | `#FFFFFF` | 60% 底色 |
| | `--text` | `#0F172A` | 主文字 |
| | `--accent` | `#4F46E5` | 10% 强调色 |
| | `--secondary` | `#64748B` | 30% 次要色 |
| | `--bg-alt` | `#F8FAFC` | 卡片/分区底 |
| Type | `--font-title` | `Outfit, "PingFang SC", sans-serif` | 标题字体栈 |
| | `--font-body` | `Outfit, "PingFang SC", sans-serif` | 正文字体栈 |
| Size | `--title-size-v` | `130px` | 3:4 竖版标题 |
| | `--title-size-s` | `96px` | 1:1 方版标题 |
| | `--title-size-w` | `88px` | 16:9 横版标题 |
| | `--title-size-c` | `64px` | 2.35:1 封面标题 |
| | `--content-size` | `38px` | 正文字号基准 |
| | `--badge-size` | `18px` | 徽章/标签 |
| | `--source-size` | `14px` | 来源/底部标记 |
| Space | `--space-1` / `-2` / `-3` / `-4` | `8` / `16` / `24` / `48` px | 4 档节奏 |
| Radius | `--radius` | `12px` | 圆角 |
| Shadow | `--shadow` | `0 8px 32px rgba(0,0,0,.08)` | 阴影 |
| Decor | `--decor-tl` | `none` | 左上装饰 (gradient/url) |
| | `--decor-tr` | `none` | 右上装饰 |
| | `--decor-bl` | `none` | 左下装饰 |
| | `--decor-br` | `none` | 右下装饰 |
| Flags | `--accent-line` | `0` | 顶部 4px accent 条 (0/1) |
| | `--accent-block` | `0` | 右侧色块 (0/1) |
| | `--terminal-bar` | `0` | 终端圆点 (0/1) |
| | `--grid-bg` | `0` | 网格底 (0/1) |
| | `--seal` | `""` | 印章文字 |

**base.css 末尾定义 `[data-theme] .cover` 类的样式**:
- 通过 6 个 `@media` 断点切换 6 种比例
- 所有装饰通过 `var(--decor-*)` / `var(--*-line/bar/grid)` 控制
- **零字面颜色/字号/装饰值**

---

## 4. cover.html Layout-type

**唯一干净的结构**:

```html
<div class="cover" data-theme="{{THEME}}">
  <div class="cover__decor cover__decor--tr"></div>   <!-- 右上装饰 -->
  <div class="cover__decor cover__decor--bl"></div>   <!-- 左下装饰 -->
  <div class="cover__accent-line"></div>              <!-- 顶部条 -->
  <div class="cover__terminal-bar">                   <!-- 终端圆点 -->
    <span></span><span></span><span></span>
  </div>
  <div class="cover__seal">{{SEAL}}</div>             <!-- 印章 -->
  <div class="cover__badge">{{BADGE}}</div>           <!-- 徽章 -->
  <h1 class="cover__title">{{TITLE}}</h1>             <!-- 主标题 -->
  <p class="cover__content">{{CONTENT}}</p>           <!-- 正文 -->
  <ul class="cover__points">{{POINTS_HTML}}</ul>      <!-- 要点 -->
  <div class="cover__source">{{SOURCE}}</div>         <!-- 来源 -->
  <div class="cover__brand">{{BRAND}}</div>           <!-- 品牌 -->
</div>
```

**核心 CSS 规则**（在 base.css 末尾）:
- `.cover__title` 在 5 比例下用 `var(--title-size-v/s/w/c)`
- `.cover__decor` 默认 `display: none`；`--decor-*` 非 none 时显示
- `.cover__accent-line` / `.cover__terminal-bar` 用 `display: none/var(--accent-line, none)` 控制
- `.cover__seal` 用 `var(--seal)` 作为 `content`
- **不用** `transform: scale()` 缩放（避免字体模糊）
- **不用** JS（Playwright 截图前已固定 viewport）

### 4.1 6 比例表现表

| 比例 | 平台 | 布局策略 | 标题字号 | 装饰策略 |
|---|---|---|---|---|
| **3:4 竖版** (1080×1440) | xiaohongshu-v | 标题左上 (40% top), badge 顶部, points 标题下, brand 底部 | 130px (`--title-size-v`) | 顶部 4px accent 条 + 右下圆形 brand 印章 |
| **1:1 方版** (1080×1080) | xiaohongshu-s, moments, wechat-thumb | 居中, 大标题居中, points 标题下 | 96px (`--title-size-s`) | 左右对称 accent 块 + 底部 brand |
| **16:9 横版** (1920×1080) | bilibili-cover | 标题居中, content 居中, points 在标题右侧 | 88px (`--title-size-w`) | 上方 accent 条 + 底部 source 链 |
| **2.35:1 封面** (900×383) | wechat-cover | 编辑风, 标题居中, **不放 points** | 64px (`--title-size-c`) | 仅 1-2 行装饰小字, badge 右上 |
| **1.9:1 OG** (1200×630) | twitter, weibo, toutiao | 标题居中偏上, points 紧凑 1 行 | 64px (`--title-size-c`) | 上下细 accent 条 |
| **9:16 长竖版** (1080×1920) | douyin-cover | 标题垂直居中 30% top, 下方留白大 | 130px (`--title-size-v`) | 顶部 brand, 底部 accent 色块 |

**字号使用规则**:
- `--title-size-v` (130px) 服务 3:4 竖版 + 9:16 长竖版（主题可覆盖做差异化）
- `--title-size-s` (96px) 服务 1:1 方版
- `--title-size-w` (88px) 服务 16:9 横版
- `--title-size-c` (64px) 服务 2.35:1 封面 + 1.9:1 OG
- **不**新增 `--title-size-og` token；OG 复用 `--title-size-c`
- 不需要差异化的 theme 直接用 base.css 默认值；想区分的 theme 重写 token 即可

### 4.2 Points 折叠规则

| 比例 | 处理 |
|---|---|
| 9:16 长竖版 | 完整显示 |
| 16:9 横版 | 转为右侧 inline 行 |
| 2.35:1 封面 | **隐藏**（空间不够） |
| 1:1 方版 | 完整显示 |
| 1.9:1 OG | 紧凑 1 行 |
| 3:4 竖版 | 完整显示 |

### 4.3 品牌/Source 锚定

| 比例 | brand 位置 | source 位置 |
|---|---|---|
| 横版 (16:9, 2.35:1, 1.9:1) | 底部居中或左下 | 底部右侧 |
| 竖版 (3:4, 9:16) | 右下竖排 | 左下 |
| 方版 (1:1) | 居中下方 | 左下 |

---

## 5. Theme 提取规则

### 5.1 12 主题调色板

| # | Theme | 调色板 | 字体 |
|---|---|---|---|
| 01 | minimal-white | `#FFFFFF` / `#0F172A` / `#4F46E5` | Outfit + PingFang |
| 02 | dark-gold | `#1A1A2E` / `#F5E6D3` / `#E2B714` | Playfair + Inter |
| 03 | editorial | `#F5F0EB` / `#C0392B` | Source Serif + Sans |
| 04 | warm-handdrawn | `#FDF6EC` / `#D97706` | Caveat + Patrick Hand |
| 05 | tech-modern | `#0F172A` / `#4FACFE` | JetBrains Mono + Inter |
| 06 | bold-poster | `#000000` / `#FF3355` | Inter Black + Inter |
| 07 | data-infographic | `#F8FAFC` / `#10B981` | Outfit + Inter |
| 08 | eastern | `#F7F3EE` / `#8D6E63` | Ma Shan Zheng + Noto Serif SC |
| 09 | magazine-cover | `#F5F0EB` / `#4F46E5` | Playfair Display + Lora |
| 10 | split-screen | `#FFFFFF` / `#4F46E5` | Inter + Inter |
| 11 | minimal-white-editorial | `#FAFAFA` / `#4F46E5` | Inter + Inter |
| 12 | list-ranking | `#FFFFFF` / `#4F46E5` | Inter + Inter |

### 5.2 主题 CSS 模板

```css
/* themes/<name>.css */
[data-theme="<name>"] {
  /* 颜色 */
  --bg: <...>;
  --text: <...>;
  --accent: <...>;
  --secondary: <...>;
  --bg-alt: <...>;

  /* 字体 */
  --font-title: <...>;
  --font-body: <...>;

  /* 字号 */
  --title-size-v: <...>;
  --title-size-s: <...>;
  --title-size-w: <...>;
  --title-size-c: <...>;
  --content-size: <...>;

  /* 装饰 */
  --decor-tl: <none | gradient | url>;
  --decor-tr: <...>;
  --decor-bl: <...>;
  --decor-br: <...>;
  --accent-line: <0|1>;
  --accent-block: <0|1>;
  --terminal-bar: <0|1>;
  --grid-bg: <0|1>;
  --seal: "<text>";
}
```

**关键约束**:
- 每个 theme 只能**重写 token**，不能定义新 class 或新规则
- 装饰存在性用 `--*-line/block/bar/grid: 0/1` 控制；具体形态用 `--decor-*` 控制
- 字体、色板、字号、装饰**全部在 theme 内**；base.css 不含任何具体值

---

## 6. render.js 渲染逻辑

### 6.1 渲染流程

```
1. 解析 CLI 参数
2. 加载同仓库资源（路径相对于 yuanfang-html-image/scripts/render.js）
   - ../yuanfang-design/base.css
   - ../yuanfang-design/themes/<theme>.css
   - ../yuanfang-design/layout-types/<layout>.html
3. 拼装完整 HTML
   - <html data-theme="<theme>">
   - <style>base.css 内容 + theme.css 内容 inline</style>
   - <body>内嵌 layout 块（变量替换）</body>
4. **{{}} 替换**
   - 文本 token: `{{TITLE}}` `{{CONTENT}}` `{{BADGE}}` `{{BRAND}}` `{{SOURCE}}` `{{SEAL}}` `{{POINTS_HTML}}`
   - 颜色: `{{ACCENT__Axx}}` → `rgba(..., alpha)`
   - 尺寸: `{{*_SIZE__PRINT}}` → `calc(X * 2.5)` for a4/a3, 1x for screen
   - **保留** `{{METRIC_1/2/3}}` 和 `{{METRIC_LABEL_1/2/3}}` 在 content.json 中（**cover 不使用**，但解析时不报错，留给未来 kpi-grid 布局）
5. Playwright 截图
```

### 6.2 CLI flags

| Flag | 默认 | 说明 |
|---|---|---|
| `--theme` | `minimal-white` | 主题 ID（来自 `../../themes/`） |
| `--layout` | `cover` | 布局 ID（来自 `../../layout-types/`） |
| `--auto-theme` | `false` | 根据内容关键词自动推荐主题 |
| `--list-themes` | - | 打印主题列表并退出 |
| `--list-layouts` | - | 打印布局列表并退出 |
| `--preview` | `false` | 输出 HTML 不截图（调试） |
| `--platforms` | 默认 5 种 | 平台 ID（保留旧） |
| `--file` / `--title` / `--content` / `--points` | - | 内容来源（保留旧） |

### 6.3 兼容

旧 `content.json` 里的 `"template": 1` 字段映射到 `"theme": "minimal-white", "layout": "cover"`（向后兼容）。**保留**所有旧 flag 行为。

### 6.4 --auto-theme 规则（简化版）

```js
const THEME_RULES = [
  { keywords: ['AI', '科技', 'tech', 'code'],       theme: 'tech-modern' },
  { keywords: ['数据', '增长', '排行', '%', '统计'],  theme: 'data-infographic' },
  { keywords: ['发布', '重磅', '大', '震撼'],         theme: 'dark-gold' },
  { keywords: ['生活', '故事', '个人', '感受'],       theme: 'warm-handdrawn' },
  { keywords: ['东方', '古', '诗', '禅'],             theme: 'eastern' },
  { keywords: ['编辑', '深度', '分析', '访谈'],       theme: 'editorial' },
  { keywords: ['封面', '故事', '品牌'],              theme: 'magazine-cover' },
  { keywords: ['对比', '左右', '双语'],              theme: 'split-screen' },
  { keywords: ['极简', '高端', '艺术'],              theme: 'minimal-white-editorial' },
  { keywords: ['排行', 'Top', '排名', 'list'],       theme: 'list-ranking' },
  { keywords: ['金句', '引爆', '震撼'],              theme: 'bold-poster' },
  // fallback
  { fallback: true, theme: 'minimal-white' },
];
```

---

## 7. 验收标准

### 7.1 自动化（machine-verifiable）

| 检查项 | 工具 | 阈值 |
|---|---|---|
| 6 比例渲染都成功 | Playwright exit 0 | 12 theme × 6 platform = 72 张全成功 |
| 文字无溢出/截断 | puppeteer 文字 bbox vs 容器 bbox | 0 overflow |
| 装饰元素不重叠主文字 | 视觉检查 | 0 冲突 |
| 文件大小合理 | `du -h` | < 150KB/图（与旧持平或更优） |
| JSON 解析无遗留 `{{TOKEN}}` | `grep '{{' output/*.html` | 0 命中 |

### 7.2 视觉 QA（human-required）

**抽检 2 主题 × 6 比例 = 12 张**作为金标:
- 至少 1 个**亮色**主题（minimal-white）+ 1 个**暗色**主题（dark-gold 或 tech-modern）
- 至少 1 个**横版**（16:9）+ 1 个**竖版**（9:16 或 3:4）+ 1 个**封面**（2.35:1）
- 剩余 4 比例快速浏览

### 7.3 回归对比

每个主题渲染 cover 后，与旧 template.html 在同一平台下的输出并排对比:
- 旧: `node render.js --template 1 --platforms all --output ./before/01`
- 新: `node render.js --theme minimal-white --layout cover --platforms all --output ./after/01`

**对比维度**（人眼打分 1-5）:
- 文字可读性
- 视觉层次
- 装饰合理性
- 整体美感

**通过标准**: 12 主题中 ≥ 10 主题打分持平或更好；< 10 则迭代 cover.html。

### 7.4 Showcase 页面

`yuanfang-design/showcase/cover-showcase.html`:
- 12 themes × 6 platforms = 72 iframes in grid
- 打开 `file://path/to/showcase/cover-showcase.html` 一眼看完全部
- Playwright 跑一次截图归档到 `output/showcase/` 作 history

### 7.5 失败处理

若某 theme × platform 视觉不合格:
1. 标记不合格（写到 `output/qa-report.md`）
2. **不动** cover.html，先改对应 theme 的 CSS
3. 若多 theme 共享问题，才动 cover.html
4. 重跑该 theme × 全部 6 platform 直到通过

---

## 8. 实施计划（高层）

按依赖顺序:

1. **建新仓库 yuanfang-skills** — `/home/yf/workspace/opencode/yuanfang-skills/`，git init
2. **迁出 aics 的 yuanfang-html-image** — 从 `aics/src/marketing/yuanfang-skills/yuanfang-html-image/` 复制到新仓库（**仅 yuanfang-html-image**，huashu-skills 不迁出）
3. **建 yuanfang-design 骨架** — 目录、SKILL.md、base.css 占位、references 占位
4. **抽 12 主题** — 读旧 12 个 template.html/jsons，写 12 个 .css
5. **写 cover.html** — 干净结构 + base.css 末尾的 cover 类
6. **改 render.js** — theme + layout 注入逻辑、新 CLI flag、向后兼容
7. **72 张回归** — 跑 12 theme × 6 platform，对比旧输出
8. **修不合格** — 优先改 theme，必要时动 cover.html
9. **建 showcase 页面** — 72 iframe grid
10. **写 authoring-guide.md** — "always start from layout-type, use tokens not literals"
11. **更新两个 SKILL.md** — yuanfang-design 入口 + yuanfang-html-image 引用
12. **aics 侧断引用** — 删除 `aics/src/marketing/yuanfang-skills/yuanfang-html-image/`，改用 path 引用新仓库（**huashu-skills 保留**）
13. **提交 + 部署** — git add/commit/push（两仓库分别）

---

## 9. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 旧 12 模板的视觉风格无法用 token 完全表达 | 中 | 高 | 部分 theme 可能需要 1-2 个 `--custom-*` 扩展 token；限制每个 theme ≤ 5 个自定义 |
| 6 比例下 cover 表现难以全部"完美" | 中 | 中 | 优先级：竖版 + 方版 + 横版 优先完美；9:16 / 2.35:1 / 1.9:1 接受"够用" |
| render.js 改动导致旧用法回归 | 低 | 中 | 保留所有旧 flag；`template: 1` 自动映射 |
| 字体在所有比例下加载失败 | 低 | 中 | 保留 `system-ui, sans-serif` fallback；Playwright 设 1.5s wait-for-timeout |
| 暗色 theme 的装饰与 base.css 默认装饰冲突 | 中 | 中 | base.css 末尾 cover 类只引用 var，不写死；theme 100% 决定装饰 |
| 用户已习惯旧 CLI `--template 1` | 低 | 低 | 同时支持 `--template` 和 `--theme`；自动映射 |

---

## 10. 后续迭代（非本次）

- 扩展 layout-type：bullets, two-column, three-column, kpi-grid, stat-highlight（6 个 core）
- 扩展 theme：从 12 扩到 36（参考 lewislulu 36 themes）
- 动画系统：data-anim + 15-20 个 CSS 进场动画
- 数据可视化：Chart.js 集成（chart-bar/line/pie/radar）
- 进程图：timeline / process-steps / arch-diagram
- yuanfang-html-ppt 子 skill：消费同一 yuanfang-design，加 chrome（页码/页脚）+ 键盘导航

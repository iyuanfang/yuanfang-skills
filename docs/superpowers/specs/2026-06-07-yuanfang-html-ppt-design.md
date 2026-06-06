# yuanfang-html-ppt 设计与实现规范

**日期:** 2026-06-07
**状态:** 设计已批准（用户口头授权自主实现），待写实现计划
**目标范围:** 首个 MVP 交付 Full 7 布局 + A+C 混合生成引擎，与 `yuanfang-html-image` 模式一致

---

## 0. 项目归属（关键）

`yuanfang-html-ppt` 是 `yuanfang-skills` 仓库的第三个 skill：

```
yuanfang-skills/                                ← 仓库根
├── yuanfang-design/                            ← 共享设计系统 (基座)
├── yuanfang-html-image/                        ← 消费者：图片生成
└── yuanfang-html-ppt/                          ← (本次新增) 消费者：PPTX 生成
```

- 仓库位置: `/home/yf/workspace/opencode/yuanfang-skills/`
- 复用 `yuanfang-design/` (12 主题 + base.css token)
- 复用 `yuanfang-html-image/` 的品牌管线（`extract-brand.js` symlink 共享）
- 共享测试体系与 visual baseline 策略

---

## 1. 背景与目标

### 1.1 现状

- `yuanfang-html-ppt/` 目录不存在
- README 中标注 "*(planned)*"
- 旧实现遗留在 `aics` 仓库的 `yuanfang-slides/`
- 调研结论：无现成的高质量 "HTML + token 设计系统 + PPTX 输出" 模式可以直接复用
- 同名参考项目：
  - `dtyq/magic` (4.9k stars): iframe + getComputedStyle → PptxGenJS，最接近需求
  - `lewislulu/html-ppt-skill` (5.6k stars): 31 layouts + 36 themes，但样式硬编码，输出 HTML 而非 PPTX

### 1.2 目标

1. **首个 MVP 交付 Full 7 布局** — cover, section, content, two-column, data, quote, summary
2. **A+C 混合生成引擎** — 内容页用 A 方案（PptxGenJS API），装饰页用 C 方案（iframe getComputedStyle）
3. **复用 yuanfang-design** — 12 主题 + base.css token 共享
4. **复用 yuanfang-html-image 模式** — content.json、硬闸门、CLI、品牌管线、视觉 baseline
5. **编辑性优先** — 输出的 .pptx 文字必须可二次编辑（不输出为位图）

### 1.3 非目标

- 本次不做 chart 图表生成
- 本次不做 16:9 之外的多比例（先做 16:9 widescreen）
- 本次不做 PPTX 解析 / 编辑现有 PPTX
- 本次不做过渡动画 / 母版视图 (slide master)
- 本次不做播放模式（speaker notes 暂留空）

---

## 2. 架构

### 2.1 目录结构

```
yuanfang-html-ppt/                              ← 新增 skill
├── SKILL.md                                    工作流 (Step 0-4, 与 html-image 对齐)
├── package.json                                PptxGenJS ^4.0.0, playwright ^1.40
├── scripts/
│   ├── render.js                               主入口, 硬闸门, CLI 解析
│   ├── parse-slides.js                         content.json → 7 种 slide spec
│   ├── generator-a.js                          A 方案: JSON→PptxGenJS 直出
│   ├── generator-c.js                          C 方案: iframe + getComputedStyle→PptxGenJS
│   ├── theme-mapper.js                         CSS var → PptxGenJS theme object
│   ├── extract-brand.js                        symlink → ../../yuanfang-html-image/scripts/extract-brand.js
│   └── brand-css.js                            symlink → ../../yuanfang-html-image/scripts/brand-css.js
├── templates/                                  C 方案渲染的 HTML 模板
│   ├── slide-section.html
│   ├── slide-two-column.html
│   ├── slide-data.html
│   └── slide-quote.html
└── tests/
    ├── unit/
    │   ├── parse-slides.test.js
    │   ├── theme-mapper.test.js
    │   ├── generator-a.test.js
    │   └── generator-c.test.js
    ├── integration/
    │   └── render-pipeline.test.js
    ├── visual-baselines/                       视觉回归基线
    │   ├── cover-minimalist.png
    │   ├── section-warm-handdrawn.png
    │   ├── content-editorial.png
    │   ├── two-column-tech-modern.png
    │   ├── data-dark-gold.png
    │   ├── quote-magazine-cover.png
    │   └── summary-minimalist.png
    └── fixtures/
        ├── content-cover.json
        ├── content-section.json
        ├── content-content.json
        ├── content-two-column.json
        ├── content-data.json
        ├── content-quote.json
        └── content-summary.json
```

### 2.2 A+C 混合架构

```
content.json
    │
    ▼
render.js (硬闸门 → 品牌管线 → 主题映射)
    │
    ├─→ parseSlides(content) → slides[]
    │
    ├─→ theme = loadTheme(content.theme)
    │
    ├─→ brand = extractBrand(content.brand)
    │
    ▼
对每张 slide:
    │
    ├─ 路由决策 (layout → 方案)
    │   cover, content, summary        → A
    │   section, two-column, data, quote → C
    │
    ├─ A 方案 (generator-a.js):
    │   纯 PptxGenJS API 调用
    │   1. pres.addSlide()
    │   2. s.background = { color: theme.bg }
    │   3. s.addText({ x, y, w, h, fontFace, fontSize, color, ... })
    │   4. s.addShape(...)
    │   5. s.addImage(logo)
    │
    ├─ C 方案 (generator-c.js):
    │   HTML 模板 → 计算样式 → PptxGenJS
    │   1. browser = getOrCreateBrowser() (全局复用)
    │   2. page.setContent(template + theme + content)
    │   3. layout = page.evaluate(measureLayout)
    │   4. 遍历 elements, 映射为 PptxGenJS 调用
    │   5. close browser on final slide
    │
    ▼
pres.writeFile('output.pptx')
```

### 2.3 与 yuanfang-html-image 的复用关系

| 模块 | html-image | html-ppt |
|------|-----------|----------|
| 品牌管线 | `extract-brand.js`, `brand-css.js` | symlink 复用 |
| 主题加载 | CSS 文件解析 | symlink 复用 + 新增 `theme-mapper.js` |
| 硬闸门 | render.js L150-L200 | 复制同样的 5 项检查 |
| CLI flag | `--theme --brand --layout --platforms --preview` | 复制 + `--platforms` 含义改为比例 |
| content.json | 单页结构 | 扩展为 `{ slides: [...] }` 数组，支持单页简写 |
| 视觉 baseline | 6 张 PNG | 7 布局 × 1 默认主题 = 7 张 PNG |
| Playwright | 渲染主路径 | 仅 C 方案用, A 方案不需要 |

---

## 3. content.json 内容模型

### 3.1 多页模式 (默认)

```json
{
  "brand": "minimalist",
  "theme": "minimalist",
  "title": "Deck Title",
  "author": "Author",
  "date": "2026-06-07",
  "logo": "./logo.png",
  "slides": [
    { "layout": "cover", "title": "Q3 路线图", "subtitle": "..." },
    { "layout": "section", "title": "战略方向" },
    { "layout": "content", "title": "核心目标", "points": ["..."] },
    { "layout": "two-column", "title": "对比",
      "leftTitle": "我们", "leftPoints": ["..."],
      "rightTitle": "竞品", "rightPoints": ["..."] },
    { "layout": "data", "title": "指标",
      "metrics": [{ "label": "MAU", "value": "120 万", "change": "+15%" }] },
    { "layout": "quote", "title": "客户评价",
      "quote": "...", "attribution": "..." },
    { "layout": "summary", "title": "下一步", "points": ["..."] }
  ]
}
```

### 3.2 单页简写 (向后兼容 html-image)

```json
{
  "brand": "minimalist",
  "theme": "minimalist",
  "layout": "content",
  "title": "...",
  "body": "..."
}
```

`parse-slides.js` 检测到顶层有 `layout` 字段时，自动包装为 `slides: [{ ...topLevelFields }]`。

### 3.3 字段验证

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `brand` | ✅ | string | 品牌名, 触发 extractBrand 管线 |
| `theme` | ✅ | string | 主题名, 12 选 1 |
| `slides` 或 `layout` | ✅ | array/object | 多页 or 单页 |
| `title` | ✅ | string | Deck 总标题 (用于 cover) |
| `slides[].layout` | ✅ | enum | 7 种 layout 之一 |
| `logo` | ❌ | string | logo 文件路径 |
| `author` | ❌ | string | 作者署名 |
| `date` | ❌ | string | 日期字符串 |
| `slides[].title` | ✅ | string | 幻灯片标题 |
| `slides[].subtitle` | ❌ | string | 副标题 (cover 用) |
| `slides[].body` | ❌ | string | 正文 (content 用) |
| `slides[].points` | ❌ | string[] | 要点列表 (content/summary 用) |
| `slides[].leftTitle/leftPoints` | ❌ | string/string[] | 双栏左 |
| `slides[].rightTitle/rightPoints` | ❌ | string/string[] | 双栏右 |
| `slides[].metrics` | ❌ | {label,value,change}[] | 数据卡 |
| `slides[].quote` | ❌ | string | 引用文字 |
| `slides[].attribution` | ❌ | string | 引用署名 |

---

## 4. 主题集成 (theme-mapper)

### 4.1 CSS Token → PptxGenJS 映射

```
CSS 变量                              →  PptxGenJS theme
─────────────────────────────────────────────────────────
--color-bg-primary                     →  background.color
--color-text-primary                   →  color (主文字)
--color-text-secondary                 →  color (次文字)
--color-accent                         →  color (强调)
--color-secondary                      →  color (副强调)
--font-family-base                     →  fontFace (正文)
--font-family-heading                  →  fontFace (标题)
--font-size-base (16px)                →  fontSize (正文) — px × 0.75
--font-size-h1 (32px)                  →  fontSize (大标题)
--font-size-h2 (24px)                  →  fontSize (副标题)
--font-size-h3 (18px)                  →  fontSize (小标题)
--font-size-sm (14px)                  →  fontSize (小字)
--font-weight-bold (700)               →  bold: true
--font-weight-normal (400)             →  bold: false
--line-height-base (1.5)               →  lineSpacingMultiple
--letter-spacing-base (0em)            →  charSpacing
--spacing-unit (8px)                   →  spacing (px × 0.75)
--border-radius-base (8px)             →  rectRadius
--shadow-elevation-2                   →  shadow
```

**单位换算**: PowerPoint 使用磅 (pt)。1 px = 0.75 pt（@96 DPI 假设）。`theme-mapper.js` 在 `loadTheme()` 末尾统一换算。

### 4.2 解析策略

```js
async function loadTheme(themeName) {
  const baseTokens = parseCSSVariables(readFile('yuanfang-design/base.css'));
  const themeTokens = parseCSSVariables(readFile(`yuanfang-design/themes/${themeName}.css`));
  const merged = { ...baseTokens, ...themeTokens };
  return mapToPptxTheme(merged);
}
```

`parseCSSVariables` 解析 `--name: value;` 行, 跳过规则和注释。
`mapToPptxTheme` 应用 4.1 表, 单位换算, 返回最终对象。

### 4.3 A 方案使用

```js
function renderCover(pres, slide, theme, brand) {
  const s = pres.addSlide();
  s.background = { color: theme.bg };
  s.addText(slide.title, {
    x: theme.spacing * 4, y: theme.spacing * 6,
    w: 10 - theme.spacing * 8, h: 1.5,
    fontFace: theme.fontTitle, fontSize: theme.sizeTitle,
    color: theme.text, bold: true,
  });
}
```

### 4.4 C 方案使用

HTML 模板直接用 `var(--name)` 引用 token, Playwright 渲染时已包含主题样式。`generator-c.js` 只需读取 computed style 即可。

---

## 5. 7 种布局模板

### 5.1 cover (封面) — A 方案

布局：
- 全屏背景色 = theme.bg
- 标题居中, y=30%, fontSize=44pt
- 副标题居中, y=45%, fontSize=20pt
- 作者 + 日期居中, y=85%, fontSize=12pt
- logo 右上角, 40×40px

### 5.2 section (章节分割) — C 方案

```html
<!-- templates/slide-section.html -->
<div class="section-page">
  <div class="section-number">01</div>
  <div class="section-title">{{title}}</div>
  <div class="section-divider"></div>
</div>
```

CSS：巨号数字 + 标题 + 装饰线。C 方案读取位置和样式。

### 5.3 content (标题+要点) — A 方案

布局：
- 标题左对齐, top=10%, fontSize=28pt
- 要点 bullet list, y=25%, fontSize=18pt
- 每条要点行高 1.5

### 5.4 two-column (双栏) — C 方案

```html
<div class="two-col">
  <div class="col col-left">
    <h2 class="col-title">{{leftTitle}}</h2>
    <ul class="col-points">{{#leftPoints}}<li>{{.}}</li>{{/leftPoints}}</ul>
  </div>
  <div class="col col-right">
    <h2 class="col-title">{{rightTitle}}</h2>
    <ul class="col-points">{{#rightPoints}}<li>{{.}}</li>{{/rightPoints}}</ul>
  </div>
</div>
```

CSS flex 布局，gap=2x spacing-unit。C 方案读取每列位置。

### 5.5 data (KPI 网格) — C 方案

```html
<div class="data-grid">
  {{#metrics}}
  <div class="metric-card">
    <div class="metric-label">{{label}}</div>
    <div class="metric-value">{{value}}</div>
    <div class="metric-change">{{change}}</div>
  </div>
  {{/metrics}}
</div>
```

CSS Grid，3 列。C 方案读取每个 metric-card 的位置和样式。

### 5.6 quote (引用) — C 方案

```html
<div class="quote-page">
  <div class="quote-mark">"</div>
  <p class="quote-text">{{quote}}</p>
  <p class="quote-attribution">— {{attribution}}</p>
</div>
```

CSS：大引号符号 + 引用文字 + 署名。

### 5.7 summary (结尾) — A 方案

同 `content`，但底部加 "谢谢" / "Q&A" 标记。

---

## 6. CLI & UX

### 6.1 CLI 接口

```bash
node scripts/render.js \
  --file content.json \
  --theme minimalist \
  --brand minimalist \
  --output deck.pptx \
  --preview \
  --platforms macos
```

| Flag | 必填 | 默认 | 说明 |
|------|------|------|------|
| `--file` | ✅ | - | content.json 路径 |
| `--theme` | ✅ | - | 12 主题名之一 |
| `--brand` | ✅ | - | 品牌名 |
| `--output` | ❌ | `output.pptx` | 输出路径 |
| `--preview` | ❌ | false | 生成 preview PNG |
| `--platforms` | ❌ | `macos` | 比例: macos, windows, widescreen, 4-3 |
| `--logo` | ❌ | - | 覆盖 content.json 中的 logo |
| `--debug` | ❌ | false | 保留中间 HTML 和 Playwright 截图 |

### 6.2 SKILL.md 工作流

```markdown
# Step 0: 准备 content.json (7 布局之一)
# Step 1: 主题选择 (列出 12 个, 给配色预览)
# Step 2: 用户确认 (5 项: content / theme / brand / layout / media)
# Step 3: 渲染 (执行 render.js)
# Step 4: 输出验证 (检查 .pptx + preview/)
```

### 6.3 硬闸门 (render.js)

```js
function hardGate(content, context) {
  if (!content.theme) throw new Error('❌ 缺少 theme 字段');
  if (!content.brand) throw new Error('❌ 缺少 brand 字段');
  if (!content.slides?.length && !content.layout) {
    throw new Error('❌ 缺少 slides 数组或单页 layout');
  }
  if (!context.contentConfirmed) throw new Error('❌ 内容未确认');
  if (!context.themeConfirmed) throw new Error('❌ 主题未确认');
  if (!context.brandConfirmed) throw new Error('❌ 品牌未确认');
  if (!context.layoutConfirmed) throw new Error('❌ 布局未确认');
  if (!context.mediaConfirmed) throw new Error('❌ 媒体未确认');
}
```

---

## 7. 错误处理

| 场景 | 行为 | 用户提示 |
|------|------|---------|
| 缺 theme | 硬闸门拒绝 | "❌ 缺少 theme 字段。请从 12 主题选一" |
| 缺 brand | 硬闸门拒绝 | "❌ 缺少 brand 字段" |
| 未知 layout | 解析报错 | "❌ layout 'foo' 未知。支持: cover, section, content, two-column, data, quote, summary" |
| 必填字段缺失 | 跳过该 slide | "⚠️ 跳过 slide #N: <layout> 缺少 <field>" |
| C 方案渲染失败 | 记录 + 跳过 | "❌ C 方案失败 (slide #N): <error>" |
| Playwright 启动失败 | 全降级 A 方案 | "⚠️ Playwright 不可用, 全部 slide 降级为 A 方案 (仅支持 cover/content/summary)" |
| 媒体文件缺失 | 跳过元素 | "⚠️ logo.png 不存在, 跳过 logo" |
| 输出目录无权限 | 报错 + 保留临时 | "❌ 写入失败: <error>" |
| .pptx > 50MB | 警告 | "⚠️ 输出 52MB 较大, 建议压缩图片" |

---

## 8. 测试策略

### 8.1 单元测试

| 文件 | 覆盖 |
|------|------|
| `parse-slides.test.js` | content.json → slide specs, 单页简写, 字段验证 |
| `theme-mapper.test.js` | CSS 解析, 变量合并, 单位换算, 边界值 |
| `generator-a.test.js` | A 方案生成 PptxGenJS 调用, mock API 验证参数 |
| `generator-c.test.js` | C 方案 HTML 模板渲染, 模拟 getComputedStyle 返回值 |

### 8.2 集成测试

`render-pipeline.test.js`: 跑完整 content.json → .pptx 流程，验证：
- 文件存在且能打开 (PPTX 是合法 zip)
- 文件大小 > 10KB（避免空内容）
- 解析 .pptx 内部 XML, 验证 slide 数量 == content.json slides 数量

### 8.3 视觉 baseline

7 张 PNG（每种 layout × 1 个默认主题）：
- cover-minimalist.png
- section-warm-handdrawn.png
- content-editorial.png
- two-column-tech-modern.png
- data-dark-gold.png
- quote-magazine-cover.png
- summary-minimalist.png

测试时启动 Playwright 打开 .pptx → 导出每张 slide 为 PNG → 与 baseline 对比（pixel diff < 5%）。

### 8.4 目标覆盖率

- 单元测试 ≥ 80% 行覆盖
- 所有 7 种 layout 至少 1 个 fixture + 1 个 baseline
- A 方案和 C 方案各 1 个失败用例 (C 方案 fallback)

---

## 9. 依赖

**根 `package.json` 共享**（与 `yuanfang-html-image` 同一份）：

- `pptxgenjs@^4.0.0`（新增，pptx 写盘）
- `playwright@^1.40.0`（已有，C 方案渲染用）
- `node-vibrant@^4.0.0`（已有，A 方案品牌色提取）
- `sharp@^0.34.5`（已有，logo/QR 处理）

**`package.json` scripts 更新**：

```json
{
  "scripts": {
    "test": "node --test 'yuanfang-design/tests/*.test.js' 'yuanfang-html-image/tests/*.test.js' 'yuanfang-html-ppt/tests/unit/*.test.js' 'yuanfang-html-ppt/tests/integration/*.test.js'",
    "render": "node yuanfang-html-image/scripts/render.js",
    "ppt": "node yuanfang-html-ppt/scripts/render.js",
    "showcase": "node yuanfang-design/showcase/generate.js"
  }
}
```

**根 `README.md` 更新**：在已安装的 skill 列表中新增 `yuanfang-html-ppt/`，并加 symlink 命令。

---

## 10. 风险与决策记录

### 10.1 决策

| 决策 | 选项 | 理由 |
|------|------|------|
| 渲染方案 | A+C 混合 | 纯 A 样式表达受限, 纯 C 复杂页慢 |
| C 方案浏览器 | Playwright headless | 项目已有依赖, jsdom CSS 支持差 |
| 主题映射 | 复制到 yuanfang-design 加映射层 | 不污染 design 库, 单一职责 |
| 布局文件位置 | yuanfang-html-ppt/templates/ | 与 html-image 的 templates/ 同名但不同用途 |
| content.json | 扩展为多页 + 单页简写 | 平滑迁移 |
| 比例 | 16:9 默认 | 主流, 4-3 留作未来 |

### 10.2 风险

| 风险 | 缓解 |
|------|------|
| Playwright 启动慢 (1-3s) | 全局复用 browser, 仅 1 次启动 |
| C 方案 CSS 计算不全 (e.g. CSS Grid 部分属性) | 降级为 jsdom 静态布局估算 |
| PptxGenJS API 与 PPTX 原生语义差异 | 已知限制, 文档标注不支持的特性 |
| 大字体 / 极端字号溢出 slide 边界 | 渲染后检查, 溢出时缩字号 |
| yuanfang-design 主题变化导致 PPTX baseline 失效 | baseline 与主题版本绑定, 更新主题时同步重生成 |

---

## 11. 验收标准

- [ ] 7 种 layout 全部可用, 各自有 fixture + baseline
- [ ] `npm test` 通过, 覆盖率 ≥ 80%
- [ ] `node scripts/render.js --file tests/fixtures/content-content.json --theme minimalist --brand minimalist` 成功输出 .pptx
- [ ] 输出 .pptx 在 PowerPoint / Keynote / Google Slides 中可打开
- [ ] 输出 .pptx 文字可二次编辑 (不输出为位图)
- [ ] SKILL.md 含完整 Step 0-4 工作流
- [ ] README.md 更新, 新增 yuanfang-html-ppt 安装说明
- [ ] 硬闸门在缺 theme/brand/layout 时拒绝
- [ ] Playwright 缺失时降级 A 方案, 给出警告
- [ ] 跨平台 (OpenCode / Claude Code / Codex) symlink 安装可用

---

**下一步:** 写实现计划到 `docs/superpowers/plans/2026-06-07-yuanfang-html-ppt-implementation.md`，按 plan 顺序执行实现 + 测试。

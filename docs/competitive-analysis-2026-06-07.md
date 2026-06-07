# yuanfang-html-ppt 竞争分析报告

**日期:** 2026-06-07
**状态:** 研究完成, 优化实施中
**研究者:** Sisyphus + 2 librarian + 2 explore agents (并行调研)

---

## 0. 摘要 (TL;DR)

| 项目 | 用户 | 输出 | 引擎 | 主题/布局 | 我们的位置 |
|------|------|------|------|----------|----------|
| **dtyq/magic html2pptx** (4.9k⭐) | Browser SDK | .pptx (可编辑) | iframe + getComputedStyle | 无 | 技术参考 (5 阶段 pipeline, IR 层, z-order 堆叠) |
| **lewislulu/html-ppt-skill** (5.6k⭐) | 静态 HTML | HTML+PNG | Vanilla JS + Chart.js | **36 主题 + 31 布局 + 47 动画** | 视觉质量 + token 系统的参考 |
| **PptxGenJS** (MIT) | Node 库 | .pptx | - | - | 我们用的核心 |
| **yuanfang-html-ppt** (本项目) | AI agent | .pptx (可编辑) | PptxGenJS API | 12 主题 + 7 布局 | **3 象限都没有, 我们是 unique** |

**关键市场验证:** lewislulu 社区 open issue #4 — *"Feature Request: 配套 PPTX 导出工具 html-to-pptx"* — 正是我们在做的。

---

## 1. dtyq/magic html2pptx 深度分析

**Repo:** https://github.com/dtyq/magic (4.9k⭐, 529 forks, 2022 commits)
**子包:** `@magic-web/html2pptx` v0.1.0 @ `frontend/magic-web/packages/html2pptx/`
**License:** Package MIT; 父项目是定制 "Magic OSL" (Apache + 限制)
**LOC:** 6,505 行 TypeScript (38 个文件)
**无 release tag** — 只在 `master`

### 1.1 架构 (核心)

5 阶段 pipeline:
```
sandbox.render(html)          // 隐藏 iframe + 动画冻结
  ↓
materializePseudoIcons        // FontAwesome 等图标转为 <img>
  ↓
collectElements → ElementNode[]
  ↓
filterRenderable + sortByZOrder  // 堆叠上下文路径
  ↓
transformElements → PPTNode[]  // 一元素 → 多 PPT 节点 (背景/边框/文字)
  ↓
drawAll → pptxgenjs calls
```

### 1.2 关键技术 (要学习的)

| 技术 | 来源 | 价值 |
|------|------|------|
| **PPTNode IR 层** | `transform/elementToNode.ts` | 解耦 DOM 与 pptxgenjs, 支持新节点类型, 多输出格式 (PDF/Keynote) |
| **堆叠上下文路径排序** | `filter/sortByZOrder.ts:78-116` | z-order 是 #1 容易错的设计点 |
| **每 Text Node → 每 textbox** | `parsers/text/layout.ts` | `<span><b>粗</b> 细</span>` 拆成 2 个 textbox |
| **Range API 二分查找** | `parsers/text/layout.ts:51-82` | O(K·logN) 测量 vs O(N) naive |
| **动画冻结 CSS 注入** | `createSandbox.ts:114-132` | 捕获最终帧 |
| **CSS 阴影 → PPT 极坐标** | `parsers/parseShadow.ts:146-162` | rgba alpha 0-1 vs PPT transparency 0-100 正确转换 |
| **Web Worker 媒体 base64** | `workers/media.ts` | 视频/音频不阻塞主线程 |
| **伪图标 materialize→render→restore** | `utils/icon.ts:88-322` | Font Awesome 干净捕获 |
| **fragile layout 拆分** | `parsers/parseShape.ts:228-280` | 文字换行时拆成多个 rect |

### 1.3 关键技术 (不学的)

| 不学 | 原因 |
|------|------|
| **打 pptxgenjs dist 的 patch** | 每次升级 pptxgenjs 都坏。改用 upstream PR 或自生成 XML |
| **14 条 FONT_MAPPING 硬编码** | 不国际化, 不扩展 |
| **多 gradient → 静默 PNG 退化** | 应至少 warning, 让用户知情 |
| **隐藏 iframe only** | 仅浏览器; CLI/Node 场景需 Playwright |
| **Magic OSL license** | 用 MIT 或 Apache 2.0 |
| **@zumer/snapdom for SVG/Canvas** | 用 resvg-js (Rust) 更快 |

### 1.4 已知弱点 (我们可超越)

1. **无 chart** — PptxGenJS 支持, 但 html2pptx 不解析
2. **无 Grid layout** — 静默当 flow 处理
3. **打 patch** — 升级即坏
4. **多 gradient 静默退化** — 不可编辑, 无警告
5. **FONT_MAPPING 太窄** — 日韩映射错

---

## 2. lewislulu/html-ppt-skill 深度分析

**Repo:** https://github.com/lewislulu/html-ppt-skill (5.6k⭐, 529 forks)
**HEAD:** f3a8435 (2026-04-26)
**License:** MIT
**LOC:** 226 files (HTML 52.5%, CSS 29.3%, JS 17.5%)
**Single-maintainer (lewis), 7 周历史, 6+ 周前最后提交, 1 个 merged PR**
**Open issue #4:** "Feature Request: 配套 PPTX 导出工具 html-to-pptx" — **直接市场验证**

### 2.1 架构

零构建, 纯静态, 单 `runtime.js` (960 行) + 36 主题 CSS + 31 布局 HTML + 47 动画

### 2.2 主题系统 (36 主题)

每个主题 = **1 个 ~18 行 CSS 文件** 重写 `:root` block:
```css
:root{
  --bg:#1a1b26; --text:#c0caf5; --accent:#7aa2f7;
  --grad:linear-gradient(135deg,#7aa2f7,#bb9af7);
  --font-sans:'Inter','Noto Sans SC',sans-serif;
  --radius:12px; --shadow:0 10px 30px rgba(0,0,0,.45);
}
```

切换: `<link id="theme-link" href="../assets/themes/aurora.css">` 或 `T` 键循环

**创新:** 36 主题总代码量 = 641 行 + base.css 150 行 = **~800 行**。极致 token 化。

### 2.3 布局系统 (31 布局)

每个布局 = **1 个独立单页 HTML 文件**, 包含完整样式, 可直接在 Chrome 打开。
使用 base.css 的 utility classes (`.grid.g4`, `.card`, `.pill`).

### 2.4 动画系统 (47)

- **27 CSS 动画** = `.anim-fade-up`, `.anim-stagger-list` 等
- **20 Canvas FX** = `knowledge-graph`, `constellation`, `data-stream` 等 (IIFE, `window.HPX[name]`)
- 共享 `_util.js`: `canvas()`, `loop()`, `palette()` (读 CSS 变量)
- 每 FX 都自动随主题变色

### 2.5 Charts

**Chart.js 4.4.3 via CDN**, 通过 `getComputedStyle` 读 theme 变量 — 主题切换 chart 自动跟随。

### 2.6 弱点 (我们的机会)

1. **无 .pptx 输出** — 社区 issue #4 直接求
2. **Single-maintainer bus-factor = 1**
3. **无编辑器 / WYSIWYG** — 必须编辑 HTML
4. **macOS-only render.sh** — 硬编码 Chrome 路径
5. **16:9 硬编码** — 无 aspect ratio token
6. **无 mobile 触控** — 只支持键盘
7. **无 programmatic API** — agent 只能 copy-paste

### 2.7 要学的

| 技术 | 价值 |
|------|------|
| **`:root` token override 模式** | 36 主题 = ~800 行, 可直接映射到 PptxGenJS 主题生成 |
| **3 黄金规则 (逐字稿)** | 演讲者脚本方法论 |
| **BroadcastChannel + postMessage 双窗口同步** | 未来 live presenter 配套应用架构 |
| **anim-stagger-list 一类级联** | 极简微工具 |
| **Chart.js + getComputedStyle 主题继承** | 主题感知 3rd-party 库范式 |
| **iframe-isolated showcase** | 营销模式 (每个截图是真实渲染) |
| **data-themes + T 键循环** | 用户喜欢的 live demo 特性 |

### 2.8 不要学的

| 不学 | 原因 |
|------|------|
| **macOS-only render.sh** | 用 puppeteer/playwright 跨平台 |
| **单 bus-factor 模式** | 结构化贡献, 接受 PR |
| **copy-paste HTML 模式** | 我们优势是自动化 |
| **硬编码 16:9** | content.json 接受 `aspectRatio` |
| **手画 diagram** | 接受 diagram 数据, 用 Mermaid/ECharts |
| **150-300 字逐字稿黄金规则** | 仅对演讲场景适用, 不进 schema |

---

## 3. 我们自己的审计 (26 个 finding)

### 3.1 P0 (6 个) — 必须修

| # | 描述 | 文件 |
|---|------|------|
| **F1** | `--theme` 和 `--brand` CLI flag 完全被忽略 (README 示例产生 editorial deck, 不是 minimal-white) | render.js:48-67 |
| **F2** | 4-3 平台 overflow (所有 14 处 hardcoded 13.333, 负宽度) | generator-a.js, generator-c.js |
| **F3** | 4 个 HTML 模板是死代码 (从未读取) | templates/*.html |
| **F4** | `logo` 字段解析但从未使用 (mock 有 addImage 但生产无 caller) | parse-slides.js:34 |
| **F5** | `extract-brand.js` / `brand-css.js` symlink 死 (brand-css.js 目标不存在) | scripts/ |
| **F6** | 多页测试不验证 slide count (只查 size > 50KB) | test-render-pipeline.test.js:28-36 |

### 3.2 P1 (11 个) — 应该修

F7: README 示例与 fixture 主题不一致  
F8: `pres.company = content.author` 错 (应 author → `pres.author`, company 单独)  
F9: loadTheme 错的主题名静默 fallback (无 warning)  
F10: 空 metrics 的 data 布局静默产生空白页  
F11: hardcoded 13.333 14 处, 应有 SLIDE_W 常量  
F12: 魔术数字 2.0/3.6/6.5 (cover 位置), 应表达为分数  
F13: A+C 拆分是虚构的, 两条路径都是直 PptxGenJS  
F14: parseSlides 不按 layout 验证必填字段  
F15: SKILL.md 把 A+C 描述成不同引擎 (误导)  
F16: hard gate 不验证主题存在  
F17: visual-baselines/ 空 (spec 要求 7 PNG)

### 3.3 P2 (9 个) — nice-to-have

F18: 无 speaker notes  
F19: 无 slide number / footer  
F20: 无 chart / table / image-insertion  
F21: 无 background image per slide  
F22: 无 per-slide theme override  
F23: '谢谢 · Thank You' 硬编码  
F24: 4 个 `build*FromTemplate` 无单元测试  
F25: integration test 启动 8 个 Node 子进程 (~640ms)  
F26: 无 `--help` flag  
F27: fixtures 内容单薄 (除 data 外都是 3 项)  
F28: 警告消息格式不一致 (emoji + ASCII)  
F29: README install 引用错 fixture

### 3.4 Pattern A: slide 维度硬编码

**修复杠杆最高**: 把 13.333 / 7.5 提到 render.js 的 `dims` 对象, 传给所有 generator。一次改完, 防止未来新 layout 再翻车。

### 3.5 Pattern B: spec vs 实现漂移

设计 spec section 2.2 / plan Tasks 9-11 描述 Playwright C 方案。实现是手写 PptxGenJS。
**决策点:** commit to spec (~4h) 或 update spec + delete dead templates (~10min)。

---

## 4. yuanfang-design 集成问题 (B.x)

### 4.1 28 个 token 消费情况

| Token | image (代码) | ppt (代码) | 一致性 |
|-------|------------|------------|-------|
| `--bg`, `--text`, `--accent`, `--secondary`, `--bg-alt` | 视觉 inline | ✓ | OK |
| `--font-title`, `--font-body` | 视觉 | ✓ | OK |
| `--title-size-w` (16:9) | 视觉 | → `sizeH1` | **不一致语义** |
| `--title-size-s` (1:1) | 视觉 | → `sizeH2` | **不一致** |
| `--title-size-c` (2.35:1) | 视觉 | → `sizeH3` | **不一致** |
| `--title-size-v` (9:16) | 视觉 | **未用** | 未来需 |
| `--content-size` | 视觉 | → `sizeBase` | OK (rename) |
| `--source-size` | 视觉 | → `sizeSm` | OK (rename) |
| `--badge-size` | 视觉 | **未用** | 未来需 |
| `--space-1` (8px) | 视觉 | **未用** | 需 |
| `--space-2` (16px) | 视觉 | → `spacing` | OK (only one used) |
| `--space-3` (24px) | 视觉 | **未用** | 需 |
| `--space-4` (48px) | 视觉 | **未用** | 需 |
| `--radius` | 视觉 | → `rectRadius` | OK |
| `--shadow` | 视觉 | **未消费** (映射了, 不用) | 死代码 |
| `--decor-tl/tr/bl/br` | 视觉 | **未用** | 4 tokens 忽略 |
| `--accent-line` | 视觉 | **未用** | 需 |
| `--accent-block` | 视觉 | **未用** | 需 |
| `--terminal-bar` | 视觉 | **未用** | 需 |
| `--grid-bg` | 视觉 | **未用** | 需 |
| `--seal` | 视觉 + 读 | **未用** | **唯一 text token 忽略** |
| `--cover-pad-right`, `--cover-center`, `--qr-size` (per-theme) | 视觉 | **未用** | per-theme aux |

### 4.2 P0 集成问题

| 编号 | 描述 |
|------|------|
| **B.1** | `--seal` token 唯一文本 token, 主题 `eastern` 用了, 但 PPT 忽略 |
| **B.2** | `--shadow` 映射但未消费 (theme-mapper.js:42 死代码) |
| **B.3** | **品牌色 override 在 PPT 完全没实现** — brand-css.js symlink 目标不存在 |

### 4.3 P1 集成问题

| 编号 | 描述 |
|------|------|
| **B.4** | 5 个 feature flags (--accent-line/--accent-block/--terminal-bar/--grid-bg) 完全忽略 — 这正是 dark-gold, tech-modern, bold-poster 等的视觉签名 |
| **B.5** | 4 个 decor tokens 忽略 — 4 角装饰 |
| **B.6** | 3 个 space tokens 忽略 — spacing scale 不完整 |

### 4.4 共享代码

两边消费者都做:
- design dir 解析
- base.css 加载
- theme.css 加载
- (image 端) 品牌色 override
- (ppt 端) **未实现** 品牌色 override

**提案:** `yuanfang-design/scripts/design-loader.js` 共享 `loadTokens(themeName, designDir)`, `listThemes(designDir)`, `buildBrandOverrideCss(themeName, spec)`, `resolveDesignDir(consumerDir)`。

### 4.5 主题测试覆盖

- 12 主题定义, 12 主题可加载
- fixtures 测试了 6 个主题: minimal-white, dark-gold, editorial, warm-handdrawn, tech-modern, magazine-cover
- **未测试 4 个:** minimal-white-editorial, list-ranking, data-infographic, split-screen, bold-poster (实际是 5 个)

---

## 5. 我们的独特位置 (Strategic Differentiation)

| 维度 | dtyq/magic | lewislulu | **yuanfang-html-ppt** |
|------|-----------|-----------|---------------------|
| 输出格式 | PPTX | HTML+PNG | **PPTX** |
| 可编辑文字 | ✅ | ❌ (位图) | ✅ |
| 程序化 (content.json) | 部分 | ❌ | ✅ |
| 主题/布局丰富度 | 低 (依赖 HTML) | **高 (36/31/47)** | 中 (12/7/0) |
| 浏览器依赖 | 必须 | 必须 | **不需要** (Node) |
| 真实 SVG/Canvas/Video 支持 | ✅ (iframe) | ✅ (Chrome) | ❌ (PptxGenJS 限制) |
| 演讲者脚本 | ❌ | ✅ (best in class) | ❌ (notes 待加) |
| 主题感知 Chart | ❌ | ✅ (Chart.js) | ❌ (待加) |
| 品牌色 override | ❌ | ❌ | **待加 (P0 fix)** |
| 维护健康 | 活跃 | 单 maintainer, 停滞 | 早期但活跃 |
| License | 定制 OSL | MIT | MIT |

**核心差异化:**
1. **PPTX 输出** (vs lewislulu 的 HTML)
2. **程序化** (vs lewislulu 的 copy-paste)
3. **Node CLI** (vs dtyq/magic 的 browser-only)
4. **token 系统统一** (yuanfang-design 12 主题 = 视觉签名, 而 dtyq/magic 无)

---

## 6. 优化优先级 (立即实施)

### Phase 1: 修 P0 (1 天)
- F1: CLI flag 接通 loadTheme/extractBrand
- F2+F11: dims 常量化, plumb 到 generators
- F3: 删除 4 个 dead HTML 模板 (决策: 不实现真 C 方案, 改 spec)
- F4: cover slide 加 logo image
- F5: 修 brand-css.js 死 symlink, 实现品牌色 override
- F6: 多页测试验证 slide count

### Phase 2: 修 P0 设计系统 (1 天)
- B.1: --seal 在 cover 显示
- B.2: --shadow 在 cards 使用
- B.3: 品牌色 override

### Phase 3: P1 token 扩展 (半天)
- B.4: 5 feature flags 应用
- B.5: 4 decor tokens 应用
- B.6: 3 space tokens 暴露

### Phase 4: P1 杂项 (半天)
- F7, F8, F9, F10, F14, F16

### Phase 5: P2 (单独 PR)
- F18 speaker notes (PptxGenJS 支持)
- F19 slide numbers
- F20 charts/tables (新 layout)

---

## 7. 决策记录 (本次研究中确定)

1. **不实现 dtyq/magic 的 C 方案** (Playwright + getComputedStyle) — 复杂度高, 收益小 (yuanfang-design 的 12 主题已足够差异化, 完整 CSS 还原不是差异化要素)。改用 PptxGenJS 风格化布局 + token 映射。
2. **删除 4 个 HTML 模板** — 死代码, 误导。
3. **品牌色 override 必须实现** — yuanfang-skills 项目的核心特性 (品牌管线), PPT 不支持 = 缺失核心。
4. **多页测试改用 zip 解析验证 slide count** — 比 size 阈值更可靠。
5. **共享 design loader** (yuanfang-design/scripts/design-loader.js) — 减少两边重复代码。

---

## 8. 来源 (所有 permalink)

### dtyq/magic
- Repo: https://github.com/dtyq/magic @ 786a007
- html2pptx package: https://github.com/dtyq/magic/tree/786a007/frontend/magic-web/packages/html2pptx
- Pipeline entry: src/index.ts:35-42
- Hidden iframe: src/renderer/createSandbox.ts:48-76
- Z-order: src/filter/sortByZOrder.ts:78-116
- Element→PPTNode: src/transform/elementToNode.ts:33-115
- Text layout: src/parsers/text/layout.ts:51-82
- pptxgenjs patch: frontend/magic-web/patches/pptxgenjs.patch

### lewislulu/html-ppt-skill
- Repo: https://github.com/lewislulu/html-ppt-skill @ f3a8435
- Base tokens: assets/base.css:3-33
- Theme example: assets/themes/tokyo-night.css
- KPI grid layout: templates/single-page/kpi-grid.html
- Runtime: assets/runtime.js (960 lines)
- Animations: assets/animations/animations.css (138 lines, 27 anims)
- FX module: assets/animations/fx/knowledge-graph.js
- Issue #4 (PPTX export demand): https://github.com/lewislulu/html-ppt-skill/issues/4

### yuanfang-skills (我们)
- 12 themes: yuanfang-design/themes/
- base.css tokens: yuanfang-design/base.css:1-50
- PPT render: yuanfang-html-ppt/scripts/render.js
- Theme mapper: yuanfang-html-ppt/scripts/theme-mapper.js
- Image brand pipeline: yuanfang-html-image/scripts/extract-brand.js (258 lines)

---

**下一步:** 按 Phase 1-5 优先级执行, 每个 phase 后跑 `npm test` 验证 154+ 测试不破。

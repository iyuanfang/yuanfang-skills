# yuanfang-html-ppt — AI 引导的 PPTX 生成 skill

> **目标**: 把一段结构化的 `content.json` 转成编辑性友好的 .pptx 文件。
> **支持 7 种布局**: cover, section, content, two-column, data, quote, summary
> **引擎**: PptxGenJS 4.0+ 直接 API — 所有布局都用 PptxGenJS 风格化 shape/text/image 调用
> **依赖**: yuanfang-design (12 主题 + base.css tokens), node-vibrant (备用品牌色提取)

## 何时使用本 skill

- 用户需要从结构化内容生成 .pptx (PowerPoint) 文件
- 用户希望 PPT 文字可二次编辑 (不输出为位图)
- 用户希望使用 yuanfang-design 12 个主题样式
- 用户希望应用品牌色 (--brand-spec override)

## 工作流 (Step 0-4)

### Step 0: 收集内容 (content.json)

必填字段:
- `brand`: 品牌名 (用于品牌色 override 查找)
- `theme`: 12 个主题之一 (见下方列表)
- `slides[]` 或单页 `layout`: 7 种布局之一

#### 7 种布局速查

| 布局 | 用途 | 关键字段 | 必填 |
|------|------|---------|------|
| `cover` | 封面 | title, subtitle, author, date, logo | title |
| `section` | 章节分割 | title | title |
| `content` | 标题+要点 | title, points[] (或 body) | title |
| `two-column` | 双栏对比 | title, leftTitle, leftPoints, rightTitle, rightPoints | title + leftPoints + rightPoints |
| `data` | KPI 网格 | title, metrics[{label,value,change}] | title + metrics (非空) |
| `quote` | 客户引用 | title, quote, attribution | title + quote + attribution |
| `summary` | 结尾/下一步 | title, points[], closing (可选) | title |

#### content.json 完整示例 (多页模式)

```json
{
  "brand": "acme-corp",
  "theme": "minimal-white",
  "title": "Q3 路线图",
  "author": "产品团队",
  "company": "Acme Corp",
  "date": "2026-06-07",
  "logo": "./assets/acme-logo.png",
  "slides": [
    { "layout": "cover", "title": "Q3 路线图", "subtitle": "下半年规划" },
    { "layout": "section", "title": "战略方向" },
    { "layout": "content", "title": "核心目标", "points": ["增长 +30%", "上线 5 个新功能"] },
    { "layout": "two-column", "title": "竞品对比",
      "leftTitle": "我们", "leftPoints": ["开源", "可定制"],
      "rightTitle": "竞品", "rightPoints": ["闭源", "标准化"] },
    { "layout": "data", "title": "关键指标",
      "metrics": [{ "label": "MAU", "value": "120 万", "change": "+15%" }] },
    { "layout": "quote", "title": "客户评价",
      "quote": "改变工作方式", "attribution": "张伟, CTO" },
    { "layout": "summary", "title": "下一步", "points": ["7 月内测", "8 月公测", "9 月上线"],
      "closing": "Q&A" }
  ]
}
```

单页简写示例 (单页, 等价于上面 1 张 slide):
```json
{
  "brand": "acme-corp",
  "theme": "minimal-white",
  "layout": "content",
  "title": "Hello",
  "points": ["a", "b"]
}
```

### Step 1: 主题选择 (列出 12 个)

可用主题 (来自 `yuanfang-design/themes/`):
- `minimal-white`, `minimal-white-editorial`
- `dark-gold`
- `editorial`
- `warm-handdrawn`
- `tech-modern`
- `bold-poster`
- `data-infographic`
- `eastern` (含中文"远"字印章 --seal)
- `magazine-cover`
- `split-screen`
- `list-ranking`

向用户询问: "请从 12 个主题中选一个, 或使用 minimal-white (默认)"

### Step 2: 用户确认 (5 项硬闸门)

依次确认:
1. ✅ 内容确认 — content.json 字段完整
2. ✅ 主题确认 — theme 已选 (12 主题之一, 错名报错并列出可用)
3. ✅ 品牌确认 — brand 名 (或品牌色十六进制)
4. ✅ 布局确认 — 7 种 layout 之一
5. ✅ 媒体确认 — logo 文件存在 (如使用)

任一项未确认, render.js 拒绝执行。

### Step 3: 渲染

```bash
node yuanfang-html-ppt/scripts/render.js \
  --file content.json \
  --output deck.pptx \
  --platforms macos
```

**简化版** (使用 content.json 里的 theme/brand/logo):

| Flag | 必填 | 默认 | 说明 |
|------|------|------|------|
| `--file` | ✅ | - | content.json 路径 |
| `--output` | ❌ | `output.pptx` | 输出路径 |
| `--platforms` | ❌ | `macos` | macos / windows / widescreen / 4-3 |
| `--skip-confirm` | ❌ | false | 跳过 Step 2 5 项确认 (仅 CLI 自动化用) |
| `--help, -h` | ❌ | - | 显示帮助 |

**高级版** (覆盖 content.json):

| Flag | 说明 |
|------|------|
| `--theme <name>` | 覆盖 content.json 的 theme |
| `--brand <name>` | 覆盖 content.json 的 brand |
| `--logo <path>` | 覆盖 content.json 的 logo |
| `--brand-spec <path>` | 品牌色 override JSON (含 `primary` 或 `colors.primary` 字段) |

例: 用外部品牌色 spec 覆盖 theme accent:
```bash
node yuanfang-html-ppt/scripts/render.js \
  --file content.json --theme dark-gold \
  --brand-spec ./brand-spec.json \
  --skip-confirm --output deck.pptx
```

`brand-spec.json`:
```json
{
  "primary": "#ff5500",
  "secondary": "#003366"
}
```

### Step 4: 输出验证

1. 检查 .pptx 文件存在 (size > 5KB)
2. PowerPoint / Keynote / Google Slides 打开验证
3. 文字可二次编辑 (不应是位图)
4. 验证页数: `unzip -l deck.pptx | grep slides/slide` 应列出与 content.json `slides` 数量相等的 slideN.xml

## 主题特征

每个主题的视觉签名由 yuanfang-design token 控制。本 skill 消费的关键 token:

| Token | PPT 效果 |
|-------|---------|
| `--bg` / `--text` / `--accent` / `--secondary` | 主色/底色/强调/副强调 |
| `--bg-alt` | 卡片背景 (two-column, data) |
| `--font-title` / `--font-body` | 标题/正文字体 |
| `--title-size-w` | 大标题字号 (16:9 默认) |
| `--content-size` / `--source-size` | 正文/小字 |
| `--space-1`...`--space-4` | 间距 4 档 (8/16/24/48 px) |
| `--radius` | 卡片圆角 |
| `--shadow` | 卡片阴影 (parsed from CSS → PptxGenJS ShadowProps) |
| `--seal` (eastern 主题) | 封面左上角圆形印章 |
| `--accent-line` (block) | 顶部 4pt 强调线 |
| `--accent-block` (block) | 右侧 15% 宽度色块 |
| `--terminal-bar` (flex, tech-modern) | 顶部三圆点红黄绿 (终端风) |
| `--decor-tl/tr/bl/br` | 4 角装饰 (bold-poster 等) |

## 已知限制

- 暂无 chart / 流程图布局
- 暂无 PPTX 母版视图 (slide master)
- 暂无播放模式 (speaker notes 暂留空)
- 4-3 比例仅支持 10×7.5 inch, 不支持其他比例
- `--grid-bg` 和 `--decor-tl/tr/bl/br` 在 cover 之外的布局暂未应用 (后续迭代)

## 与 yuanfang-html-image 的区别

| 维度 | html-image | html-ppt |
|------|-----------|----------|
| 输出 | PNG/JPG 图片 | PPTX |
| 引擎 | Playwright 截图 | PptxGenJS API |
| 文字可编辑 | ❌ | ✅ |
| 主题数 | 12 | 12 (共享) |
| 布局数 | 1 (cover) | 7 |
| 品牌管线 | extract-brand.js (258 行) | brand-override.js (55 行, override only) |
| CLI 标志 | `--platforms` = 比例 | `--platforms` = PPTX 比例 |

## 文档

- Spec: `docs/superpowers/specs/2026-06-07-yuanfang-html-ppt-design.md`
- Plan: `docs/superpowers/plans/2026-06-07-yuanfang-html-ppt-implementation.md`
- 竞争分析: `docs/competitive-analysis-2026-06-07.md`

# yuanfang-html-ppt — AI 引导的 PPTX 生成 skill

> **目标**: 把一段结构化的 `content.json` 转成编辑性友好的 .pptx 文件。
> **支持 7 种布局**: cover, section, content, two-column, data, quote, summary
> **引擎**: A+C 混合 — 简单页用 PptxGenJS API 直接调用, 复杂页用 PptxGenJS 风格化布局
> **依赖**: yuanfang-design (12 主题), yuanfang-html-image (品牌管线)

## 何时使用本 skill

- 用户需要从结构化内容生成 .pptx (PowerPoint) 文件
- 用户希望 PPT 文字可二次编辑 (不输出为位图)
- 用户希望使用 yuanfang-design 12 个主题样式

## 工作流 (Step 0-4)

### Step 0: 收集内容 (content.json)

必填字段:
- `brand`: 品牌名 (触发 brand-color 管线)
- `theme`: 12 个主题之一 (见下方列表)
- `slides[]` 或单页 `layout`: 7 种布局之一

#### 7 种布局速查

| 布局 | 用途 | 关键字段 |
|------|------|---------|
| `cover` | 封面 | title, subtitle, author, date |
| `section` | 章节分割 | title |
| `content` | 标题+要点 | title, points[] |
| `two-column` | 双栏对比 | title, leftTitle, leftPoints, rightTitle, rightPoints |
| `data` | KPI 网格 | title, metrics[{label,value,change}] |
| `quote` | 客户引用 | title, quote, attribution |
| `summary` | 结尾/下一步 | title, points[] |

#### content.json 完整示例 (多页模式)

```json
{
  "brand": "minimal-white",
  "theme": "minimal-white",
  "title": "Q3 路线图",
  "author": "产品团队",
  "date": "2026-06-07",
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
    { "layout": "summary", "title": "下一步", "points": ["7 月内测", "8 月公测", "9 月上线"] }
  ]
}
```

单页简写示例 (单页, 等价于上面 1 张 slide):
```json
{
  "brand": "minimal-white",
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
- `eastern`
- `magazine-cover`
- `split-screen`
- `list-ranking`

向用户询问: "请从 12 个主题中选一个, 或使用 minimal-white (默认)"

### Step 2: 用户确认 (5 项硬闸门)

依次确认:
1. ✅ 内容确认 — content.json 字段完整
2. ✅ 主题确认 — theme 已选
3. ✅ 品牌确认 — brand 名 (或品牌色十六进制)
4. ✅ 布局确认 — 7 种 layout 之一
5. ✅ 媒体确认 — logo 文件存在 (如使用)

任一项未确认, render.js 拒绝执行。

### Step 3: 渲染

```bash
node yuanfang-html-ppt/scripts/render.js \
  --file content.json \
  --theme minimal-white \
  --brand minimal-white \
  --output deck.pptx \
  --platforms macos
```

| Flag | 默认 | 说明 |
|------|------|------|
| `--file` | (必填) | content.json 路径 |
| `--theme` | (必填) | 12 主题名 |
| `--brand` | (必填) | 品牌名 |
| `--output` | `output.pptx` | 输出路径 |
| `--platforms` | `macos` | macos / windows / widescreen / 4-3 |
| `--skip-confirm` | false | 跳过 Step 2 5 项确认 (仅 CLI 自动化用) |

### Step 4: 输出验证

1. 检查 .pptx 文件存在 (size > 5KB)
2. PowerPoint / Keynote / Google Slides 打开验证
3. 文字可二次编辑 (不应是位图)

## 已知限制

- A 方案 (cover, content, summary) 文字完美可编辑, 样式受 PptxGenJS API 限制
- C 方案 (section, two-column, data, quote) 使用 PptxGenJS 风格化 API, 编辑性同样完美
- 4-3 比例仅支持 10×7.5 inch, 不支持其他比例
- 暂无 chart / 流程图布局
- 暂无 PPTX 母版视图 (slide master)
- 暂无播放模式 (speaker notes 暂留空)

## 与 yuanfang-html-image 的区别

| 维度 | html-image | html-ppt |
|------|-----------|----------|
| 输出 | PNG/JPG 图片 | PPTX |
| 引擎 | Playwright 截图 | PptxGenJS API |
| 文字可编辑 | ❌ | ✅ |
| 主题数 | 12 | 12 (共享) |
| 布局数 | 1 (cover) | 7 |
| 品牌管线 | 同 | 同 (symlink) |
| CLI 标志 | `--platforms` = 比例 | `--platforms` = PPTX 比例 |

## 设计文档

- Spec: `docs/superpowers/specs/2026-06-07-yuanfang-html-ppt-design.md`
- Plan: `docs/superpowers/plans/2026-06-07-yuanfang-html-ppt-implementation.md`

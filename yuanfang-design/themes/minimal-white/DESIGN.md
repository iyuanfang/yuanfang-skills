# minimal-white

**Default recipe.** 18 个主题里的锚点。Notion / Linear 风格的克制极简。

## 1. Visual Theme & Atmosphere
- 干净、克制、不浮夸
- 大量负空间，单焦点
- 数字信息流/工具/教程/SaaS 的首选

## 2. Color Palette & Roles
- `--bg: #FFFFFF` （纯白）
- `--text-1: #0F172A` （近黑）
- `--text-2: #64748B` （中灰，对比度 4.76:1，AA 通过）
- `--accent: #4F46E5` （indigo 默认，参数可覆盖）
- `--border: rgba(0,0,0,.08)`

## 3. Typography Rules
- title: system-ui, 900 weight, letter-spacing -0.03em
- body: PingFang SC 32px (1080×1440 portrait)
- 中文 fallback: system-ui → PingFang SC → Noto Sans CJK
- 标题行高 1.05，正文 1.7

## 4. Component Stylings
- `cover__title`: 黑色加粗
- `cover__content`: 灰色正文，max-width 88%
- `cover__points`: accent-container 圆角 pill（color-mix 15%）
- `cover__brand`: 左下角，letter-spacing 0.25em，灰
- 顶部 4px accent line + 右侧 24% accent block

## 5. Layout Principles
- 内容左对齐（mobile 居中）
- 顶部 4px accent line 横贯
- 右侧 24% 留给 accent block
- 文字区只占左侧 76%

## 6. Depth & Elevation
- 无投影（极简）
- 仅用 `var(--border)` 1px 分隔
- accent block 是唯一"色块"

## 7. Do
- 大段留白
- 单焦点（1 个大标题 + 1 段内容 + 1 行 brand）
- 数字用 indigo accent 标注
- 中文用 system-ui（PingFang fallback）

## 8. Don't
- 不用 emoji
- 不用渐变文字
- 不用 drop-shadow
- 不用饱和度 > 80% 的多色
- 不用 serif 字体（除非显式 --type serif）
- 不在小红书图里塞"扫码关注"等内容超载

## 9. Agent Prompt Guide
"读者场景：年轻人刷小红书看干货/工具/教程。
应有感觉：清爽、克制、不浮夸、像 Notion/Linear 的产品页。
适合：技术分享、工具介绍、教程类、个人品牌。
不适合：奢侈品、复古、潮牌、儿童内容。
禁忌：emoji、卡通图、彩虹渐变、感叹号堆砌。
参数建议：默认 indigo + sans + normal + bold。"

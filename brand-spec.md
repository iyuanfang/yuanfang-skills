# AICS · Brand Spec
> 生成日期：2026-06-05
> 提取来源：https://aics.financialagent.cc
> 适用范围：所有视觉输出（图片/PPT/网页/动画/视频）
> 生成方式：yuanfang-design extract-brand.js

---

## 🎯 品牌标识

### Logo
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="11" width="18" height="10" rx="2"/>
  <circle cx="12" cy="5" r="2"/>
  <path d="M12 7v4"/>
</svg>
```
- 图标：铃铛（通知/客服隐喻）
- 标准型：`[铃铛图标] AICS`
- 最小使用尺寸：图标 20px，文字 16px
- 禁用：拉伸、改色、加描边
- 来源：`/favicon.svg`

### 品牌名
- **AICS**
- 中文：AI 智能客服系统 / 智能客服平台
- Logo 字号：22px / 字重 700 / 颜色 #4F46E5

## 🎨 色板

### 主色系（可信 · 科技 · 专业）
| 用途 | 色值 | 色名 | 示例 |
|------|------|------|------|
| 主色 | `#4F46E5` | AICS Indigo | <span style="background:#4F46E5;width:24px;height:24px;display:inline-block;border-radius:4px"></span> |
| 主色深 | `#4338CA` | Indigo Dark | <span style="background:#4338CA;width:24px;height:24px;display:inline-block;border-radius:4px"></span> |
| 主色浅 | `#EEF2FF` | Indigo Light | <span style="background:#EEF2FF;width:24px;height:24px;display:inline-block;border-radius:4px"></span> |
| 主色发光 | `rgba(79,70,229,.15)` | Indigo Glow | — |

### 渐变色
- 标题渐变：`linear-gradient(135deg, #4F46E5 0%, #7C3AED 60%, #A855F7 100%)`
- Hero 背景：`linear-gradient(135deg, #EEF2FF, #E0E7FF, #C7D2FE)`

### 中性色系
| 用途 | 色值 | 色名 |
|------|------|------|
| 正文 | `#0F172A` | Slate 900 |
| 次要文字 | `#64748B` | Slate 500 |
| 背景（亮） | `#FFFFFF` | White |
| 背景（次要） | `#F8FAFC` | Slate 50 |
| 边框 | `#E2E8F0` | Slate 200 |

> 主色/背景对比度：**6.29:1** ✅ 符合 WCAG AA

## 🔤 字体

### 标题
- **Outfit**, -apple-system, BlinkMacSystemFont, sans-serif
- 字重：800 (ExtraBold) 用于 H1 / 700 (Bold) 用于 H2-H3
- 字距：-0.02em 到 -0.025em（大标题收紧）

### 正文
- **Outfit**, -apple-system, BlinkMacSystemFont, sans-serif
- 字重：400 (Regular) / 500 (Medium) 用于强调
- 行高：1.6（网站）/ 1.7-1.8（中文阅读）
- 字号：16px

### 标注/标签
- 同正文字体
- 字重：600 (SemiBold)
- 字距：0.3px（小写字母）/ 0.12em-0.25em（中文宽字距）

### 字号层级
| 层级 | 网站字号 | 海报字号 |
|------|---------|---------|
| H1 | 52px | 110-140px |
| H2 | 36px | 66-86px |
| H3 | 22px | — |
| 正文 | 16px | 34-38px |
| 小字 | 13-14px | 12-16px |

## 📐 间距系统

### 基础单元
基于提取分析：**4px 基础单元**（常用 8 的倍数，允许 4 的倍数）

### 常用间距
`4 / 8 / 16 / 24 / 32 / 48 / 64 / 80 / 100 / 120`

### 安全边距
- 图片左右：48-64px（最小）
- 图片上下：48-64px（最小）
- PPT 边距：48px

## 📦 设计 Tokens

| Token | 值 |
|-------|------|
| `--primary` | `#4F46E5` |
| `--primary-dark` | `#4338CA` |
| `--primary-light` | `#EEF2FF` |
| `--primary-glow` | `rgba(79,70,229,.15)` |
| `--text` | `#0F172A` |
| `--text-secondary` | `#64748B` |
| `--bg` | `#FFFFFF` |
| `--bg-alt` | `#F8FAFC` |
| `--border` | `#E2E8F0` |
| `--max-width` | `1100px` |
| `--header-h` | `68px` |
| `--radius-sm` | `8px` |
| `--radius` | `12px` |
| `--radius-lg` | `20px` |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,.04)` |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,.06)` |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,.08)` |

## 🖼️ 输出格式

| 类型 | 尺寸 | 比例 | 生成方式 |
|------|------|------|---------|
| 竖版海报 | 1080×1440 | 3:4 | HTML → Playwright PNG |
| 方版 | 1080×1080 | 1:1 | HTML → Playwright PNG |
| 横版 | 1920×1080 | 16:9 | HTML → Playwright PNG |
| 封面 | 1800×766 | 2.35:1 | HTML → Playwright PNG |
| OG 卡片 | 1200×630 | 1.9:1 | HTML → Playwright PNG |
| PPT | 1920×1080 | 16:9 | HTML → html2pptx |
| 动画 | 1920×1080 | 16:9 | HTML → ffmpeg MP4 |
| 视频 | 1920×1080 | 16:9 | MP4 + BGM |

## 📋 设计原则

1. **8/4pt 网格** — 间距优先用 8 的倍数，4 仅用于极小间距
2. **3 级层级** — 标题 : 正文 : 标注 ≈ 10:3:1
3. **主色 Indigo** — `#4F46E5` 不可更换
4. **≤2 种字体** — Outfit 不同字重即可（英文）+ PingFang SC（中文回退）
5. **≥40% 留白** — 极简风格 ≥60%
6. **纯文字标签** — 不加框，用宽字距区分
7. **品牌锚点** — 每个输出右下角有品牌标识（图标+AICS）
8. **圆角系统** — 小 8px / 中 12px / 大 20px
9. **阴影系统** — 轻 sm / 中 md / 重 lg

---
name: yuanfang-content-gen
description: |
  给定主题/关键词，生成结构化多平台文案：通用 content.md → 每平台 copy.md + content.json。
  专注文案（persona / title formula / 合规 / 跨平台调性），**不出图**——出图调 yuanfang-image。
  相比手动写，省去重复复制粘贴 + 逐平台调语气的工作。
  当用户说"写内容"、"发哪个平台"、"小红书文案"、"内容创作"、"写一篇推广"时考虑使用此技能。
  想"全套出图"时配合 yuanfang-content-suite 或 yuanfang-image。
---

# yuanfang-content-gen — 多平台文案生成

## 职责边界

**做**：写 copy.md + content.json（多平台风格适配 + 合规校验 + 跨平台调性指南）
**不做**：出图、调 LLM API

出图调 [yuanfang-image](../yuanfang-image/SKILL.md) 或走 [yuanfang-content-suite](../yuanfang-content-suite/SKILL.md) 组合层。

## 依赖

| Skill | 用途 | 是否必装 |
|-------|------|---------|
| `yuanfang-design/` | 主题预览（schemas 引用其主题名） | 推荐 |
| `yuanfang-image/` | 出图（agent 自己调） | 出图时必装 |
| `yuanfang-content-suite/` | 组合层（agent 自己用） | 全流程时必装 |

**工作目录约定**：所有命令以**本 skill 所在目录**（`yuanfang-content-gen/`）为 cwd 执行。`output/` 写在本 skill 目录下，调用兄弟 skill 用 `../<brother-skill>/` 相对路径。

**品牌提取**：如果用户给了 URL 但没指定主色，可用

```bash
node scripts/extract-brand.js <url>
```

脚本返回 JSON 含 `brand_name` 和 `primary_color`（基于品牌名 hash 在 5 色调色板里推荐，**LLM 可建议用户覆盖**）。

---

## 工作流速览

```
用户给主题/关键词
    ↓
Step 0: LLM 生成 content.md（标题|核心信息|正文|要点|CTA|语气）
  → 展示给用户
  → ⬋ 等用户确认后才能继续
    ↓
Step 1: 用户修改 content.md
  → 可直接编辑 .md 文件
  → 也可用自然语言让 LLM 改
  → ⬋ 等用户确认终稿后才能继续
    ↓
Step 2: 自动化路径——`generate-copy.js` 造 prompt，agent 写 6 份 copy.md
    ↓
Step 3: 验证合规
    ↓
[可选] Step 4: 调 yuanfang-image 出图
```

---

## Step 0: 生成 content.md

**用户给一个主题/关键词，LLM 生成结构化 content.md，作为后续所有平台内容的事实源。**

### 输入方式

- **主题/关键词** — "AI 客服"、"618 大促"、"新产品发布"
- **URL** — 抓取页面后提取核心信息
- **已有内容** — "帮我改写这篇公众号文章"

### content.md 模板

```markdown
# {{标题}}

## 核心信息
{{一句话概括核心信息，不超过 20 字}}

## 正文
{{30-60 字，撑满画面的核心文案}}

## 要点
- {{要点 1，10-20 字}}
- {{要点 2，10-20 字}}
- {{要点 3，10-20 字}}

## CTA
{{行动号召，引导用户做什么}}

## 语气
{{轻松 / 专业 / 震撼 / 温暖 / 幽默 / 深度}}
```

---

## Step 1: 修改 content.md

用户可直接编辑 `.md` 文件，或用自然语言让 LLM 改。

反复迭代直到用户确认终稿。

---

## Step 2: 生成各平台文案

推荐自动化路径：`generate-copy.js`（agent-driven）。

**做**：打印 system+user prompt → agent 用 host LLM 写 copy.md → 验证合规
**不做**：出图

### 2.1 自动化路径（推荐）— `generate-copy.js` (agent-driven)

`scripts/generate-copy.js` 解析 content.md + 平台 schema，**打印 system+user prompt 给 agent 读**。agent 用自己的 LLM 写 JSON，agent 把 JSON 写成 copy.md，agent 跑 `validate-copy.js` 验证。**不需要任何外部 API key**——LLM 就是 agent 当前用的那个，零额外成本。

**两阶段：**

```bash
# 1) 打印 prompt
node scripts/generate-copy.js \
  --content content.md \
  --platforms xiaohongshu,wechat,toutiao,zhihu,moments,weibo-micro \
  --variants 1 \
  --print-prompts
```

agent 读每个平台的 `SYSTEM` + `USER` JSON，用 LLM 生成 1 个（或 N 个）JSON 响应，写成 `output/<session>/<platform>/copy.md`（第 2 份起 `copy_v2.md`、`copy_v3.md`）。

**badge 自动生成**：LLM 输出的 JSON 里有 `badge` 字段（4-10 字小字分类，prompt 已指导）。agent 写 `copy.md` frontmatter 时同步把 `badge:` 写进去；写 `content.json` 时也带上 `badge`，render.js 出图会填到 `{{BADGE}}` 模板槽（顶部 accent 色 + letter-spacing 显示）。

```bash
# 2) 验证每个 copy.md
node scripts/validate-copy.js output/<session>/xiaohongshu/copy.md
node scripts/validate-copy.js output/<session>/xiaohongshu/copy_v2.md
```

**A/B 变体**：每个平台 N 份，一次性打印 N 组 prompt。

```bash
node scripts/generate-copy.js --content content.md --platforms xiaohongshu --variants 3 --print-prompts
```

**默认（无 `--print-prompts`）**：打印工作流指引（哪几个 platform 目录、写哪里、跑哪个 validate）。

输出格式：

```
output/<session>/
├── 小红书/copy.md
├── 小红书/copy_v2.md          (--variants 2+)
├── 公众号/copy.md
└── ...
```

每份 copy.md 走 `validate-copy.js`：合规分 < 35 视为 fail；fail 时 exit code 1，便于 CI 拦截。

**主题自动推荐**：`generate-copy.js` 读 `content.md` 的 `## 语气` 段，匹配内置 tone→theme 映射，输出推荐列表。两种模式都打印：

```text
# Theme recommendation (from ## 语气 in content.md):
#   tone: 专业、克制、有理有据
#   match: 专业
#   themes: corporate-clean, minimal-white
# Pass to render.js: --theme corporate-clean
```

tone 关键词 → themes 映射：

| tone 关键词 | 推荐主题 |
|---|---|
| 专业 / 企业 | corporate-clean, minimal-white |
| 震撼 / 重磅 | dark-gold, bold-poster |
| 轻松 / 生活 / 温暖 / 幽默 | warm-handdrawn, catppuccin-latte |
| 科技 / 前沿 | tech-modern, tokyo-night |
| 深度 / 分析 | editorial, editorial-serif |
| 路演 / 融资 | pitch-deck-vc |
| 东方 | eastern, editorial |
| 数据 | data-infographic, editorial |
| 清单 | list-ranking, minimal-white |
| 杂志 | magazine-cover, editorial-serif |
| 对比 | split-screen, editorial |
| (无) / 未匹配 | minimal-white-editorial, minimal-white |

agent 拿推荐列表 → 写完 copy.md → 调 render.js 时直接用 `--theme <第一推荐>`。

**API 给程序用**：`require('./validate-copy')` 暴露 `validateCopyMd / scoreCompliance / loadSchema / parseFrontmatter`，agent 可在 Node 进程内直接调，不走 CLI。

**手工 path**（如果你想自己写）见 2.2。

### 2.2 手工路径 — 写平台文案 → copy.md

（保留原有手工路径——LLM 不在场时手动写）

---

## Step 3: 验证 copy.md（必须执行）

```bash
node scripts/validate-copy.js output/<session>/<平台>/copy.md
```

输出：合规分（前缀 `📊`）+ warning（`⚠`）/ error（`✗`）+ 命中词。

合规分 < 35 视为 fail，exit code 1。

---

## [可选] Step 4: 出图（调 yuanfang-image）

出图不是本 skill 的职责。加载 `yuanfang-image` SKILL.md，按它的指引跑 render.js。

```bash
# 一次性出 6 平台
for p in 小红书 公众号 头条 知乎 朋友圈 微头条; do
  node ../yuanfang-image/scripts/render.js \
    --file output/<session>/$p/content.json \
    --theme <推荐主题> --accent <品牌色> \
    --platforms <对应平台 ID> \
    --output output/<session>/$p/
done
```

完整流程请用 `yuanfang-content-suite`。

---

## 平台文案风格指南

### 小红书
- 标题 ≤ 20 字，1 emoji 必带
- 体感：闺蜜安利、可盐可甜
- persona 详见 `schemas/xiaohongshu.md`

### 公众号
- 标题 15-25 字，编辑式落款
- 体感：克制专业、有数据/案例
- persona 详见 `schemas/wechat.md`

### 头条文章
- 标题 18-28 字，数字优先
- 体感：资讯、36 氪短消息
- persona 详见 `schemas/toutiao.md`

### 微头条
- 140-300 字 + 互动钩子
- 体感：短评、观点、互动感
- persona 详见 `schemas/weibo-micro.md`

### 知乎
- 标题问题式（？结尾）
- 体感：从业者说、克制、承认局限
- persona 详见 `schemas/zhihu.md`

### 朋友圈
- 1-3 句，≤60 字，0 CTA
- 体感：日常、随手、用后感
- persona 详见 `schemas/moments.md`

---

## 与 yuanfang-image 的平台 ID 映射

| 本 skill platform | yuanfang-image platforms | 说明 |
|---|---|---|
| xiaohongshu | xiaohongshu-v + xiaohongshu-s | 竖版 + 方版 |
| wechat | wechat-cover | 公众号头图（900×383）|
| toutiao | toutiao | 头条（1080×500）|
| zhihu | zhihu-cover | 知乎封面（1200×630）|
| moments | moments | 朋友圈（1080×1080）|
| weibo-micro | weibo-micro | 微头条（1080×608）|

---

## content.md → content.json 映射

`generate-copy.js` 不直接产 content.json——agent 写完 copy.md 后，把数据搬到 `content.json` 给 render.js 用：

```json
{
  "platforms": ["<对应 image platform ID>"],
  "badge": "<从 copy.md frontmatter 读>",
  "title": "<从 copy.md frontmatter 读>",
  "body": "<copy.md 正文去掉 frontmatter>",
  "points": ["<要点 1>", "<要点 2>", "<要点 3>"],
  "source": "<品牌域名>",
  "qr": "<完整 URL>"
}
```

---

## 文件结构

```
yuanfang-content-gen/
├── SKILL.md                ← 本文件
├── scripts/
│   ├── generate-copy.js    ← 造 prompt（agent-driven）
│   ├── validate-copy.js    ← 合规校验
│   └── extract-brand.js    ← URL → 品牌
├── data/
│   └── sensitive-words.json  ← 3-tier 敏感词
├── schemas/                ← 6 平台模板
│   ├── xiaohongshu.md
│   ├── wechat.md
│   ├── toutiao.md
│   ├── weibo-micro.md
│   ├── zhihu.md
│   └── moments.md
└── output/                 ← .gitignore（per-session 产物）
```

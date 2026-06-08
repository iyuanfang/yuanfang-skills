---
name: yuanfang-content-gen
description: |
  给定主题/关键词，先生成通用内容草稿 (content.md)，用户可以改，然后自动生成适合各平台的文案和配图。
  一条核心信息 → 多平台内容（小红书/公众号/头条/知乎/朋友圈等）+ 每平台配图。
  相比手动写，省去重复复制粘贴 + 逐平台调语气的工作。
当用户说"写内容"、"发哪个平台"、"小红书文案"、"内容创作"、"写一篇推广"时考虑使用此技能。
---

# yuanfang-content-gen — 多平台内容生成

## 依赖

本 skill 依赖同仓库的两个 skill：

| Skill | 用途 |
|-------|------|
| `yuanfang-design/` | 共享设计系统（主题 CSS、布局块） |
| `yuanfang-html-image/` | HTML 方案生成各平台配图 |

调用关系：`content-gen` 编排 → LLM 写文案 + 调 `render.js` 截图。

**工作目录约定**：所有命令以**本 skill 所在目录**（`yuanfang-content-gen/`）为 cwd 执行。`output/` 写在本 skill 目录下，调用兄弟 skill 用 `../<brother-skill>/` 相对路径。

**品牌提取**（Step 2 备选）：如果用户给了 URL 但没指定主色，可用

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
Step 2: 询问 → 生成哪些平台的文案和图片？（多选）
  → 默认推荐：小红书 + 朋友圈
  → ⬋ 等用户选择后才能继续
  → 接着问 → 图片用什么主题风格？（或让 LLM 根据语气自动推荐）
    ↓
Step 3: 逐平台生成（LLM 写 copy.md + 调 render.js 出图）
    ↓
Step 4: 展示输出目录，用户确认
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

### 生成示例

```
用户说：写一个关于 AI 客服的内容

LLM 生成：

# AI 客服，不只是聊天机器人

## 核心信息
AI 客服正在重新定义企业服务效率

## 正文
从 7×24 小时响应到智能路由，AI 客服将企业服务成本降低 60%，同时提升客户满意度 40%。

## 要点
- 全天候在线，零等待
- 智能分流，精准匹配
- 持续学习，越用越聪明

## CTA
立即体验，免费试用 14 天

## 语气
专业
```

### [等待用户确认] 展示 content.md 给用户

```
我生成了内容草稿：

# AI 客服，不只是聊天机器人

## 核心信息
AI 客服正在重新定义企业服务效率

## 正文
从 7×24 小时响应到智能路由...

## 要点
- 全天候在线，零等待
- 智能分流，精准匹配
- 持续学习，越用越聪明

## CTA
立即体验，免费试用 14 天

## 语气
专业

内容 ok 吗？可以让我改，也可以直接编辑 content.md 文件。
```

用户确认 → 进 Step 1。

---

## Step 1: 修改 content.md

### 两种修改方式

1. **自然语言（推荐）** — "正文再短一点"、"语气改轻松些"、"加一个关于成本的要点"
   → LLM 直接改 content.md 文件，展示 diff
2. **直接编辑文件** — 用户手动改 content.md，LLM 检查语法/格式

### 反复迭代

用户改 → 展示新 content.md → 用户再改 → ... → 用户确认终稿

### [等待用户确认] 用户确认 content.md 终稿后才能进 Step 2

---

## Step 2: 选择平台 + 主题

### 第一轮：选择平台（多选）

展示平台列表，用户勾选。默认推荐 小红书 + 朋友圈。

| 平台 | ID | 文案类型 | 配图尺寸 |
|------|-----|---------|---------|
| 小红书 | xiaohongshu | 种草文案（带话题标签） | 1080×1440 竖版 + 1080×1080 方版 |
| 公众号 | wechat | 公众号文章 | 900×383 头图 |
| 头条文章 | toutiao | 资讯式文章 | 1080×500 |
| 微头条 | weibo-micro | 短评 (140-300字) | 1080×608 |
| 知乎 | zhihu-cover | 专业回答/文章 | 1200×630 分享卡片 |
| 朋友圈 | moments | 短文案 (1-3句) | 1080×1080 |

### 第二轮：选择图片主题

从 18 个主题中选 1 个，所有平台图片使用同一主题（保持视觉统一）。

**也可以让 LLM 根据 content.md 的语气自动推荐：**

| 内容语气 | 推荐主题 |
|---------|---------|
| 专业 / 企业 | corporate-clean, minimal-white |
| 震撼 / 重磅 | dark-gold, bold-poster |
| 轻松 / 生活 | warm-handdrawn, catppuccin-latte |
| 科技 / 前沿 | tech-modern, tokyo-night |
| 深度 / 分析 | editorial, editorial-serif |
| 路演 / 融资 | pitch-deck-vc |

用户说"自动"或"你推荐" → LLM 根据语气自动选主题并说明理由。

### [等待用户确认] 等用户选择平台 + 主题后才能进 Step 3

---

## Step 3: 生成文案 + 配图

对每个选中的平台，两件事：写 copy.md、render.js 出图。

### 3a.0 自动化路径（推荐）— `generate-copy.js`

`scripts/generate-copy.js` 接 content.md，按平台 schema 批量生成 copy.md 并自动跑 `validate-copy.js` 验证。LLM 命中失败时自动重写（`--auto-rewrite`，最多 3 次）。

**支持 LLM provider**（按环境变量自动选）：

| Provider | 触发 | 默认模型 |
|---|---|---|
| `template` | 无 API key（默认） | 无，纯模板（fallback，输出较机械） |
| `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-haiku-4-5` |

显式指定：`--llm openai`，或环境变量 `CONTENT_GEN_LLM=anthropic`。

**基本用法：**

```bash
node scripts/generate-copy.js \
  --content content.md \
  --platforms xiaohongshu,wechat,toutiao,zhihu,moments,weibo-micro \
  --output output/20260608_myapp
```

**A/B 变体**：每个平台生成 N 份，写成 `copy.md` + `copy_v2.md` + `copy_v3.md`。

```bash
node scripts/generate-copy.js --content content.md --platforms xiaohongshu --variants 3
```

**自动重写**：LLM 模式且校验失败时自动重试（template 模式无意义，跳过）。

```bash
node scripts/generate-copy.js --content content.md --platforms xiaohongshu --auto-rewrite
```

输出格式：

```
output/20260608_myapp/
├── 小红书/copy.md
├── 小红书/copy_v2.md          (--variants 2+)
├── 公众号/copy.md
└── ...
```

每份 copy.md 走 `validate-copy.js`：合规分 < 35 视为 fail；fail 时 exit code 1，便于 CI 拦截。

**手工 path**（如果你想自己写）见 3a.1。

### 3a.1 手工路径 — 写平台文案 → copy.md

基于 content.md，按平台特性改写。每个平台生成独立的 copy.md，包含 **YAML frontmatter**（结构化元数据）+ **正文**。

#### copy.md 格式要求

每个 copy.md 必须以 YAML frontmatter 开头，包含该平台所需的字段：

```markdown
---
platform: xiaohongshu
title: 被AI客服震惊了
tags:
  - AI客服
  - 智能客服
cta: 立即体验
---

正文内容...
```

各平台的 frontmatter 字段参考 `schemas/` 目录下的模板：

| 平台 | 参考模板 | 必填字段 |
|------|---------|---------|
| 小红书 | `schemas/xiaohongshu.md` | title, body, tags (3-5), cta |
| 公众号 | `schemas/wechat.md` | title, lead (200字引子), outline, cta |
| 头条文章 | `schemas/toutiao.md` | title, body, meta |
| 知乎 | `schemas/zhihu.md` | title, body, key_points |
| 朋友圈 | `schemas/moments.md` | text (1-3句) |
| 微头条 | `schemas/weibo-micro.md` | text (140-300字) |

##### 小红书 copy.md 示例

```markdown
---
platform: xiaohongshu
title: 被AI客服震惊到了！不是机器人，是真智能 😱
tags:
  - AI客服
  - 智能客服
  - 效率工具
cta: 立即体验 AI 客服，免费试用 14 天
---

说出来你可能不信，我刚刚体验了一款AI客服平台...
```

##### 朋友圈 copy.md 示例

```markdown
---
platform: moments
---

试了个AI客服平台，免费版就能用。RAG+双LLM自动容灾，这配置有点东西。🫡
```

#### 生成步骤

1. 打开 `schemas/<平台>.md` 参考模板
2. 基于 content.md 内容，按平台特性改写
3. 写入 `output/<日期>_<主题>_<序号>/<平台名>/copy.md`

### 3a.5 验证 copy.md（必须执行）

每个 copy.md 写出后，必须运行验证脚本：

```bash
node yuanfang-content-gen/scripts/validate-copy.js \
  output/<日期>_<主题>_<序号>/<平台名>/copy.md
```

**检查项**：
- 必填字段（参考 `schemas/<平台>.md`）
- 平台特定约束（标签数、长度、句数）
- **AI 味检测**（"综上所述" 等 15 个高频模板句 + "首先/其次/最后" 机械序列）
- **跨平台重复检测**（与同批次兄弟平台的 copy.md 比对，若一方整段包含另一方 ≥30 字片段则警告）
- **标题公式检查**（长度区间、emoji 强制、问号强制、数字偏好、AI/震惊体词拦截）

**Persona 与标题公式**：每个 `schemas/<平台>.md` 含 `persona:`（一句话角色设定）+ `title_formula:`（3-4 个标题模板）+ `rules:`（硬约束）。改写时必须先读 persona 再下笔。

验证通过（exit 0 且无 ⚠）才能进入下一步。出现 ⚠ 也要改写。

### 3b. 生成配图 → render.js

LLM 从 **该平台的 copy.md 中提取标题/正文/要点**（不是从 content.md 提取！），**创建 content.json**（含 QR 码配置），调 render.js。

#### 第一步：创建 content.json

在每个平台的输出目录创建 `content.json`：

```json
{
  "title": "<从 copy.md 提取的标题>",
  "body": "<从 copy.md 提取的正文>",
  "points": ["<从 copy.md 提取的要点1>", "<要点2>", "<要点3>"],
  "source": "<品牌域名>",
  "qr": "<品牌 URL>"
}
```

- **`source` / `qr`**：来自品牌信息（Step 2 获取的品牌 URL），**各平台相同**，不来自 copy.md
- **`title` / `body` / `points`**：来自各平台的 copy.md，**每个平台不同**

##### 示例：小红书 content.json

```json
{
  "title": "被AI客服震惊到了！不是机器人，是真智能",
  "body": "AICS 基于 RAG 知识库和大语言模型，免费版 0 元起。",
  "points": ["知识库双版本管理","多渠道统一接入","双 LLM 自动容灾"],
  "source": "aics.financialagent.cc",
  "qr": "https://aics.financialagent.cc/"
}
```

#### 第二步：调 render.js

用 `--file` 传入 content.json，同时传入主题/布局/参数：

```bash
node ../yuanfang-html-image/scripts/render.js \
  --file output/<日期>_<主题>/<平台名>/content.json \
  --theme <theme> \
  --layout cover \
  --platforms <platform-id> \
  --accent indigo --type sans \
  --output "output/<日期>_<主题>/<平台名>"
```

**`--file` 方式的好处**：
- 支持 `qr` 字段（自动生成二维码）
- 支持 `source` 字段（显示来源 URL）
- 支持 `brandImage` 字段（左下角 logo）
- 文案集中管理，不散落在 CLI 参数中

#### 图片参数自动推荐（不单独询问用户）

LLM 根据 content.md 的语气和内容量自动选择以下参数，在指令中直接填入。无需让用户单独决策。

| 参数 | 自动推荐规则 |
|------|-------------|
| `--accent` | 默认使用主题自带 accent 色。仅当语气强烈偏向某色时覆盖：金融/环保 → `emerald`，紧迫/促销 → `amber`，情感/女性 → `rose`，科技 → `indigo`（默认），高端/低调 → `slate` |
| `--type` | `sans`（默认）。编辑/深度内容 → `serif`，技术/开发内容 → `mono` |
| `--density` | 根据 points 数量：≤2 → `airy`，3-4 → 不传（正常），≥5 → `dense` |
| `--decor` | `plain`（默认）。高端/正式语气 → `subtle`，重磅/发布会 → `bold` |

示例调用：

```bash
# 小红书配图
node ../yuanfang-html-image/scripts/render.js \
  --file output/20260608_AICS/小红书/content.json \
  --theme minimal-white \
  --layout cover \
  --platforms xiaohongshu-v,xiaohongshu-s \
  --accent indigo --type sans \
  --output "output/20260608_AICS/小红书"
```

```bash
# 朋友圈配图
node ../yuanfang-html-image/scripts/render.js \
  --file output/20260608_AICS/朋友圈/content.json \
  --theme minimal-white \
  --layout cover \
  --platforms moments \
  --accent indigo --type sans \
  --output "output/20260608_AICS/朋友圈"
```

**品牌色/logo 处理：** 同上。如果 content.md 中提到了品牌相关颜色或 logo，在 Step 2 时间用户确认后传给 render.js。没有则跳过。

**输出时附带说明：** 渲染完成后在进度消息中顺带一提（如"配图以 indigo 色调呈现"），用户想改可以后续指定。

### 逐平台串行

每个平台依次生成，LLM 展示进度：
```
[1/3] 生成小红书文案 + 配图... ✅
[2/3] 生成公众号文案 + 配图... ✅
[3/3] 生成朋友圈文案 + 配图... ✅
```

---

## Step 4: 输出目录 + 确认

### 目录结构

```
output/
└── <日期>_<主题>_<序号>/
    ├── content.md                    # 核心内容（事实源）
    ├── 小红书/
    │   ├── copy.md                   # 平台专属文案
    │   ├── content.json              # render.js 输入（含 qr/source）
    │   └── AI客服_xiaohongshu-v.png   # render.js 生成
    ├── 公众号/
    │   ├── copy.md
    │   ├── content.json
    │   └── AI客服_wechat-cover.png
    ├── 朋友圈/
    │   ├── copy.md
    │   ├── content.json
    │   └── AI客服_moments.png
    └── ...
```

### 展示给用户

```
全部生成完成！

output/20260608_AI客服_001/
├── content.md
├── 小红书/    copy.md + 2 张配图
├── 公众号/    copy.md + 1 张配图
└── 朋友圈/    copy.md + 1 张配图

要调整什么吗？可以：
- 改 content.md → 重新生成
- 换主题 → 只重新出图
- 追加平台 → 只追加
- 或者就这样了
```

### [等待用户确认] 等用户最终确认后结束

---

## 平台文案风格指南

LLM 生成各平台 copy.md 时遵循以下风格。**每个平台的完整模板 + 示例见 `schemas/<平台>.md`**。

### 小红书
- **模板**：`schemas/xiaohongshu.md`
- **frontmatter**：title, tags (3-5), cta
- 标题带 1-2 个 emoji，口语化
- 正文有真实体验感/"亲测"感
- 结尾带 3-5 个相关话题标签
- 语气亲切，像朋友推荐

### 公众号
- **模板**：`schemas/wechat.md`
- **frontmatter**：title, lead (200字引子), outline, cta
- 标题吸引点击（可疑问句/数字/冲突）
- 正文段落清晰，有逻辑结构
- copy.md 只写前 200 字引子 + 大纲

### 头条文章
- **模板**：`schemas/toutiao.md`
- **frontmatter**：title, body, meta
- 标题信息量大，数字优先
- 正文开门见山，不铺垫
- 短段落，多换行

### 微头条
- **模板**：`schemas/weibo-micro.md`
- **frontmatter**：text (140-300 字)
- 140-300 字
- 观点鲜明，有讨论空间
- 口语化，像发动态

### 知乎
- **模板**：`schemas/zhihu.md`
- **frontmatter**：title, body, key_points
- 专业深入，有论据支撑
- 结构清晰（首先/其次/最后）
- 语气客观理性

### 朋友圈
- **模板**：`schemas/moments.md`
- **frontmatter**：text (1-3 句)
- 1-3 句话
- 自然口语化，像日常分享
- 不刻意营销

---

## 与 yuanfang-html-image 的平台 ID 映射

| content-gen 平台 | render.js platform ID | 说明 |
|-----------------|----------------------|------|
| 小红书 | `xiaohongshu` 组（v + s） | 两组尺寸 |
| 公众号 | `wechat` 组（cover + thumb） | 两组尺寸 |
| 头条文章 | `toutiao` | 单张 |
| 微头条 | `weibo-micro` | 单张 |
| 知乎 | `zhihu-cover` | 单张 |
| 朋友圈 | `moments` | 单张 |

---

## content.md → content.json 映射

| content.md 字段 | content.json 字段 | render.js 使用 |
|-----------------|-------------------|---------------|
| 标题 | `title` | `{{TITLE}}` |
| 正文 | `body` | `{{CONTENT}}` |
| 要点 | `points[]` | `{{POINTS_HTML}}` |
| — | `brandImage` | 左下角 logo（Step 2 问用户） |
| — | `brand` | 品牌名（同上） |
| — | `source` | `{{SOURCE}}`（品牌域名，同 qr 来源） |
| — | `qr` | 右下角二维码（品牌 URL，Step 2 获取，各平台相同） |

---

## 文件结构

```
yuanfang-content-gen/
├── SKILL.md                    # 本文件
├── schemas/                    # 各平台文案模板（含示例）
│   ├── xiaohongshu.md
│   ├── wechat.md
│   ├── toutiao.md
│   ├── zhihu.md
│   ├── moments.md
│   └── weibo-micro.md
├── scripts/                    # 工具脚本
│   └── validate-copy.js        # copy.md 校验（Step 3a.5 必须执行）
└── output/                     # 生成内容目录
    └── <日期>_<主题>_<序号>/
        ├── content.md          # 核心内容（事实源）
        ├── 小红书/
        │   ├── copy.md         # 平台专属文案（含 YAML frontmatter）
        │   ├── content.json    # render.js 输入（含 qr/source）
        │   └── <标题>_xiaohongshu-v.png
        ├── 公众号/
        │   ├── copy.md
        │   ├── content.json
        │   └── <标题>_wechat-cover.png
        ├── 朋友圈/
        │   ├── copy.md
        │   ├── content.json
        │   └── <标题>_moments.png
        └── ...
```

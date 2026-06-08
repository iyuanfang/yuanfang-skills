# yuanfang-content-gen 竞争分析与借鉴调研

**日期:** 2026-06-08
**状态:** 研究完成, 待落地
**研究者:** 元芳 (小元)
**范围:** 多平台内容生成工具 (海外 + 国内) + Agent Skill 设计模式
**互补文档:** `competitive-analysis-2026-06-07.md` (HTML→PPTX 引擎)、`competitive-analysis-ai-ppt-tools-2025-2026.md` (商业 PPT 工具)

---

## 0. 摘要 (TL;DR)

| 维度 | 结论 |
|---|---|
| **yuanfang-content-gen 是什么** | 一条核心信息 → 多平台文案 (小红书/公众号/头条/知乎/朋友圈/微博) + 每平台配图 的 LLM 编排型 skill |
| **核心架构** | content.md (事实源) → 6 平台 schemas + YAML frontmatter → validate-copy.js 硬校验 → render.js 出图 |
| **市场位置** | "AI 写作 + AI 配图" 之间的缝隙——LLM-friendly 的内容矩阵工具，开源 + 零 API 成本 |
| **核心竞品 (海外)** | Buffer AI Assistant, Hootsuite OwlyWriter, Jasper, Copy.ai, Predis.ai, Ocoya, Tweet Hunter, kevinten-ai/mcp-social-publisher |
| **核心竞品 (国内)** | MultiPost, 蚁小二, 灵感岛, 酷云AI, 创自由, 媒小三, 智猩猩 AIGC 加速器 |
| **同仓库姊妹** | `yuanfang-html-image` (HTML 配图) + `yuanfang-html-ppt` (PPTX 演示) + `yuanfang-design` (共享设计系统) |
| **5 大借鉴点** | ① Pipeline + Generator 复合模式 ② Platform Adapter 模式 (Provider Registry) ③ Progressive Disclosure ④ schema-as-data ⑤ 多模态产物同源 |
| **3 大风险** | 无发布能力 (vs mcp-social-publisher)、无数据回流、无角色/人设库 |

---

## 1. yuanfang-content-gen 现状精要

### 1.1 工作流 (4 步 Pipeline)

```
用户给主题/关键词
  ↓
Step 0: LLM 生成 content.md (事实源)  [等待用户确认 ⏸]
  ↓
Step 1: 用户修改 content.md           [等待用户确认 ⏸]
  ↓
Step 2: 选择平台 + 图片主题            [等待用户确认 ⏸]
  ↓
Step 3: 逐平台生成 (copy.md + PNG)     [validate-copy.js 硬校验]
  ↓
Step 4: 展示输出目录，用户确认
```

### 1.2 文件结构

```
yuanfang-content-gen/
├── SKILL.md                          # 485 行, 包含完整工作流
├── scripts/
│   └── validate-copy.js              # 179 行, YAML frontmatter + 平台规则校验
├── schemas/
│   ├── xiaohongshu.md                # frontmatter: title, body, tags(3-5), cta
│   ├── wechat.md                     # frontmatter: title, lead(200字), outline, cta
│   ├── toutiao.md                    # frontmatter: title, body, meta
│   ├── zhihu.md                      # frontmatter: title, body, key_points
│   ├── weibo-micro.md                # frontmatter: text(140-300字)
│   └── moments.md                    # frontmatter: text(1-3句)
└── output/                           # 产物：content.md + <平台>/copy.md + <平台>/*.png
```

### 1.3 关键技术决策

| 决策 | 价值 |
|---|---|
| **content.md 单一事实源** | 改一处全平台同步，LLM 友好 |
| **YAML frontmatter** | 既是 LLM 输出格式，也是机器可读元数据 |
| **6 个 schema 文件** | 平台规格独立可扩展，加平台只需新增 schema |
| **validate-copy.js** | 必填字段 + 平台特定规则 (标签数、长度) 硬校验 |
| **HTML 配图 (非 AI 生图)** | 100% 可控文字、像素级布局、零 API 成本、可批量 |
| **强制等待用户确认节点** | 4 个 checkpoint 防止 LLM 跑偏 |
| **token/主题共享** | `yuanfang-design` 18 主题，所有 skill 视觉统一 |

### 1.4 当前覆盖

- **平台：** 小红书 / 公众号 / 头条 / 知乎 / 朋友圈 / 微博 6 个
- **主题：** 18 个 (来自 yuanfang-design)
- **布局：** 1 个 (cover) → 应扩展为 bullets / kpi-grid / timeline
- **已落地产物：** `output/20260608_AICS/` (小红书 + 朋友圈)
- **集成 skill：** yuanfang-html-image (出图) + yuanfang-design (主题/布局)

---

## 2. 海外竞品深度分析

### 2.1 kevinten-ai/mcp-social-publisher ⭐⭐⭐⭐

**Repo:** https://github.com/kevinten-ai/mcp-social-publisher (MIT)
**定位:** MCP server, AI 助手 → 多平台内容发布
**平台:** X/Twitter, Weibo, Bilibili, Xiaohongshu

#### 核心架构

```
AI Assistant (Claude/Cursor) → MCP Server → Platform API
                                ↓
                publish()  → post URL
                preview_content() → formatted text (dry run, 无需 API)
```

#### Provider Registry Pattern (最值得借鉴)

```python
# 每个平台一个 provider, 实现统一接口
class XProvider(BaseProvider):
    def publish(self, content): ...
    def preview(self, content): ...

# 主路由
PROVIDERS = {
    "x": XProvider(),
    "weibo": WeiboProvider(),
    "bilibili": BilibiliProvider(),
    "xiaohongshu": XiaohongshuProvider(),
}
```

**优势:** 加平台 = 写一个新 provider class，不动主逻辑。

#### Platform-aware formatting (内容适配规则)

| 平台 | 字符限制 | hashtag 格式 | 图片规格 |
|------|---------|-------------|---------|
| X (Twitter) | 280 | `#tag` | 4 张 |
| Weibo | 2000 | `#tag#` (双 hash) | 1 张 |
| Bilibili | 标题 40 字 | - | 无图 |
| Xiaohongshu | 标题 20 字 | 3:4 推荐 | 手动 |

#### 我们可借鉴的

| 点 | 当前 yuanfang-content-gen | 借鉴后 |
|---|---|---|
| ✅ Provider Registry | schema 文件散落 | 应改 `providers/<platform>.js` 统一接口 |
| ✅ Platform-aware rules | 在 validate-copy.js 里 switch | 规则下放到 provider，每个 provider 自带 `format()`/`validate()` |
| ✅ Dry-run (preview_content) | 没有 — 用户看不到"在 XX 平台会怎么显示" | 加 `preview` 步骤, 实际渲染前展示 |
| ❌ 发布能力 | 无 | 短期不补, 留给 mcp-social-publisher |
| ❌ X/Twitter 支持 | 无 | 加 (海外用户场景) |

---

### 2.2 Buffer AI Assistant ⭐⭐⭐⭐

**官网:** https://buffer.com
**定位:** 老牌 social media management + AI 助手
**平台:** LinkedIn, X, Instagram, Facebook, TikTok, YouTube, Threads, Bluesky, Pinterest, Mastodon, Google Business (11 个)

#### 关键工作流 (借鉴价值高)

```
[1] 创建 Post → 输入 idea (prompt)
[2] AI 生成 多个 variants
[3] Tag 归类 / Template 复用
[4] Preview as LinkedIn / as X / as Instagram (实时切换预览)
[5] 拖拽图片, 280 字 Thread 支持
[6] Schedule / Publish
```

#### 借鉴点

| 点 | 说明 |
|---|---|
| **多 variant 生成** | 一次 prompt 生成 3-5 个备选, 用户挑一个或 A/B 测试 |
| **Preview as X** | 同内容多平台实时切换预览, 不重新生成 |
| **Tag / Template 复用** | 历史内容组织 |
| **Thread 支持** | 长内容自动拆分 |

#### 我们可改进

- **Step 3 加 variant 选项**: "为小红书生成 3 个版本, 你挑"
- **加 preview 步骤**: copy.md 写出后, 在终端展示"在 X 平台会显示成...", 让用户提前感知

---

### 2.3 Hootsuite OwlyWriter AI ⭐⭐⭐

**定位:** 老牌 social management, OwlyWriter 是 AI 写作模块
**核心功能:** 内容生成 + 最佳发布时间建议 + 表现预测

#### 借鉴点: 表现预测 / 评分

- "OwlyWriter 预测这条贴会得到 X 互动"
- 我们可以在 validate-copy.js 之外加 `predict-engagement.js`, 根据 hashtag 数 / 长度 / 提问句式评分

---

### 2.4 Jasper.ai ⭐⭐⭐

**定位:** 老牌 AI 营销文案, 50+ 模板
**核心:** Brand Voice + Knowledge Base + Campaign 模板

#### 借鉴点: Brand Voice

- 一个品牌可定义 voice (专业 / 轻松 / 幽默...), 跨平台所有输出都遵循
- **我们的映射:** content.md 的"语气"字段已经在用, 但 LLM 是否真的遵循不确定
- **建议:** 加 `voice` 配置文件 (`voices/aics-pro.md`), 写明品牌调性 + 词库 + 禁用词, validate 阶段也检查禁用词

---

### 2.5 Copy.ai ⭐⭐⭐

**借鉴点:** Workflow (多步骤串行) 概念 — 与 yuanfang-content-gen 的 Pipeline 模式天然契合

#### 借鉴点: Workflow 模板

- 用户保存一个"内容矩阵工作流": 输入源 → 6 平台 → 自动排程
- **建议:** 加 `presets/` 目录, 预置常用场景 (产品发布 / 周报 / 节日营销 / 个人 IP), 改改就能用

---

### 2.6 Predis.ai / Ocoya ⭐⭐⭐

**定位:** AI + 设计 一体化 (与 yuanfang 最像)
**核心:** 模板库 + AI 改写 + 排程

#### 借鉴点: AI 自动改写

- 给定内容, 选 3 种 tone 重写 (正式 / 轻松 / 搞笑)
- **建议:** yuanfang-content-gen 在每个平台内增加 "tone 滑块" 选项, 一次生成多版本

---

### 2.7 Tweet Hunter / Hypefury ⭐⭐⭐

**定位:** X (Twitter) 内容工程化
**核心功能:** 爆款模仿 / 排程 / 自动 DM / Thread writer

#### 借鉴点: "爆款拆解 + 反向生成"

- 输入一个爆款 URL → 拆解结构 (hook / body / CTA) → 套用结构生成新内容
- **建议:** 加 `viral-deconstruct` 步骤, 输入竞品爆款 → 提取骨架 → 套用户主题

---

### 2.8 Meta AI 创作者助手 (新) ⭐⭐⭐

**发布:** 2026-06
**定位:** Facebook 创作者的对话式 AI 助手

#### 借鉴点: 对话式 + 数据驱动

- 不是"生成内容", 而是"问答"——"我应该什么时候发布? 评论区都在说什么?"
- **我们未来方向:** content-gen 不止是"生成", 也加"分析已有内容"的能力, 形成完整闭环

---

## 3. 国内竞品分析

### 3.1 MultiPost (multipost.app) ⭐⭐⭐⭐

**定位:** 开源多平台发布工具, 100% 免费
**平台:** 微博/小红书/抖音/Twitter 等 10+
**技术栈:** Web app, 用户登录各平台后用浏览器扩展发布

#### 借鉴点

| 点 | 说明 |
|---|---|
| **开源 + 透明** | 与 yuanfang-skills 定位完全一致 |
| **视频转文字 (subtitles)** | "AI speech recognition, 多语言, 高精度" |
| **API 集成扩展** | "Add new platforms" 模块化 |

#### 关键差异

| | MultiPost | yuanfang-content-gen |
|---|---|---|
| 强项 | 跨平台发布 | 内容生成 + 配图 |
| 弱项 | 内容质量依赖人工 | 发布能力 |
| 互补 | 可以组合用 | - |

---

### 3.2 蚁小二 (yixiaoer.cn) ⭐⭐⭐

**定位:** 自媒体多平台矩阵 + 一键发布
**平台:** 主流平台 12+, 含指纹浏览器 / 团队协作

#### 借鉴点: 团队 + 矩阵账号

- "批量发 1 个视频到多账号"、"批量发多个视频到 1 个账号"
- **我们未来:** 加 "内容矩阵" 概念, 同 content.md → N 账号 × M 平台 = N×M 套

---

### 3.3 灵感岛 / 红薯智语 / 酷云AI ⭐⭐⭐

**定位:** 小红书专精 AI 工具
**能力:** AI 写作 + 智能笔记 + 爆款模板 + 配图

#### 借鉴点: 小红书深耕

- 风格库: 收集 1000+ 爆款, 抽取骨架
- 关键词热度: 接入小红书搜索热词
- **建议:** yuanfang-content-gen 的小红书 schema 可加 "爆款骨架" 选项

#### 当前差距

- 这些工具都没开源
- 配图是 AI 生图 (我们 HTML 方案文字更可控)
- 单平台专精, 不做多平台

---

### 3.4 创自由 / 媒小三 / 智猩猩 AIGC 加速器 ⭐⭐

- 创自由: 关键词 → 多平台文案
- 媒小三: 微信生态一站式
- 智猩猩: AIGC 加速器 (平台型企业服务, 偏组织流程)

**借鉴点有限**, 但说明: 国内"内容矩阵"市场已有规模, yuanfang 切入合理

---

## 4. 横向对比矩阵

| 维度 | yuanfang-content-gen | Buffer | mcp-social-publisher | 蚁小二 | 灵感岛 | 媒小三 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **多平台生成** | ✅ 6 | ✅ 11 | ✅ 4 | ✅ 12+ | ❌ 1 (XHS) | ❌ 1 (WX) |
| **开箱即用** | ✅ skill | ✅ SaaS | ⚠️ MCP | ✅ SaaS | ✅ SaaS | ✅ SaaS |
| **开源** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **零 API 成本** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **HTML 配图** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PPTX 演示** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **多 variant** | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **爆款拆解** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **平台 schema 化** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **内容校验** | ✅ validate.js | ⚠️ 弱 | ❌ | ❌ | ❌ | ❌ |
| **Brand voice** | ⚠️ 仅"语气"字段 | ✅ 完整 | ❌ | ❌ | ⚠️ 弱 | ❌ |
| **数据回流** | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **实际发布** | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **多语言** | ⚠️ 主要是中文 | ✅ 11 国 | ⚠️ 4 平台 | ✅ | ⚠️ 中文 | ⚠️ 中文 |
| **可二次开发** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |

**yuanfang 的独特位置:** 「开源 + LLM 友好 + HTML 配图 + PPTX 联动」四角交叉, 没有完全对手。

---

## 5. 可借鉴的 Agent Skill 设计模式

来源: Google Cloud Tech 的 5 大 Agent Skill 模式 (Tool Wrapper / Generator / Reviewer / Inversion / Pipeline) + Anthropic SKILL.md 规范

### 5.1 yuanfang-content-gen 用的模式

| 模式 | 应用位置 |
|---|---|
| **Pipeline** | Step 0→1→2→3→4 强串行, 每步用户确认 |
| **Generator** | content.md + 6 平台 copy.md, 都按 schema 模板生成 |
| **Reviewer** | validate-copy.js 字段/长度/标签数硬校验 |
| **Inversion** | Step 2 反问: "哪个平台? 什么主题?" 而不是默认全开 |
| **Tool Wrapper** | render.js 是"调用 yuanfang-html-image 的封装" |

**组合度: 5 种模式全用上了, 是教科书级的 Skill 组合。**

### 5.2 同仓可借鉴的姊妹 skill

| Skill | 借鉴点 |
|---|---|
| `yuanfang-html-ppt` | YAML 优先的内容格式 (`content.yaml` + 注释, 比 JSON 更可读可改) — **content.md 可升级为 content.yaml** |
| `yuanfang-html-image` | 品牌资产提取 (Step 0) + 18 主题共享 — **content-gen 已借, 但未做强"品牌锁定"** |
| `yuanfang-design` | 12+ 主题、token CSS 变量 — **content-gen 可加 `decor/density/serif/sans` 5 个 token 决策** |

### 5.3 具体可借鉴的工程实践

#### 借鉴 1: Platform Adapter 模式 (来自 mcp-social-publisher)

**当前问题:** validate-copy.js 里有 `switch(platform) { case 'xiaohongshu': ... }` 写死 6 个平台

**改后:**
```js
// providers/xiaohongshu.js
export default {
  id: 'xiaohongshu',
  schema: 'schemas/xiaohongshu.md',
  format: (content) => ({ title, body, tags, cta }),
  validate: (fm, body) => [...errors],
  renderParams: (copy) => ({ title, content, points, ... }),
  nextStep: (copy) => 'invoke render.js --platforms xiaohongshu-v',
}
```

**好处:** 加平台 = 1 个新文件, 不改主流程。

#### 借鉴 2: Pipeline 增强 - 加"自动终止" (来自 Step Gate 思想)

**当前问题:** 用户在每步都要手动确认, 熟练用户嫌烦

**改后:** 加 `--yolo` / `--auto-approve` 模式, 跳过中间确认

#### 借鉴 3: Schema-as-Data (来自 yuanfang-html-ppt 的 YAML 优先)

**当前问题:** content.md 字段是手写模板, 没有机器可读的结构

**改后:**
```yaml
# content.yaml
title: AI 客服, 不只是聊天机器人
core_message: AI 客服正在重新定义企业服务效率
body: |
  从 7×24 小时响应到智能路由...
key_points:
  - 全天候在线, 零等待
  - 智能分流, 精准匹配
  - 持续学习, 越用越聪明
cta: 立即体验, 免费试用 14 天
tone: 专业
# 下面是平台 schema 的元数据
platforms:
  xiaohongshu:
    variant_count: 3
  moments:
    variant_count: 1
```

**好处:** LLM 生成更稳, 用户可改, 程序可读。

#### 借鉴 4: Progressive Disclosure (Anthropic 核心)

yuanfang-content-gen 的 SKILL.md 485 行, 全加载会浪费 context
**改后:** 拆为
```
SKILL.md          # 主入口, 200 行
references/
├── workflow.md   # 4 步细节
├── schemas.md    # 6 平台概览
└── content-md-template.md
```

#### 借鉴 5: Test Fixtures (来自 yuanfang-html-ppt)

**当前问题:** `output/20260608_AICS/` 只有一个真实样本, 没有回归测试

**改后:**
```
tests/
├── fixtures/
│   ├── aics-product.md
│   ├── 618-promo.md
│   └── personal-brand.md
└── integration.test.js
```

---

## 6. yuanfang-content-gen 优劣势 SWOT

### Strengths (优势)

- ✅ **结构化工作流** — Pipeline + 4 个 checkpoint, 防止 LLM 跑偏
- ✅ **LLM 友好** — YAML frontmatter + 6 平台 schema, 机器可读可校验
- ✅ **零 API 成本** — HTML 配图, 100% 可控文字, 不烧 token 出图
- ✅ **设计系统共享** — 18 主题 + token CSS, 与 html-image / html-ppt 视觉统一
- ✅ **开源 + 可二次开发** — MIT, 团队可 fork 改
- ✅ **5 种 Agent Skill 模式全用上** — 教科书级设计

### Weaknesses (劣势)

- ❌ **无发布能力** — 用户生成完还要自己粘贴到各平台
- ❌ **无数据回流** — 不知道哪些 copy 表现好
- ❌ **无爆款拆解** — 不能"模仿 + 改写"
- ❌ **无 variant 备选** — 一个平台只出一个版本
- ❌ **无 voice/role 库** — 品牌调性靠 LLM 自觉, 不强制
- ❌ **加平台改主代码** — switch-case 写死 6 平台
- ❌ **无国际化** — 主要是中文场景
- ❌ **无内容校验之外的"质量评分"** — 只查"字段齐全", 不查"会不会火"

### Opportunities (机会)

- 🌟 **与 mcp-social-publisher 互补** — 我们的 content-gen 负责"内容", 它的 publisher 负责"发布"
- 🌟 **与 yuanfang-html-ppt 联动** — 一条内容 → 多平台文案 + PPT 演示 + 配图
- 🌟 **企业内训 + 品牌矩阵** — SaaS 客户用 yuanfang 做品牌内容中台
- 🌟 **AIGC 内容工厂** — 多人协作, 模板化生产

### Threats (威胁)

- ⚠️ **大厂跟进** — 字节豆包 / 腾讯元宝 / 阿里通义 都可内化此能力
- ⚠️ **开源竞争对手** — 灵感岛开源版 / 新 MultiPost 类项目可能出现
- ⚠️ **平台 API 收紧** — 小红书/微信 API 收紧, 自动化变难

---

## 7. 落地路线图 (Roadmap)

### Phase 1: 巩固核心 (1-2 周)

| 任务 | 工作量 | 价值 |
|---|---|---|
| **Platform Adapter 重构** | 2 天 | 加平台不再改主代码 |
| **Progressive Disclosure SKILL.md 拆分** | 0.5 天 | 省 context |
| **content.md → content.yaml 升级** | 1 天 | LLM 友好 + 用户可改 |
| **加 test fixtures** | 1 天 | 防回归 |
| **加 voice 配置文件** (`voices/aics-pro.md`) | 1 天 | 品牌一致性 |

### Phase 2: 增强生成 (2-3 周)

| 任务 | 工作量 | 价值 |
|---|---|---|
| **多 variant 生成** (每个平台 3 版本可选) | 2 天 | A/B 测试基础 |
| **爆款拆解** (`deconstruct.js` 输入 URL/文本) | 3 天 | 差异化能力 |
| **质量评分** (`score-copy.js`: hashtag 数 / 长度 / 提问句式) | 2 天 | 超越"只查字段" |
| **加 X (Twitter) / Threads 平台** | 1 天 | 国际化第一步 |
| **加抖音 / 视频号文案 schema** | 2 天 | 视频平台 |
| **加 `decor/density/type` 自动推荐** (来自 render.js) | 0.5 天 | 提升配图质量 |

### Phase 3: 闭环 (3-4 周)

| 任务 | 工作量 | 价值 |
|---|---|---|
| **集成 mcp-social-publisher** (可选发布步骤) | 1 天 | 闭环 |
| **数据回流占位** (埋点日志, 等用户真发布后回流) | 1 天 | 准备数据驱动 |
| **GitHub Action 化** (CI 跑 validate) | 1 天 | 质量门禁 |
| **Gallery / Showcase 网页** (12 主题 × 6 平台 = 72 组合) | 2 天 | 可视化 QA, 卖点展示 |

### Phase 4: 商业化 (待定)

- **yuanfang-content-gen Cloud** — SaaS 包装, 加多账号/团队协作
- **行业 preset** — 金融/医疗/教育的 voice + 词库包
- **API 化** — 给其他 LLM agent 调用

---

## 8. 与同仓姊妹 skill 的协同图

```
                   yuanfang-design (token + 18 主题)
                              ↑
              ┌───────────────┼───────────────┐
              │               │               │
       yuanfang-html-image  yuanfang-content-gen  yuanfang-html-ppt
       (HTML 配图)          (多平台文案+配图)    (PPTX 演示)
              │               │
              └──────→ render.js ←──────┘
                              ↓
                       Playwright 截图
                              ↓
                          PNG / PPTX
```

**未来协同:**
- `content-gen` 调用 `html-image` 出配图
- `content-gen` 调用 `html-ppt` 出一条内容 → 一份演示
- 一份 `content.md` 同时是 blog / 视频脚本 / PPT 提纲 的事实源

---

## 9. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| 平台 schema 维护负担 | 加平台慢 | 抽出 `providers/` 目录, 加平台 = 1 文件 |
| LLM 输出不稳 (同一 prompt 不同结果) | copy 质量波动 | YAML schema 强约束 + validate.js 兜底 |
| HTML 方案对动态内容不友好 | 不如 AI 生图灵活 | 长期考虑加"AI 图补" 模式 (与 HTML 混用) |
| 国内平台 API 收紧 | 自动发布难 | 不做发布, 留给 mcp-social-publisher 配合 |
| 单人项目维护成本 | 6 平台 × 18 主题 = 难全面回归 | 加 integration test + showcase gallery |

---

## 10. 结论

**yuanfang-content-gen 在市场上占据一个独特且合理的位置:**

> **「开源 + LLM 友好的多平台内容矩阵工具」, 介于 AI 写作 (Jasper) 和 AI 配图 (Predis) 之间, 与 mcp-social-publisher 互补, 与 yuanfang-html-ppt 联动。**

**3 个最该立即做的:**
1. **Platform Adapter 重构** (技术债, 阻碍扩平台)
2. **content.md → content.yaml** (LLM 友好度翻倍)
3. **加 test fixtures + GitHub Action** (防回归, 提质量)

**1 个不该做的:**
- 不要自建发布能力 — 与 mcp-social-publisher 互补而不是竞争

---

## 附录 A: 引用来源

### 海外项目
- kevinten-ai/mcp-social-publisher — https://github.com/kevinten-ai/mcp-social-publisher
- Buffer — https://buffer.com
- Hootsuite OwlyWriter
- Jasper.ai
- Copy.ai
- Predis.ai / Ocoya
- Tweet Hunter / Hypefury
- Meta AI 创作者助手 (2026-06 发布)

### 国内项目
- MultiPost — https://multipost.app
- 蚁小二 — https://www.yixiaoer.cn
- 灵感岛 / 红薯智语 / 酷云AI / 创自由
- 媒小三 / 智猩猩 AIGC 加速器

### 设计模式
- Google Cloud Tech: "5 Agent Skill design patterns every ADK developer should know" — https://x.com/GoogleCloudTech/status/2033953579824758855
- Digital Applied: "Claude Agent Skills Framework Guide" — https://www.digitalapplied.com/blog/claude-agent-skills-framework-guide
- Anthropic SKILL.md 规范

### 同仓参考
- `docs/competitive-analysis-2026-06-07.md` — yuanfang-html-ppt 调研
- `docs/competitive-analysis-ai-ppt-tools-2025-2026.md` — 商业 PPT 工具
- `yuanfang-design/SKILL.md` — 共享设计系统
- `yuanfang-html-ppt/SKILL.md` — YAML 优先的姊妹 skill
- `yuanfang-html-image/SKILL.md` — 品牌资产提取 + 18 主题

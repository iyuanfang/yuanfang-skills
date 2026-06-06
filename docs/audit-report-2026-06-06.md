# yuanfang-skills 全面审查报告

> **范围**: yuanfang-design + yuanfang-html-image 整体评估、边界测试、横向对比
> **日期**: 2026-06-06
> **数据来源**: 3 个并行后台任务（项目映射、边界测试、竞品研究）+ 实际渲染测试

---

## 一、项目现状总览

### 1.1 架构
- **monorepo** 含 2 个 skill
- **yuanfang-design/** — 12 主题 + 1 布局 + 30+ token CSS 变量 + 72 iframe 展示页
- **yuanfang-html-image/** — 3 个 Node.js 脚本（render/extract/extract-brand）+ 12 旧模板（兼容保留）+ 105 单元测试
- **完整技术栈**: Node.js（无 Python 依赖），Playwright + sharp + qrcode

### 1.2 元数据
- **测试覆盖**: 7 测试文件，**105+ 单元测试**全部通过
- **git 状态**: 8 个文件有未提交修改（+717/-28 行），方向是"品牌感知 + JS-only + 显式 UX"
- **12 主题**: minimal-white / dark-gold / editorial / warm-handdrawn / tech-modern / bold-poster / data-infographic / eastern / magazine-cover / split-screen / minimal-white-editorial / list-ranking
- **12 平台尺寸**: 小红书 (竖/方) / 公众号 (头图/小图) / 朋友圈 / 微博 / 头条 / 抖音 / B站 / Twitter / A4 / A3

### 1.3 现有优势 ✓

| 维度 | 现状 |
|------|------|
| 设计系统 | token 化、零硬编码（测试强制），主题=纯 token override |
| 渲染管线 | 全 Node.js，CLI 完备，QR 自动生成，brand-spec 缓存 (7天 TTL) |
| 工作流 | 4 步 + 3 轮分步确认，agent-friendly |
| 国际化 | 12 平台覆盖中英主流（小红书、微博、B 站、Twitter、LinkedIn 缺） |
| 输出 | 零外部资源、纯 CSS 装饰、文件小（60-120KB/张） |
| 测试 | 105 单元测试（token、theme、assembly、brand、QR、extract、sharp color） |
| 用户体验 | 有 `[等待用户确认]` 显式节点，brand color override 机制 |

---

## 二、发现的问题（按严重度）

### 🔴 HIGH — 必须修

#### B1: body 多行换行符变成 `&lt;br&gt;` 文本
- **位置**: `scripts/render.js:78`
- **原因**: `escapeHtml` 在 `.replace(/\n/g, '<br>')` 之后执行，把 `<br>` 也转义了
- **影响**: 多段落正文会显示字面 `&lt;br&gt;` 而不是换行
- **修复**: 先 escape 再 replace：`escapeHtml(content.body).replace(/\n/g, '<br>')`

#### B2: 非字符串 body 崩溃
- **位置**: `scripts/render.js:78`
- **原因**: `true/42/[]` 类型 body 触发 TypeError（无 `.replace`）
- **影响**: JSON 流水线可能崩
- **修复**: `String(content.body || content.content || '').replace(...)`

#### B3: 已知用户错误无友好处理
- **位置**: `scripts/render.js` 多个抛错点
- **影响**: theme/layout/JSON/file/output 错误全部未捕获，吐 stack trace
- **对比**: `extract.js:232` 有 `main().catch(err => { console.error(err.message); process.exit(1); })`，render.js 缺
- **修复**: 在 `main()` 入口加 try/catch，输出友好消息

### 🟡 MEDIUM — 应该修

| ID | 问题 | 位置 |
|----|------|------|
| B4 | 无效 platform 静默过滤，无 warning | `resolvePlatforms` (L181-204) |
| B5 | 文件名 sanitization 漏 `\n\r\t&'`，可能产生无效文件名 | `safeDirName` (L271) |
| B6 | `--output ~/path` 不展开 `~` | `resolveOutputDir` (L273) |
| B7 | 多 brand spec 无 `brand` 字段时静默用第一个（按字母序） | `findBrandSpec` (L316-319) |
| B8 | `--theme` 区分大小写（`BOLD-POSTER` 失败） | `loadTheme` (L49-53) |

### 🟢 LOW — 可选

- **M1**: 纯空白 title（"   "）生成的目录名是 `_xxx`（不是 `untitled_xxx`）
- **M2**: QR 接受任意字符串（含 gibberish），无 URL 校验
- **M3**: 损坏的 base64 图片静默渲染破图
- **M4**: 默认输出目录在 `yuanfang-html-image/output/`（已在 .gitignore，但没警告用户）

### ✅ 已正确处理的
- XSS 转义（HTML/JS/引号全转义）
- 12 平台 `--platforms all` 全部生成
- 长内容用 CSS line-clamp 截断（不崩溃）
- 中文/emoji/特殊字符正常
- brand spec 多重匹配（name / case-insensitive / domain）
- extract.js 网络错误有友好提示
- 现有 105 测试全过

---

## 三、对比竞品的可借鉴之处

### 3.1 直接竞品

| 项目 | 优势 | 可借鉴 |
|------|------|--------|
| **liustack/coverpress** | Preset-driven CLI、`#container` 强约束、--safe 安全模式 | 强约束渲染（必须有 `#container` 元素）、2x DPI 默认 |
| **jurczykpawel/social-media-generator** | 品牌 CSS 变量抽象、CLI + API + Web 三种交付 | 品牌即 CSS 文件（已采用），可加 Web UI |
| **sushilkulkarni1389/pixdom** | MCP server、19 平台、auto-mode、SSRF 防护 | MCP 化、structured error output |
| **stevysmith/og-image-skill** (97★) | 从用户已有 codebase 提取品牌、one-shot | 范围扩展到项目目录扫描 |
| **kostja94/social-cards-skills** | 20 风格 × 类型决策矩阵 | 主题表加 "内容类型→主题" 决策矩阵（已有部分） |
| **dancolta/gen-images-skill** | 4 层架构 + Style Anchor 一致性锁 | "Style Anchor" 概念 — 批量生成时保持一致 |

### 3.2 yuanfang 缺失的平台尺寸
**已覆盖**: 小红书 (竖/方) / 公众号 (头/小图) / 朋友圈 / 微博 / 头条 / 抖音 / B站 / Twitter / A4 / A3
**未覆盖**:
- YouTube 缩略图 (1280×720)
- LinkedIn 帖子 (1200×627)
- Instagram Reel 封面 (420×654)
- Pinterest Pin (1000×1500)
- Facebook Cover (820×312)
- Twitter Header (1500×500)
- 通用 OG (1200×630) — 与 twitter 1200×675 不同

### 3.3 Skill 设计最佳实践（来自 Anthropic / Trail of Bits）

#### Pattern: Sequential Pipeline（yuanfang 已采用 ✓）
4 步流程 + 节点确认，匹配 `Trail of Bits` 定义的"依赖型顺序流程"。

#### Pattern: Stop Hook 强制执行（yuanfang 未采用 ✗）
**核心洞察**: "Claude treats skill content as advice, not as instructions" — 文字强度没用

**解决方案**:
```bash
# PreToolUse hook 配合状态文件
# state machine 强制 agent 走完 Step 0→1→2→3
# exit 2 物理阻止跳步（exit 1 只是提示）
```

参考: [Roland Huß](https://ro14nd.de/cc-skill-patterns/) / [Amit Kothari](https://amitkoth.com/claude-code-stop-hooks/)

#### Pattern: Anthropic 官方警示
> "Heavy-handed 'MUSTs' are a yellow flag — explain the why instead."

yuanfang 的 `[等待用户确认]` 标记工作良好但属于 legacy 模式。可改为解释性语言：
- 差: "STOP — wait for user"
- 好: "Wait for user confirmation because they may want to override the default value before generation"

#### Pattern: SKILL.md 文件大小
- Anthropic 建议 < 500 行
- yuanfang-html-image/SKILL.md 当前 **506 行**（超 6 行）
- 建议把 CLI reference / 12 主题表 拆到 `references/`

#### Pattern: Style Anchor（来自 gen-images-skill）
批量生成多张图时，一个 "anchor" 字符串确保视觉一致。yuanfang 可以加一个 `--style-anchor <text>` 参数。

### 3.4 元认知

**yuanfang 的核心优势**:
1. **全中文生态**（小红书、朋友圈、公众号）— 国际项目都缺
2. **品牌资产工程化**（cache、TTL、override CSS）— 比纯 template 高一档
3. **可扩展 token 系统** — 添加新主题成本极低
4. **完整测试覆盖** — 105 单元测试
5. **零外部资源** — 装饰全 CSS，无字体/CDN 依赖

**yuanfang 的核心劣势**:
1. **国际平台缺失**（YouTube/LinkedIn/Pinterest）
2. **DX 粗糙**（错误处理、文件名 sanitization、平台过滤警告）
3. **没有 hooks** — 依赖 agent 自觉
4. **文档冗长** — 506 行 + 散落的 ref 表格
5. **没出 DPI 选项** — 国际竞品默认 2x

---

## 四、改进路线图（按优先级）

### P0 — 立即修（影响核心使用）
1. **修复 B1/B2/B3**（render.js 核心错误处理） — 1-2 小时
2. **修复 B5**（safeDirName 扩展） — 10 分钟
3. **加 `Stop` hook 强制 4 步流程** — 2 小时

### P1 — 短期（1-2 周）
4. 修复 B4/B6/B7（友好警告 + tilde + 多 spec 警告）
5. 拆 SKILL.md → `references/`（CLI ref、主题表、变量表）
6. 加国际平台：YouTube (1280×720) + LinkedIn (1200×627) + 通用 OG (1200×630)
7. 加重试/降级：2x DPI 选项
8. 加 `--style-anchor` 概念

### P2 — 中期（1 月）
9. 迁移到 MCP server 模式（参考 pixdom），支持 `render_image` / `extract_brand` 工具
10. 加 structured error output（"What happened / How to fix / Example"）
11. 加 "Codebase 扫描" 模式（从本地 tailwind.config / globals.css 提取品牌，不只 URL）
12. 加 Web UI 镜像（参考 social-media-generator）

### P3 — 长期
13. 加动画/视频导出（参考 pixdom auto-mode）
14. 加 A/B test 变体生成（同一内容多主题批量出图）
15. CDN/font 子集化（如果未来扩展更多字体）

---

## 五、关键技术建议

### 5.1 render.js 重构建议
```javascript
// 当前 main() 没有 try/catch
function main() {
  const args = parseArgs(process.argv);
  // ... 可能抛错 ...
}

// 建议改成（参考 extract.js）
async function main() {
  try {
    const args = parseArgs(process.argv);
    // ... 业务逻辑 ...
  } catch (err) {
    console.error(`Error: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}
```

### 5.2 body 转义修复
```javascript
// 当前（有 bug）
'{{CONTENT}}': escapeHtml((content.body || content.content || '').replace(/\n/g, '<br>')),

// 修复
'{{CONTENT}}': escapeHtml(String(content.body || content.content || '')).replace(/\n/g, '<br>'),
```

### 5.3 平台过滤警告
```javascript
// 在 resolvePlatforms 末尾
const unknown = ids.filter(id => id !== 'all' && !GROUPS[id] && !ALL_PLATFORMS[id]);
if (unknown.length > 0) {
  process.stderr.write(`warning: unknown platforms ignored: ${unknown.join(', ')}\n`);
  process.stderr.write(`available: ${Object.keys(ALL_PLATFORMS).join(', ')}\n`);
}
```

### 5.4 Stop Hook 模板
```javascript
// .claude/hooks/yuanfang-pipeline.js
// 维护 .yuanfang/pipeline-state.json
// Step 0 完成 → 才能 extract content / load brand spec
// Step 1 完成 → 才能问 Round 1
// 等等
// exit 2 阻止 tool call
```

### 5.5 SKILL.md 瘦身
拆出来到 `references/`：
- `references/cli-reference.md` — render.js 全部参数
- `references/themes-catalog.md` — 12 主题表
- `references/platform-sizes.md` — 12+ 平台尺寸
- `references/template-variables.md` — `{{TOKEN}}` 系统
- 留下 SKILL.md 只放工作流（300 行以内）

---

## 六、结论

**yuanfang-skills 是一个**：
- ✅ 工程化好（105 测试、token 系统、缓存策略）
- ✅ 中文生态全（小红书、公众号、朋友圈）
- ✅ UX 明确（4 步 + 分轮确认）
- ⚠️ 但有 3 个 HIGH bug 影响真实使用
- ⚠️ 错误处理粗糙（agent 体验差）
- ⚠️ 缺少 hooks 强制（依赖 agent 自觉）
- ❌ 国际平台覆盖不足

**建议优先做**:
1. **本周**: 修 B1/B2/B3 + B5（解决真用户痛点）
2. **下周**: 加 Stop hook（彻底解决 agent 跳步问题）
3. **下月**: 加 YouTube/LinkedIn + 拆文档

**长期定位**:
- 中文社媒配图领域的"事实标准"
- 与国际竞品（coverpress/pixdom）形成差异化

---

**报告完成**。下一步可基于本报告按 P0 优先级修复代码。

# yuanfang-skills

A collection of design + content skills for AI agents. Currently includes:

- **`yuanfang-design/`** — Shared design system (CSS token variables, 18 themes, layout blocks)
- **`yuanfang-html-image/`** — Generate social media images (静态 + 动图 CSS/GIF) from text via HTML + Playwright
- **`yuanfang-html-video/`** — 视频生成 (15-60s, 占位 SOP, 未实现)
- **`yuanfang-html-ppt/`** — Generate .pptx presentations from content.yaml (14 layouts, single dom-to-pptx engine)
- **`yuanfang-content-gen/`** — Multi-platform content generator: brief → copy.md + content.json (纯文案，不出图)
- **`yuanfang-media-suite/`** — 组合层 skill (0 代码)，串起 content-gen + html-image 走完整套多平台内容生产
- **`yuanfang-media-publish/`** — 发布层 skill，PNG/GIF/mp4 → 平台账号 (公众号 API / 小红书 MCP / 朋友圈人工 / 抖音 / 视频号)

## 职责分离 (6-层架构)

| Skill | 职责 | 输入 | 输出 |
|---|---|---|---|
| yuanfang-content-gen | 多平台文案 + 合规 | brief.md | copy.md + content.json |
| yuanfang-html-image | 静态图 + 动图 (CSS/GIF) | content.json | PNG / GIF / WebP |
| yuanfang-html-video | 视频 (15-60s, 占位) | content.json | mp4 |
| yuanfang-html-ppt | PPT 演示 | content.yaml | .pptx |
| yuanfang-media-suite | 组合 (无代码) | 用户的请求 | 串起 content + image |
| yuanfang-media-publish | 发布到平台账号 | PNG / GIF / mp4 | 平台帖子 URL |

普通用户：装全部 6 个 + design。
高级用户：只装自己需要的那 1-2 个。

## 动图 vs 视频

| 类型 | 例子 | 归属 | 现状 |
|---|---|---|---|
| CSS 动效 (单 PNG + 动画) | 入场/过渡/轮播 | `yuanfang-html-image` | ✅ 已支持 (5 内置 keyframes) |
| GIF / WebP 动图 | 表情包/产品 360° | `yuanfang-html-image` | ✅ 已支持 (--format gif --frames N) |
| 短视频 (15-60s) | 抖音/视频号 | `yuanfang-html-video` | 🟡 占位 SOP |

**分界线**：需要音频轨 + 视频引擎 → video；不需要 → image。

## 安装 (OpenCode / Claude Code)

### 1. 克隆仓库

```bash
git clone https://github.com/iyuanfang/yuanfang-skills.git ~/.opencode/repos/yuanfang-skills
cd ~/.opencode/repos/yuanfang-skills
npm install
npx playwright install chromium
```

### 2. 安装为 AI 平台 skill

将 skill 目录 symlink 到你的 agent skill 目录：

**OpenCode:**
```bash
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-design         ~/.config/opencode/skills/yuanfang-design
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-html-image     ~/.config/opencode/skills/yuanfang-html-image
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-html-video     ~/.config/opencode/skills/yuanfang-html-video
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-html-ppt       ~/.config/opencode/skills/yuanfang-html-ppt
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-content-gen    ~/.config/opencode/skills/yuanfang-content-gen
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-media-suite    ~/.config/opencode/skills/yuanfang-media-suite
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-media-publish  ~/.config/opencode/skills/yuanfang-media-publish
```

**Claude Code:**
```bash
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-design         ~/.claude/skills/yuanfang-design
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-html-image     ~/.claude/skills/yuanfang-html-image
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-html-video     ~/.claude/skills/yuanfang-html-video
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-html-ppt       ~/.claude/skills/yuanfang-html-ppt
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-content-gen    ~/.claude/skills/yuanfang-content-gen
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-media-suite    ~/.claude/skills/yuanfang-media-suite
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-media-publish  ~/.claude/skills/yuanfang-media-publish
```

**Codex:**
```bash
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-design     ~/.agents/skills/yuanfang-design
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-html-image ~/.agents/skills/yuanfang-html-image
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-html-ppt   ~/.agents/skills/yuanfang-html-ppt
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-content-gen ~/.agents/skills/yuanfang-content-gen
```

> 每个 skill 需要单独 symlink（OpenCode 没有自动依赖安装）。未来新增 skill 时加一行 symlink 即可。

### 3. 验证

重启 AI 平台，输入 `@yuanfang-html-image` 检查 skill 是否加载。也可直接运行 CLI 测试：

```bash
node yuanfang-html-image/scripts/render.js \
  --title "Hello" --content "World" \
  --theme minimal-white --layout cover \
  --platforms xiaohongshu-v \
  --preview
```

测试 yuanfang-html-ppt:
```bash
node yuanfang-html-ppt/scripts/render.js \
  --file yuanfang-html-ppt/tests/fixtures/content-content.json \
  --skip-confirm \
  --output /tmp/test.pptx
```

PPT 渲染会使用 content.json 里的 `theme` 和 `brand` 字段, 也可通过 CLI flag 覆盖:
```bash
node yuanfang-html-ppt/scripts/render.js \
  --file content.json --theme dark-gold \
  --brand-spec ./brand-spec.json \
  --skip-confirm --output deck.pptx
```

### 更新

```bash
cd ~/.opencode/repos/yuanfang-skills
git pull
npm install
```

## 架构

```
yuanfang-skills/                        ← 整个仓库 clone 到 ~/.opencode/repos/
├── yuanfang-design/                    ← 基座 skill：CSS token、18 主题、布局模板
│   ├── base.css                        （其他 skill 通过 ../../yuanfang-design/ 引用）
│   └── themes/*.css
├── yuanfang-html-image/                ← 消费者 skill：生成社交媒体配图
│   └── scripts/render.js → 依赖 → ../../yuanfang-design/
├── yuanfang-html-ppt/                  ← PPTX 生成（dom-to-pptx，14 布局，18 主题）
│   ├── SKILL.md
│   ├── scripts/
│   └── tests/
└── yuanfang-content-gen/               ← 内容编排 skill：多平台文案 + 配图生成
    ├── SKILL.md
    └── output/
```

所有 skill 共享同一个 `yuanfang-design/` 设计系统。`render.js` 通过 `__dirname` 的 `../../` 定位到仓库根目录，再找 `yuanfang-design/`——symlink 指向真实路径，所以始终能正确解析。

## License

MIT — see [LICENSE](LICENSE).

# yuanfang-skills

A collection of design + content skills for AI agents. Currently includes:

- **`yuanfang-design/`** — Shared design system (CSS token variables, 12 themes, layout blocks)
- **`yuanfang-html-image/`** — Generate social media images from text via HTML + Playwright
- **`yuanfang-html-ppt/`** — *(planned)* HTML presentations

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
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-design     ~/.config/opencode/skills/yuanfang-design
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-html-image ~/.config/opencode/skills/yuanfang-html-image
```

**Claude Code:**
```bash
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-design     ~/.claude/skills/yuanfang-design
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-html-image ~/.claude/skills/yuanfang-html-image
```

**Codex:**
```bash
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-design     ~/.agents/skills/yuanfang-design
ln -s ~/.opencode/repos/yuanfang-skills/yuanfang-html-image ~/.agents/skills/yuanfang-html-image
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

### 更新

```bash
cd ~/.opencode/repos/yuanfang-skills
git pull
npm install
```

## 架构

```
yuanfang-skills/                    ← 整个仓库 clone 到 ~/.opencode/repos/
├── yuanfang-design/                ← 基座 skill：CSS token、12 主题、布局模板
│   ├── base.css                    （其他 skill 通过 ../../yuanfang-design/ 引用）
│   └── themes/*.css
├── yuanfang-html-image/            ← 消费者 skill：生成社交媒体配图
│   └── scripts/render.js → 依赖 → ../../yuanfang-design/
└── yuanfang-html-ppt/              ← (未来)
```

所有 skill 共享同一个 `yuanfang-design/` 设计系统。`render.js` 通过 `__dirname` 的 `../../` 定位到仓库根目录，再找 `yuanfang-design/`——symlink 指向真实路径，所以始终能正确解析。

## License

MIT — see [LICENSE](LICENSE).

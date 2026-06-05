# yuanfang-skills

A collection of design + content skills for AI agents. Currently includes:

- **`yuanfang-design/`** — Shared design system (token CSS variables, themes, layout blocks)
- **`yuanfang-html-image/`** — Generate social media images from text via HTML + Playwright
- **`yuanfang-html-ppt/`** — *(planned)* Generate HTML presentations

## Installation

Clone the repo:
```bash
git clone https://github.com/<org>/yuanfang-skills.git
cd yuanfang-skills
npm install
npx playwright install chromium
```

## Quick start

```bash
# Render an image
node yuanfang-html-image/scripts/render.js \
  --title "Hello" --content "World" \
  --theme minimal-white --layout cover \
  --platforms xiaohongshu-v
```

## Layout

```
yuanfang-skills/
├── yuanfang-design/        # Token system, themes, layout-types
├── yuanfang-html-image/    # Image output skill
└── (future) yuanfang-html-ppt/
```

## License

MIT — see [LICENSE](LICENSE).

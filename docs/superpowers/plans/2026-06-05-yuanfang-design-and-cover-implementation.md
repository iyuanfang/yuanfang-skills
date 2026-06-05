# yuanfang-design & cover Layout-type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a new standalone `yuanfang-skills` repository (sibling to `aics`, future public GitHub), migrate the existing `aics/src/marketing/yuanfang-skills/` content into it, and build the first iteration of `yuanfang-design` shared design library + `cover` layout-type, with 12 themes extracted from existing templates and 72-image regression coverage.

**Architecture:** Token-driven design system (base.css tokens + theme .css files + layout-type HTML blocks). `yuanfang-design/` is the parent skill providing shared resources; `yuanfang-html-image/` consumes them via relative paths. One `cover.html` layout block + 12 theme files = 12 visual styles, all sharing the same responsive logic.

**Tech Stack:** Node.js (render.js), Playwright (screenshot), vanilla HTML/CSS/JS, Python (extract.py)

**Spec:** `docs/superpowers/specs/2026-06-05-yuanfang-html-image-optimization-design.md`

---

## File Structure

**New repo (target path: `/home/yf/workspace/opencode/yuanfang-skills/`)**:

```
yuanfang-skills/
├── README.md                                 NEW
├── LICENSE                                   NEW (MIT)
├── .gitignore                                NEW
│
├── yuanfang-design/                          NEW
│   ├── SKILL.md                              NEW
│   ├── base.css                              NEW (~80 lines, all token defaults)
│   ├── themes/                               NEW
│   │   ├── minimal-white.css                 NEW (extracted from 01-minimalist)
│   │   ├── dark-gold.css                     NEW (extracted from 02-dark-gold)
│   │   ├── editorial.css                     NEW
│   │   ├── warm-handdrawn.css                NEW
│   │   ├── tech-modern.css                   NEW
│   │   ├── bold-poster.css                   NEW
│   │   ├── data-infographic.css              NEW
│   │   ├── eastern.css                       NEW
│   │   ├── magazine-cover.css                NEW
│   │   ├── split-screen.css                  NEW
│   │   ├── minimal-white-editorial.css       NEW
│   │   └── list-ranking.css                  NEW
│   ├── layout-types/
│   │   └── cover.html                        NEW (~200 lines)
│   ├── animations.css                        NEW (placeholder)
│   ├── references/
│   │   └── authoring-guide.md                NEW
│   ├── showcase/
│   │   ├── cover-showcase.html               NEW
│   │   └── generate.js                       NEW (auto-screenshot for archive)
│   └── tests/
│       └── test-base-tokens.js               NEW
│
├── yuanfang-html-image/                      MIGRATED (from aics)
│   ├── SKILL.md                              MODIFIED
│   ├── scripts/
│   │   ├── render.js                         MODIFIED (theme + layout injection)
│   │   └── extract.py                        MIGRATED
│   ├── tests/
│   │   ├── test-render-themes.js             NEW
│   │   ├── test-render-tokens.js             NEW
│   │   ├── test-render-assembly.js           NEW
│   │   └── test-render-compat.js             NEW
│   └── output/                               (gitignored)
│
└── package.json                              NEW (Playwright dep, npm scripts)

> **Note**: `huashu-skills/` is **not** part of yuanfang-skills. It remains in aics.
> Only `yuanfang-html-image/` migrates from aics to the new repo.
```

**Files deleted from aics**: `aics/src/marketing/yuanfang-skills/` (entire directory, after migration confirmed)

---

## Task 1: Create New Repository `yuanfang-skills`

**Files:**
- Create: `/home/yf/workspace/opencode/yuanfang-skills/`
- Create: `/home/yf/workspace/opencode/yuanfang-skills/README.md`
- Create: `/home/yf/workspace/opencode/yuanfang-skills/LICENSE`
- Create: `/home/yf/workspace/opencode/yuanfang-skills/.gitignore`

- [ ] **Step 1: Create the directory and initialize git**

```bash
mkdir -p /home/yf/workspace/opencode/yuanfang-skills
cd /home/yf/workspace/opencode/yuanfang-skills
git init
git config user.email "you@example.com"  # use existing if set
git config user.name "Your Name"
```

Expected: `Initialized empty Git repository in /home/yf/workspace/opencode/yuanfang-skills/.git/`

- [ ] **Step 2: Create README.md**

```markdown
# yuanfang-skills

A collection of design + content skills for AI agents. Currently includes:

- **`yuanfang-design/`** — Shared design system (token CSS variables, themes, layout blocks)
- **`yuanfang-html-image/`** — Generate social media images from text via HTML + Playwright
- **`yuanfang-html-ppt/`** — *(planned)* Generate HTML presentations

## Installation

Clone the repo:
\`\`\`bash
git clone https://github.com/<org>/yuanfang-skills.git
\`\`\`

## License

MIT — see [LICENSE](LICENSE).
```

- [ ] **Step 3: Create LICENSE (MIT)**

```bash
# Use the standard MIT template with current year and your name
printf 'MIT License\n\nCopyright (c) 2026 Yuanfang Contributors\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n' > /home/yf/workspace/opencode/yuanfang-skills/LICENSE
```

- [ ] **Step 4: Create .gitignore**

```bash
cat > /home/yf/workspace/opencode/yuanfang-skills/.gitignore <<'EOF'
# Outputs (regenerated by render)
**/output/
!yuanfang-design/showcase/output/.gitkeep

# Dependencies
node_modules/
.venv/

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp
*~
EOF
```

- [ ] **Step 5: Initial commit**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git add README.md LICENSE .gitignore
git commit -m "chore: init yuanfang-skills repo with README/LICENSE/gitignore"
```

Expected: 1 commit on master branch.

---

## Task 2: Migrate `yuanfang-html-image/` from aics

**Files:**
- Move: `aics/src/marketing/yuanfang-skills/yuanfang-html-image/` → `yuanfang-skills/yuanfang-html-image/`
- Move: `aics/src/marketing/yuanfang-skills/SKILL.md` → `yuanfang-skills/SKILL.md` (if exists)
- Move: `aics/src/marketing/yuanfang-skills/publish-guide.md` → `yuanfang-skills/publish-guide.md` (if exists)

> **DO NOT migrate** `aics/src/marketing/yuanfang-skills/huashu-skills/` — it stays in aics.

- [ ] **Step 1: Verify aics has the content (sanity check)**

```bash
ls /home/yf/workspace/opencode/aics/src/marketing/yuanfang-skills/
```
Expected: directories `huashu-skills/`, `yuanfang-html-image/`, and possibly `SKILL.md`, `publish-guide.md`

- [ ] **Step 2: Copy yuanfang-html-image only**

```bash
cp -r /home/yf/workspace/opencode/aics/src/marketing/yuanfang-skills/yuanfang-html-image /home/yf/workspace/opencode/yuanfang-skills/yuanfang-html-image
```

- [ ] **Step 3: Copy ancillary files if they exist**

```bash
SRC=/home/yf/workspace/opencode/aics/src/marketing/yuanfang-skills
DST=/home/yf/workspace/opencode/yuanfang-skills
for f in SKILL.md publish-guide.md; do
  if [ -e "$SRC/$f" ]; then
    cp -r "$SRC/$f" "$DST/"
    echo "copied $f"
  fi
done
```

- [ ] **Step 4: Verify migration**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
ls
echo "---yuanfang-html-image templates count---"
ls yuanfang-html-image/templates/ | wc -l
```

Expected: `12` (for templates count). `huashu-skills/` should NOT appear.

- [ ] **Step 5: Initial commit of migrated content**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git add yuanfang-html-image/ SKILL.md publish-guide.md 2>/dev/null
git commit -m "feat: migrate yuanfang-html-image from aics (huashu-skills stays in aics)"
```

- [ ] **Step 6: Do NOT delete from aics yet** (deferred to Task 16)

Note: Leave `aics/src/marketing/yuanfang-skills/yuanfang-html-image/` in place until Task 16 explicitly handles the aics-side transition. `huashu-skills/` remains untouched in aics.

---

## Task 3: Set Up Node.js Test Infrastructure

**Files:**
- Create: `/home/yf/workspace/opencode/yuanfang-skills/package.json`

- [ ] **Step 1: Create package.json**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
cat > package.json <<'EOF'
{
  "name": "yuanfang-skills",
  "version": "0.1.0",
  "private": true,
  "description": "Design + content skills for AI agents (yuanfang-design, yuanfang-html-image)",
  "scripts": {
    "test": "node --test yuanfang-design/tests/ yuanfang-html-image/tests/",
    "render": "node yuanfang-html-image/scripts/render.js",
    "showcase": "node yuanfang-design/showcase/generate.js"
  },
  "dependencies": {
    "playwright": "^1.40.0"
  },
  "license": "MIT"
}
EOF
```

- [ ] **Step 2: Install dependencies**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
npm install
npx playwright install chromium
```

Expected: `node_modules/` created, Chromium downloaded.

- [ ] **Step 3: Create test directory structure**

```bash
mkdir -p yuanfang-design/tests yuanfang-html-image/tests
```

- [ ] **Step 4: Create a smoke test to verify test runner works**

Create file `yuanfang-design/tests/smoke.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');

test('test runner works', () => {
  assert.strictEqual(1 + 1, 2);
});
```

- [ ] **Step 5: Run the smoke test**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
npm test
```

Expected: `tests 1`, `pass 1`, `fail 0`

- [ ] **Step 6: Commit**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git add package.json package-lock.json
git commit -m "chore: setup node deps and test infrastructure"
```

---

## Task 4: Create `yuanfang-design` Skeleton + base.css Token System

**Files:**
- Create: `yuanfang-skills/yuanfang-design/SKILL.md`
- Create: `yuanfang-skills/yuanfang-design/base.css`
- Create: `yuanfang-skills/yuanfang-design/tests/test-base-tokens.js`

- [ ] **Step 1: Create the directory structure**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
mkdir -p yuanfang-design/themes yuanfang-design/layout-types yuanfang-design/references yuanfang-design/showcase
```

- [ ] **Step 2: Create the failing test for base.css tokens**

Create `yuanfang-design/tests/test-base-tokens.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const BASE_CSS_PATH = path.join(__dirname, '..', 'base.css');

test('base.css exists', () => {
  assert.ok(fs.existsSync(BASE_CSS_PATH), 'base.css should exist');
});

test('base.css defines required color tokens', () => {
  const css = fs.readFileSync(BASE_CSS_PATH, 'utf-8');
  for (const token of ['--bg', '--text', '--accent', '--secondary', '--bg-alt']) {
    assert.ok(css.includes(`${token}:`), `base.css must define ${token}`);
  }
});

test('base.css defines required type tokens', () => {
  const css = fs.readFileSync(BASE_CSS_PATH, 'utf-8');
  for (const token of ['--font-title', '--font-body']) {
    assert.ok(css.includes(`${token}:`), `base.css must define ${token}`);
  }
});

test('base.css defines required size tokens (5 ratios)', () => {
  const css = fs.readFileSync(BASE_CSS_PATH, 'utf-8');
  for (const token of ['--title-size-v', '--title-size-s', '--title-size-w', '--title-size-c', '--content-size']) {
    assert.ok(css.includes(`${token}:`), `base.css must define ${token}`);
  }
});

test('base.css defines decor tokens', () => {
  const css = fs.readFileSync(BASE_CSS_PATH, 'utf-8');
  for (const token of ['--decor-tl', '--decor-tr', '--decor-bl', '--decor-br']) {
    assert.ok(css.includes(`${token}:`), `base.css must define ${token}`);
  }
});

test('base.css defines feature flags', () => {
  const css = fs.readFileSync(BASE_CSS_PATH, 'utf-8');
  for (const token of ['--accent-line', '--accent-block', '--terminal-bar', '--grid-bg', '--seal']) {
    assert.ok(css.includes(`${token}:`), `base.css must define ${token}`);
  }
});

test('base.css has zero hardcoded color literals in .cover rules', () => {
  const css = fs.readFileSync(BASE_CSS_PATH, 'utf-8');
  // Find all `.cover { ... }` blocks; check no hex/rgb in color/background
  const coverBlocks = css.match(/\.cover[^{]*\{[^}]*\}/g) || [];
  for (const block of coverBlocks) {
    assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(block), 'cover block must not contain hex colors; use var(--*)');
  }
});
```

- [ ] **Step 3: Run the test to confirm it fails**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
npm test
```

Expected: tests fail with "base.css should exist" or similar.

- [ ] **Step 4: Create base.css with full token system**

Create `yuanfang-design/base.css`:

```css
/* yuanfang-design/base.css
 * Token defaults for all themes. Themes override these via [data-theme="..."] selectors.
 * No literal colors, sizes, or decorations allowed in the .cover rules below.
 */

:root {
  /* === Color (60-30-10) === */
  --bg: #FFFFFF;          /* 60% background */
  --text: #0F172A;        /* main text */
  --accent: #4F46E5;      /* 10% emphasis */
  --secondary: #64748B;   /* 30% secondary */
  --bg-alt: #F8FAFC;      /* card / alt background */

  /* === Type === */
  --font-title: "Outfit", "PingFang SC", -apple-system, system-ui, sans-serif;
  --font-body:  "Outfit", "PingFang SC", -apple-system, system-ui, sans-serif;

  /* === Size (per aspect ratio) === */
  --title-size-v: 130px;  /* 3:4 portrait + 9:16 tall */
  --title-size-s: 96px;   /* 1:1 square */
  --title-size-w: 88px;   /* 16:9 wide */
  --title-size-c: 64px;   /* 2.35:1 cover + 1.9:1 OG */
  --content-size: 38px;
  --badge-size: 18px;
  --source-size: 14px;

  /* === Space (4-step rhythm) === */
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 48px;

  /* === Radius / shadow === */
  --radius: 12px;
  --shadow: 0 8px 32px rgba(0,0,0,.08);

  /* === Decor (4 corners) === */
  --decor-tl: none;
  --decor-tr: none;
  --decor-bl: none;
  --decor-br: none;

  /* === Feature flags (0/1) === */
  --accent-line: 0;       /* top 4px accent bar */
  --accent-block: 0;      /* right side accent block */
  --terminal-bar: 0;      /* terminal-style traffic light dots */
  --grid-bg: 0;           /* grid background */
  --seal: "";             /* seal text */
}

/* === Base body reset === */
* { margin: 0; padding: 0; box-sizing: border-box; }

/* === Cover layout — uses tokens only, zero literals === */
.cover {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: var(--space-4);
  overflow: hidden;
}

.cover__title {
  font-family: var(--font-title);
  font-weight: 900;
  font-size: var(--title-size-v);
  line-height: 1.0;
  letter-spacing: -0.03em;
  color: var(--text);
  margin-bottom: var(--space-3);
  max-width: 90%;
}

.cover__content {
  font-size: var(--content-size);
  font-weight: 400;
  line-height: 1.7;
  color: var(--secondary);
  max-width: 88%;
  margin-bottom: var(--space-3);
}

.cover__badge {
  font-size: var(--badge-size);
  font-weight: 600;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: var(--space-3);
  opacity: 0.85;
}

.cover__points {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.cover__points li {
  font-size: calc(var(--content-size) - 8px);
  color: var(--accent);
  padding: var(--space-1) var(--space-2);
  border-top: 1px solid var(--accent);
  opacity: 0.85;
}
.cover__points:empty { display: none; }

.cover__source {
  position: absolute;
  bottom: var(--space-3);
  left: var(--space-4);
  font-size: var(--source-size);
  color: var(--secondary);
  opacity: 0.5;
  letter-spacing: 0.15em;
}

.cover__brand {
  position: absolute;
  bottom: var(--space-3);
  right: var(--space-4);
  font-family: var(--font-title);
  font-size: calc(var(--content-size) - 10px);
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--accent);
  opacity: 0.6;
}

.cover__decor {
  position: absolute;
  display: none;
  pointer-events: none;
}
.cover__decor--tl { top: 0; left: 0; width: 40%; height: 40%; background: var(--decor-tl); }
.cover__decor--tr { top: 0; right: 0; width: 40%; height: 40%; background: var(--decor-tr); }
.cover__decor--bl { bottom: 0; left: 0; width: 40%; height: 40%; background: var(--decor-bl); }
.cover__decor--br { bottom: 0; right: 0; width: 40%; height: 40%; background: var(--decor-br); }

.cover__accent-line {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
  background: var(--accent);
  display: block;
}

.cover__accent-block {
  position: absolute;
  right: 0; top: 0; bottom: 0;
  width: 24%;
  background: var(--accent);
  display: block;
}

.cover__terminal-bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 32px;
  background: var(--bg-alt);
  display: flex;
  align-items: center;
  padding: 0 var(--space-2);
  gap: 6px;
}
.cover__terminal-bar span {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--secondary);
}

.cover__grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(0deg, transparent 0%, var(--secondary) 1px, transparent 1px),
    linear-gradient(90deg, transparent 0%, var(--secondary) 1px, transparent 1px);
  background-size: 50px 50px;
  opacity: 0.05;
  display: block;
}

.cover__seal {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  width: 64px; height: 64px;
  border: 2px solid var(--accent);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--badge-size);
  font-weight: 700;
  color: var(--accent);
  opacity: 0.7;
}

/* === Responsive: 5 aspect ratios + 1 tall portrait === */

/* 1:1 square (≤ 5/4) */
@media (max-aspect-ratio: 5/4) {
  .cover { align-items: center; text-align: center; padding: var(--space-3); }
  .cover__title { font-size: var(--title-size-s); max-width: 95%; }
  .cover__points { justify-content: center; }
}

/* 16:9 wide (≥ 5/4 and < 7/3) */
@media (min-aspect-ratio: 5/4) and (max-aspect-ratio: 7/3) {
  .cover { flex-direction: row; padding: var(--space-4) calc(var(--space-4) * 1.5); gap: var(--space-4); }
  .cover__title { font-size: var(--title-size-w); max-width: 60%; }
  .cover__content { max-width: 55%; }
  .cover__points { flex-direction: column; max-width: 35%; }
}

/* very wide (≥ 7/3) — editorial horizontal */
@media (min-aspect-ratio: 7/3) {
  .cover { align-items: center; text-align: center; padding: var(--space-3) calc(var(--space-4) * 2); }
  .cover__title { font-size: var(--title-size-c); max-width: 100%; }
  .cover__points { justify-content: center; }
  .cover__content { max-width: 70%; }
}

/* 2.35:1 cover (specific — hides points) */
@media (aspect-ratio: 47/20) {
  .cover__title { font-size: var(--title-size-c); }
  .cover__points { display: none; }
}

/* 9:16 tall portrait */
@media (max-aspect-ratio: 9/16) {
  .cover { padding: calc(var(--space-4) * 2) var(--space-4); }
  .cover__title { font-size: var(--title-size-v); max-width: 95%; }
}
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
npm test
```

Expected: `tests 7`, `pass 7`, `fail 0`

- [ ] **Step 6: Commit**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git add yuanfang-design/base.css yuanfang-design/tests/
git commit -m "feat(yuanfang-design): add base.css token system with 30+ tokens and .cover rules"
```

---

## Task 5: Create `yuanfang-design` SKILL.md

**Files:**
- Create: `yuanfang-skills/yuanfang-design/SKILL.md`

- [ ] **Step 1: Create SKILL.md**

```markdown
---
name: yuanfang-design
description: |
  Shared design system for yuanfang-skills. Provides token CSS variables, 12+ themes, and reusable layout-type HTML blocks. Used by yuanfang-html-image (and future yuanfang-html-ppt) to render visually consistent output.
  When user asks to "add a new theme", "add a new layout", or "view the design system", use this skill.
---

# yuanfang-design

Shared design library providing:

- **base.css** — 30+ token CSS variables (colors, fonts, sizes, space, radius, shadow, decor, feature flags)
- **themes/** — 12 theme overrides, each as a single CSS file using `[data-theme="..."]` selectors
- **layout-types/** — Reusable HTML blocks (cover.html, future bullets/kpi-grid/etc.)
- **showcase/** — Visual QA tool: 12 themes × 6 platforms = 72 iframes in a grid
- **references/authoring-guide.md** — Rules for adding new themes/layout-types

## When to use

Use this skill when:
- The user wants to add a new visual style → create a new theme file
- The user wants to add a new layout type (e.g., bullets, kpi-grid) → create new HTML block
- The user wants to view all themes/layouts at once → open the showcase
- The user wants to understand the design system → read authoring-guide.md

## Structure

\`\`\`
yuanfang-design/
├── base.css              # All token defaults (no literals in .cover rules)
├── themes/<name>.css     # Each theme = token override set
├── layout-types/<name>.html
├── animations.css        # Shared animation library (placeholder for now)
├── references/authoring-guide.md
└── showcase/cover-showcase.html
\`\`\`

## How themes work

A theme is a single CSS file that overrides base.css tokens:

\`\`\`css
[data-theme="dark-gold"] {
  --bg: #1A1A2E;
  --text: #F5E6D3;
  --accent: #E2B714;
  /* ... */
}
\`\`\`

The `cover.html` layout-type references tokens only. Swapping the theme = reskinning the entire layout.

## How to add a new theme

1. Copy `themes/_template.css` to `themes/<name>.css`
2. Override tokens for: colors, fonts, sizes, decor, feature flags
3. Test: \`npm run render -- --theme <name> --layout cover --platforms xiaohongshu-v\`
4. Update showcase/cover-showcase.html to include the new theme

## How to add a new layout-type

1. Create `layout-types/<name>.html` with `{{}}` placeholders for content
2. Add corresponding `.layout-<name>` rules to base.css (or new file)
3. Test: \`npm run render -- --theme minimal-white --layout <name> --platforms all\`
4. Add to showcase
```

(Note: Adjust the backticks to escape properly in your editor.)

- [ ] **Step 2: Commit**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git add yuanfang-design/SKILL.md
git commit -m "docs(yuanfang-design): add SKILL.md"
```

---

## Task 6: Extract Theme `minimal-white` from Old Template 01

**Files:**
- Create: `yuanfang-skills/yuanfang-design/themes/minimal-white.css`
- Reference: `yuanfang-skills/yuanfang-html-image/templates/01-minimalist/template.json`
- Reference: `yuanfang-skills/yuanfang-html-image/templates/01-minimalist/template.html`

- [ ] **Step 1: Read the old template config**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
cat yuanfang-html-image/templates/01-minimalist/template.json
```

Expected: colors, fonts, sizes, etc.

- [ ] **Step 2: Read the old template HTML for any unique decor**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
grep -E "background|color|font" yuanfang-html-image/templates/01-minimalist/template.html | head -20
```

Note any chrome elements (top accent line, right accent block, vertical brand text).

- [ ] **Step 3: Create minimal-white.css**

Create `yuanfang-design/themes/minimal-white.css`:

```css
/* themes/minimal-white.css — extracted from yuanfang-html-image/templates/01-minimalist/ */

[data-theme="minimal-white"] {
  /* Color */
  --bg: #FFFFFF;
  --text: #0F172A;
  --accent: #4F46E5;
  --secondary: #64748B;
  --bg-alt: #F8FAFC;

  /* Type */
  --font-title: "Outfit", "PingFang SC", -apple-system, system-ui, sans-serif;
  --font-body:  "Outfit", "PingFang SC", -apple-system, system-ui, sans-serif;

  /* Size */
  --title-size-v: 140px;
  --title-size-s: 110px;
  --title-size-w: 86px;
  --title-size-c: 66px;
  --content-size: 38px;

  /* Decor */
  --decor-tl: none;
  --decor-tr: none;
  --decor-bl: none;
  --decor-br: none;

  /* Feature flags */
  --accent-line: 1;       /* 4px top accent line */
  --accent-block: 1;      /* right accent block */
  --terminal-bar: 0;
  --grid-bg: 0;
  --seal: "";
}
```

- [ ] **Step 4: Commit**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git add yuanfang-design/themes/minimal-white.css
git commit -m "feat(yuanfang-design): extract minimal-white theme from 01-minimalist"
```

---

## Task 7: Create `cover.html` Layout-type

**Files:**
- Create: `yuanfang-skills/yuanfang-design/layout-types/cover.html`

- [ ] **Step 1: Create cover.html with token-only structure**

Create `yuanfang-design/layout-types/cover.html`:

```html
<!-- yuanfang-design/layout-types/cover.html
     Token-only structure. The .cover rules in base.css handle all visual rendering.
     This file is a clean semantic skeleton; all decoration is theme-controlled. -->

<div class="cover" data-theme="{{THEME}}">
  <div class="cover__decor cover__decor--tl"></div>
  <div class="cover__decor cover__decor--tr"></div>
  <div class="cover__decor cover__decor--bl"></div>
  <div class="cover__decor cover__decor--br"></div>

  <div class="cover__accent-line"></div>
  <div class="cover__accent-block"></div>
  <div class="cover__terminal-bar"><span></span><span></span><span></span></div>
  <div class="cover__grid-bg"></div>
  <div class="cover__seal">{{SEAL}}</div>

  <div class="cover__badge">{{BADGE}}</div>
  <h1 class="cover__title">{{TITLE}}</h1>
  <p class="cover__content">{{CONTENT}}</p>
  <ul class="cover__points">{{POINTS_HTML}}</ul>

  <div class="cover__source">{{SOURCE}}</div>
  <div class="cover__brand">{{BRAND}}</div>
</div>
```

- [ ] **Step 2: Verify file exists and is non-empty**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
wc -l yuanfang-design/layout-types/cover.html
```

Expected: ≥ 20 lines

- [ ] **Step 3: Commit**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git add yuanfang-design/layout-types/cover.html
git commit -m "feat(yuanfang-design): add cover layout-type with token-only structure"
```

---

## Task 8: Refactor `render.js` to Load Theme + Layout

**Files:**
- Modify: `yuanfang-skills/yuanfang-html-image/scripts/render.js`
- Create: `yuanfang-skills/yuanfang-html-image/tests/test-render-themes.js`
- Create: `yuanfang-skills/yuanfang-html-image/tests/test-render-tokens.js`
- Create: `yuanfang-skills/yuanfang-html-image/tests/test-render-assembly.js`
- Create: `yuanfang-skills/yuanfang-html-image/tests/test-render-compat.js`

- [ ] **Step 1: Create test for theme listing**

Create `yuanfang-html-image/tests/test-render-themes.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const { listThemes, listLayouts } = require('../scripts/render');

test('listThemes returns 12 themes from yuanfang-design/themes/', () => {
  const themes = listThemes();
  assert.strictEqual(themes.length, 12, 'should find 12 themes');
  assert.ok(themes.includes('minimal-white'));
  assert.ok(themes.includes('dark-gold'));
  assert.ok(themes.includes('tech-modern'));
});

test('listLayouts returns at least 1 layout', () => {
  const layouts = listLayouts();
  assert.ok(layouts.includes('cover'), 'should include cover');
});
```

- [ ] **Step 2: Create test for token replacement**

Create `yuanfang-html-image/tests/test-render-tokens.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const { renderHTML } = require('../scripts/render');

test('replaces basic text tokens', () => {
  const html = '<h1>{{TITLE}}</h1><p>{{CONTENT}}</p>';
  const result = renderHTML(html, { title: 'Hello', content: 'World' }, {}, { width: 100, height: 100, id: 'test' });
  assert.ok(result.includes('<h1>Hello</h1>'));
  assert.ok(result.includes('<p>World</p>'));
});

test('replaces ACCENT__Axx to rgba', () => {
  const html = '<div style="background: {{ACCENT__A20}}"></div>';
  const result = renderHTML(html, {}, { colors: { accent: '#4F46E5' } }, { width: 100, height: 100, id: 'test' });
  // A20 = 0x20 / 255 = 0.125
  assert.ok(result.includes('rgba(79,70,229,0.125'), `expected rgba with alpha 0.125, got: ${result}`);
});

test('handles missing tokens gracefully (leaves {{TOKEN}} as-is)', () => {
  const html = '<div>{{UNKNOWN}}</div>';
  const result = renderHTML(html, {}, {}, { width: 100, height: 100, id: 'test' });
  assert.ok(result.includes('{{UNKNOWN}}'), 'unknown tokens should be left untouched');
});
```

- [ ] **Step 3: Create test for HTML assembly**

Create `yuanfang-html-image/tests/test-render-assembly.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const { assembleHTML } = require('../scripts/render');

test('assembles full HTML with data-theme attribute', () => {
  const result = assembleHTML({
    themeName: 'minimal-white',
    themeCSS: '[data-theme="minimal-white"] { --bg: #FFF; }',
    baseCSS: ':root { --bg: #FFF; --text: #000; }',
    layoutHTML: '<div class="cover">{{TITLE}}</div>',
    content: { title: 'Hello' },
  });
  assert.ok(result.includes('data-theme="minimal-white"'));
  assert.ok(result.includes('--bg: #FFF'));
  assert.ok(result.includes('<h1>Hello</h1>') || result.includes('Hello'));
});

test('sets viewport meta with width/height', () => {
  const result = assembleHTML({
    themeName: 'minimal-white',
    themeCSS: '',
    baseCSS: ':root {}',
    layoutHTML: '<div></div>',
    content: {},
    width: 1080,
    height: 1440,
  });
  assert.ok(result.includes('width=1080'));
  assert.ok(result.includes('height=1440'));
});
```

- [ ] **Step 4: Create test for backward compat**

Create `yuanfang-html-image/tests/test-render-compat.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const { parseArgs, resolveTemplate } = require('../scripts/render');

test('parseArgs accepts --theme and --layout', () => {
  const args = parseArgs(['node', 'render.js', '--theme', 'dark-gold', '--layout', 'cover']);
  assert.strictEqual(args.theme, 'dark-gold');
  assert.strictEqual(args.layout, 'cover');
});

test('parseArgs accepts legacy --template 1', () => {
  const args = parseArgs(['node', 'render.js', '--template', '1']);
  assert.strictEqual(args.template, '1');
});

test('resolveTemplate maps --template 1 to minimal-white/cover', () => {
  const args = { template: '1' };
  const resolved = resolveTemplate(args);
  assert.strictEqual(resolved.theme, 'minimal-white');
  assert.strictEqual(resolved.layout, 'cover');
});

test('resolveTemplate prioritizes --theme over --template', () => {
  const args = { template: '1', theme: 'dark-gold' };
  const resolved = resolveTemplate(args);
  assert.strictEqual(resolved.theme, 'dark-gold');
});
```

- [ ] **Step 5: Run tests — they should all fail (render.js not yet refactored)**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
npm test
```

Expected: 4 files fail with "Cannot find module '../scripts/render'"

- [ ] **Step 6: Refactor render.js**

Overwrite `yuanfang-html-image/scripts/render.js` with:

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.join(SCRIPT_DIR, '..', '..');
const DESIGN_DIR = path.join(REPO_ROOT, 'yuanfang-design');
const BASE_CSS_PATH = path.join(DESIGN_DIR, 'base.css');
const THEMES_DIR = path.join(DESIGN_DIR, 'themes');
const LAYOUTS_DIR = path.join(DESIGN_DIR, 'layout-types');

// === All platforms (preserved from old render.js) ===
const ALL_PLATFORMS = {
  'xiaohongshu-v':    { id: 'xiaohongshu-v',    width: 1080, height: 1440, label: '小红书竖版' },
  'xiaohongshu-s':    { id: 'xiaohongshu-s',    width: 1080, height: 1080, label: '小红书方版' },
  'wechat-cover':     { id: 'wechat-cover',     width: 900,  height: 383,  label: '公众号头图' },
  'wechat-thumb':     { id: 'wechat-thumb',     width: 300,  height: 300,  label: '公众号小图' },
  'moments':          { id: 'moments',          width: 1080, height: 1080, label: '朋友圈' },
  'weibo':            { id: 'weibo',            width: 1080, height: 608,  label: '微博' },
  'toutiao':          { id: 'toutiao',          width: 1080, height: 500,  label: '头条号' },
  'douyin-cover':     { id: 'douyin-cover',     width: 1080, height: 1920, label: '抖音封面' },
  'bilibili-cover':   { id: 'bilibili-cover',   width: 1920, height: 1080, label: 'B站封面' },
  'twitter':          { id: 'twitter',          width: 1200, height: 675,  label: 'Twitter/X' },
  'a4':               { id: 'a4',               width: 2480, height: 3508, label: 'A4海报(300dpi)' },
  'a3':               { id: 'a3',               width: 3508, height: 4960, label: 'A3海报(300dpi)' },
};

const GROUPS = {
  'xiaohongshu': ['xiaohongshu-v', 'xiaohongshu-s'],
  'wechat':      ['wechat-cover', 'wechat-thumb', 'moments'],
};

// === Exports for tests ===
function listThemes() {
  if (!fs.existsSync(THEMES_DIR)) return [];
  return fs.readdirSync(THEMES_DIR)
    .filter(f => f.endsWith('.css'))
    .map(f => f.replace(/\.css$/, ''))
    .sort();
}

function listLayouts() {
  if (!fs.existsSync(LAYOUTS_DIR)) return [];
  return fs.readdirSync(LAYOUTS_DIR)
    .filter(f => f.endsWith('.html'))
    .map(f => f.replace(/\.html$/, ''))
    .sort();
}

function loadTheme(themeName) {
  const p = path.join(THEMES_DIR, `${themeName}.css`);
  if (!fs.existsSync(p)) throw new Error(`Theme not found: ${themeName}. Available: ${listThemes().join(', ')}`);
  return fs.readFileSync(p, 'utf-8');
}

function loadLayout(layoutName) {
  const p = path.join(LAYOUTS_DIR, `${layoutName}.html`);
  if (!fs.existsSync(p)) throw new Error(`Layout not found: ${layoutName}. Available: ${listLayouts().join(', ')}`);
  return fs.readFileSync(p, 'utf-8');
}

function loadBaseCSS() {
  if (!fs.existsSync(BASE_CSS_PATH)) throw new Error(`base.css not found at ${BASE_CSS_PATH}`);
  return fs.readFileSync(BASE_CSS_PATH, 'utf-8');
}

function assembleHTML({ themeName, themeCSS, baseCSS, layoutHTML, content, width = 1080, height = 1080 }) {
  // First: replace {{}} tokens inside the layout HTML
  const tokens = {
    '{{TITLE}}':       content.title || '',
    '{{CONTENT}}':     (content.body || content.content || '').replace(/\n/g, '<br>'),
    '{{SOURCE}}':      content.source || '',
    '{{BRAND}}':       content.brand || '',
    '{{SEAL}}':        content.seal || '',
    '{{BADGE}}':       content.badge || '',
    '{{POINTS_HTML}}': (content.points || []).map(p => `<li>${p}</li>`).join(''),
    '{{THEME}}':       themeName,
  };
  let body = layoutHTML;
  for (const [k, v] of Object.entries(tokens)) {
    body = body.split(k).join(v);
  }
  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${themeName}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${width}, height=${height}">
<title>${content.title || ''}</title>
<style>
${baseCSS}
${themeCSS}
body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; overflow: hidden; }
.cover { width: ${width}px; height: ${height}px; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function renderHTML(layoutHTML, content, config, platform) {
  // Legacy: replace {{ACCENT__Axx}} and {{*__PRINT}} for backward compat
  let html = layoutHTML;
  if (config.colors) {
    html = html.replace(/\{\{(\w+?)__A(\d\d)\}\}/g, (_, colorName, alphaHex) => {
      const hex = config.colors[colorName];
      if (!hex) return _;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const a = (parseInt(alphaHex, 16) / 255).toFixed(3);
      return `rgba(${r},${g},${b},${a})`;
    });
  }
  return assembleHTML({
    themeName: config.themeName || 'minimal-white',
    themeCSS: config.themeCSS || '',
    baseCSS: config.baseCSS || '',
    layoutHTML: html,
    content,
    width: platform.width,
    height: platform.height,
  });
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args[key] = argv[++i];
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const LEGACY_TEMPLATE_MAP = {
  '1':  { theme: 'minimal-white',           layout: 'cover' },
  '2':  { theme: 'dark-gold',               layout: 'cover' },
  '3':  { theme: 'editorial',               layout: 'cover' },
  '4':  { theme: 'warm-handdrawn',          layout: 'cover' },
  '5':  { theme: 'tech-modern',             layout: 'cover' },
  '6':  { theme: 'bold-poster',             layout: 'cover' },
  '7':  { theme: 'data-infographic',        layout: 'cover' },
  '8':  { theme: 'eastern',                 layout: 'cover' },
  '9':  { theme: 'magazine-cover',          layout: 'cover' },
  '10': { theme: 'split-screen',            layout: 'cover' },
  '11': { theme: 'minimal-white-editorial', layout: 'cover' },
  '12': { theme: 'list-ranking',            layout: 'cover' },
};

function resolveTemplate(args) {
  let theme = args.theme;
  let layout = args.layout || 'cover';
  if (!theme && args.template) {
    const mapped = LEGACY_TEMPLATE_MAP[String(args.template).padStart(2, '0').replace(/^0+/, '')];
    if (mapped) { theme = mapped.theme; layout = mapped.layout; }
    else { theme = 'minimal-white'; }
  }
  if (!theme) theme = 'minimal-white';
  return { theme, layout };
}

function resolvePlatforms(args) {
  if (!args.platforms) {
    return [
      { id: 'vertical', width: 1080, height: 1440, label: '3:4 竖版' },
      { id: 'square',   width: 1080, height: 1080, label: '1:1 方版' },
      { id: 'wide',     width: 1920, height: 1080, label: '16:9 横版' },
      { id: 'cover',    width: 1800, height: 766,  label: '2.35:1 封面' },
      { id: 'og',       width: 1200, height: 630,  label: '1.9:1 OG卡片' },
    ];
  }
  const ids = args.platforms.split(',').map(s => s.trim().toLowerCase());
  const out = [];
  for (const id of ids) {
    if (id === 'all') return Object.values(ALL_PLATFORMS);
    if (GROUPS[id]) for (const sub of GROUPS[id]) if (!out.includes(sub)) out.push(sub);
    else if (ALL_PLATFORMS[id]) if (!out.includes(id)) out.push(id);
  }
  return out.map(id => ALL_PLATFORMS[id]).filter(Boolean);
}

function takeScreenshot(html, outputPath, platform) {
  const tmp = path.join(path.dirname(outputPath), `_tmp_${Date.now()}.html`);
  fs.writeFileSync(tmp, html, 'utf-8');
  const url = `file://${path.resolve(tmp)}`;
  const cmd = `npx playwright screenshot --viewport-size=${platform.width},${platform.height} --wait-for-timeout=1500 "${url}" "${outputPath}"`;
  try {
    execSync(cmd, { stdio: 'pipe', timeout: 60000 });
    console.log(`  [OK] ${platform.label} (${platform.width}×${platform.height})`);
  } catch (e) {
    console.error(`  [FAIL] ${platform.label}: ${e.message}`);
  }
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
}

function dateStamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}
function safeDirName(t) { return (t || 'untitled').replace(/[\\/:*?"<>|]/g, '_').trim(); }
function resolveOutputDir(content, args) {
  if (args.output) return path.resolve(args.output);
  const today = dateStamp();
  const root = path.join(SCRIPT_DIR, '..', 'output');
  fs.mkdirSync(root, { recursive: true });
  const prefix = `${today}_${safeDirName(content.title)}`;
  const existing = fs.readdirSync(root).filter(d => d.startsWith(prefix));
  const seq = existing.length > 0
    ? Math.max(...existing.map(d => { const m = d.match(/_(\d+)$/); return m ? parseInt(m[1]) : 0; })) + 1
    : 1;
  return path.join(root, `${prefix}_${String(seq).padStart(3, '0')}`);
}

function main() {
  const args = parseArgs(process.argv);

  if (args['list-themes']) {
    console.log(listThemes().join('\n'));
    return;
  }
  if (args['list-layouts']) {
    console.log(listLayouts().join('\n'));
    return;
  }

  const content = args.file
    ? JSON.parse(fs.readFileSync(args.file, 'utf-8'))
    : {
        title: args.title || '',
        body: args.body || args.content || '',
        source: args.source || args.url || '',
        points: (args.points || '').split('|').filter(Boolean),
      };

  const { theme, layout } = resolveTemplate(args);
  const themeCSS = loadTheme(theme);
  const baseCSS = loadBaseCSS();
  const layoutHTML = loadLayout(layout);

  const platforms = resolvePlatforms(args);
  const outputDir = resolveOutputDir(content, args);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\nTheme: ${theme}    Layout: ${layout}`);
  console.log(`Content: ${content.title || '(no title)'}`);
  console.log(`Output:  ${outputDir}\n`);

  for (const platform of platforms) {
    const html = assembleHTML({
      themeName: theme, themeCSS, baseCSS, layoutHTML, content,
      width: platform.width, height: platform.height,
    });

    if (args.preview) {
      const previewPath = path.join(outputDir, `_preview_${platform.id}.html`);
      fs.writeFileSync(previewPath, html, 'utf-8');
      console.log(`  [HTML] ${previewPath}`);
    } else {
      const safe = safeDirName(content.title).slice(0, 40);
      takeScreenshot(html, path.join(outputDir, `${safe}_${platform.id}.png`), platform);
    }
  }
  console.log(`\nDone: ${outputDir}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  listThemes, listLayouts, loadTheme, loadLayout, loadBaseCSS,
  assembleHTML, renderHTML, parseArgs, resolveTemplate, resolvePlatforms,
};
```

- [ ] **Step 7: Run all tests — they should now pass**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
npm test
```

Expected: `tests N` (across all 5 test files), `pass N`, `fail 0`

- [ ] **Step 8: First end-to-end render test (1 theme × 1 platform)**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
mkdir -p /tmp/render-test
node yuanfang-html-image/scripts/render.js \
  --title "AI 内容创作" \
  --content "从写作到配图，AI 正在重新定义创意的边界" \
  --points "效率提升 10x|零门槛创作|AI 增强而非替代" \
  --theme minimal-white \
  --layout cover \
  --platforms xiaohongshu-v \
  --output /tmp/render-test
```

Expected: `Done: /tmp/render-test`. File `AI 内容创作_xiaohongshu-v.png` exists.

- [ ] **Step 9: Open the PNG and visually verify**

```bash
ls -la /tmp/render-test/
```

Expected: PNG file present, size 50KB-150KB.

(Manually open the PNG to verify: title "AI 内容创作" is large, points show with accent color, badge at top.)

- [ ] **Step 10: Commit**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git add yuanfang-html-image/scripts/render.js yuanfang-html-image/tests/
git commit -m "feat(render): theme + layout injection, backward compat, 4 unit test files"
```

---

## Task 9: Extract Remaining 11 Themes

**Files:**
- Create: 11 theme files in `yuanfang-design/themes/`

- [ ] **Step 1: Extract theme 02 dark-gold**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
cat yuanfang-html-image/templates/02-dark-gold/template.json
```

Create `yuanfang-design/themes/dark-gold.css`:
```css
[data-theme="dark-gold"] {
  --bg: #1A1A2E;
  --text: #F5E6D3;
  --accent: #E2B714;
  --secondary: #B8941F;
  --bg-alt: #16213E;
  --font-title: "Playfair Display", "PingFang SC", serif;
  --font-body: "Inter", "PingFang SC", sans-serif;
  --title-size-v: 140px;
  --title-size-s: 110px;
  --title-size-w: 88px;
  --title-size-c: 64px;
  --content-size: 38px;
  --decor-tl: none;
  --decor-tr: radial-gradient(circle at 100% 0%, rgba(226,183,20,.18), transparent 50%);
  --decor-bl: radial-gradient(circle, rgba(226,183,20,.10), transparent 70%);
  --decor-br: linear-gradient(180deg, transparent, rgba(226,183,20,.05));
  --accent-line: 0;
  --accent-block: 0;
  --terminal-bar: 0;
  --grid-bg: 0;
  --seal: "";
}
```

- [ ] **Step 2: Extract themes 03-06 (editorial, warm-handdrawn, tech-modern, bold-poster)**

For each, read the old `template.json` and create the new `themes/<name>.css` overriding tokens. Use `dark-gold.css` as a template. Adjust:
- **editorial**: 米白/红字, Source Serif font, big quote mark
- **warm-handdrawn**: 暖米/橙字, Caveat font, paper texture
- **tech-modern**: 深蓝/蓝字, JetBrains Mono, terminal bar
- **bold-poster**: 黑底/红字, Inter Black, no chrome (just huge title)

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
for n in 03-editorial 04-warm-handdrawn 05-tech-modern 06-bold-poster; do
  echo "=== $n ==="
  cat yuanfang-html-image/templates/$n/template.json 2>/dev/null
done
```

Create each theme file. (Refer to old template.json for color/font values.)

- [ ] **Step 3: Extract themes 07-12 (data-infographic, eastern, magazine-cover, split-screen, minimal-white-editorial, list-ranking)**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
for n in 07-data-infographic 08-eastern 09-magazine-cover 10-split-screen 11-minimal-white-editorial 12-list-ranking; do
  echo "=== $n ==="
  cat yuanfang-html-image/templates/$n/template.json 2>/dev/null
done
```

Create each theme file. Key points:
- **data-infographic**: 浅灰/绿字, Outfit, --grid-bg: 1
- **eastern**: 米白/棕字, Noto Serif SC, --seal: "DM"
- **magazine-cover**: 米白/靛字, Playfair Display
- **split-screen**: 白底/靛字, --accent-block: 1
- **minimal-white-editorial**: 浅灰/靛字, 大留白
- **list-ranking**: 白底/靛字, --accent-line: 1

- [ ] **Step 4: Run theme list test to verify 12 themes**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
node yuanfang-html-image/scripts/render.js --list-themes
```

Expected: 12 theme names listed (alphabetical).

- [ ] **Step 5: Commit all 11 themes**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git add yuanfang-design/themes/
git commit -m "feat(yuanfang-design): extract 11 more themes from old templates"
```

---

## Task 10: Run 12 × 6 = 72 Image Regression

**Files:**
- Output: 72 PNG files in `yuanfang-html-image/output/20260605_72-Image-Regression_001/`

- [ ] **Step 1: Create test content JSON**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
mkdir -p /tmp/regression
cat > /tmp/regression/content.json <<'EOF'
{
  "title": "AI 重塑内容创作",
  "body": "从文案到配图，AI 正在重新定义创意的边界。",
  "points": ["效率提升 10 倍", "零门槛创作", "AI 增强而非替代"],
  "source": "示例内容",
  "badge": "FEATURED"
}
EOF
```

- [ ] **Step 2: Run 12 themes × default 5 platforms = 60 images**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
for theme in $(node yuanfang-html-image/scripts/render.js --list-themes); do
  node yuanfang-html-image/scripts/render.js \
    --file /tmp/regression/content.json \
    --theme "$theme" \
    --layout cover \
    --output /tmp/regression/$theme 2>&1 | tail -1
done
```

Expected: 12 output directories created, each with 5 PNGs.

- [ ] **Step 3: Add the 6th platform (douyin 9:16) for full 72**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
for theme in $(node yuanfang-html-image/scripts/render.js --list-themes); do
  node yuanfang-html-image/scripts/render.js \
    --file /tmp/regression/content.json \
    --theme "$theme" \
    --layout cover \
    --platforms douyin-cover \
    --output /tmp/regression/$theme 2>&1 | tail -1
done
```

- [ ] **Step 4: Count and verify**

```bash
find /tmp/regression -name "*.png" | wc -l
```

Expected: 72

- [ ] **Step 5: Visual QA — open at least 2 themes × all 6 platforms**

For each of these combinations, open the PNG and verify:
- `minimal-white` × `xiaohongshu-v` (3:4 portrait)
- `minimal-white` × `wechat-cover` (2.35:1 cover, no points)
- `minimal-white` × `douyin-cover` (9:16 tall)
- `dark-gold` × `xiaohongshu-v`
- `tech-modern` × `bilibili-cover` (16:9 wide)
- `eastern` × `xiaohongshu-v` (check seal shows)

For each, check:
- [ ] Title is readable (no overflow)
- [ ] No text clipped
- [ ] Decoration looks correct (e.g., tech-modern has terminal dots)
- [ ] Color scheme matches theme

If any fails, note which theme × platform in a file:

```bash
cat > yuanfang-html-image/output/qa-report.md <<'EOF'
# QA Report — 72-Image Regression

## Failed combinations
- (list theme × platform × issue)

## Pass count
12 themes × 6 platforms = 72
Pass: __
Fail: __
EOF
```

- [ ] **Step 6: Commit (no code change yet; just note any failures)**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git add yuanfang-html-image/output/qa-report.md
git commit -m "test: 12 themes x 6 platforms regression — first run, failures logged"
```

---

## Task 11: Fix Failures (Iterate on Themes / cover.html)

**Files:**
- Modify: theme CSS files (or `base.css` / `cover.html` if shared issue)

- [ ] **Step 1: Read QA report and categorize failures**

```bash
cat yuanfang-html-image/output/qa-report.md
```

Categorize:
- **Theme-only issue** (e.g., wrong color): fix in theme CSS
- **Layout issue** (e.g., points overflow): fix in cover.html or base.css
- **Multi-theme issue**: fix in base.css

- [ ] **Step 2: For each failure, fix**

For theme-only:
```bash
# Edit the theme file
vim yuanfang-design/themes/<name>.css
# Re-render that theme
node yuanfang-html-image/scripts/render.js \
  --file /tmp/regression/content.json \
  --theme <name> \
  --layout cover \
  --platforms <failing-platforms> \
  --output /tmp/regression/<name>
# Open PNG and verify
```

For layout issues:
```bash
# Edit base.css or layout-types/cover.html
vim yuanfang-design/base.css
# Re-render ALL themes for affected platform
for theme in $(node yuanfang-html-image/scripts/render.js --list-themes); do
  node yuanfang-html-image/scripts/render.js \
    --file /tmp/regression/content.json \
    --theme "$theme" --layout cover \
    --platforms <platform> \
    --output /tmp/regression/$theme
done
```

- [ ] **Step 3: Re-run full 72-image regression**

```bash
rm -rf /tmp/regression
mkdir -p /tmp/regression
# Re-run steps 1-3 from Task 10
```

- [ ] **Step 4: Confirm pass rate**

Visual QA again on the 12 representative images. Pass threshold: ≥ 10 themes show all 6 platforms clean.

- [ ] **Step 5: Commit fixes**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git add yuanfang-design/
git commit -m "fix(cover,themes): resolve QA failures from 72-image regression"
```

---

## Task 12: Build `cover-showcase.html` (72-iframe Grid)

**Files:**
- Create: `yuanfang-skills/yuanfang-design/showcase/cover-showcase.html`
- Create: `yuanfang-skills/yuanfang-design/showcase/generate.js`

- [ ] **Step 1: Create generate.js to auto-build showcase**

Create `yuanfang-design/showcase/generate.js`:

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { listThemes } = require('../../yuanfang-html-image/scripts/render');

const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.join(SCRIPT_DIR, '..', '..');
const DESIGN_DIR = path.join(REPO_ROOT, 'yuanfang-design');
const HTML_LAYOUT = path.join(DESIGN_DIR, 'layout-types', 'cover.html');
const BASE_CSS = path.join(DESIGN_DIR, 'base.css');

const PLATFORMS = [
  { id: 'xiaohongshu-v',  width: 1080, height: 1440, label: '3:4 竖版' },
  { id: 'moments',        width: 1080, height: 1080, label: '1:1 方版' },
  { id: 'bilibili-cover', width: 1920, height: 1080, label: '16:9 横版' },
  { id: 'wechat-cover',   width: 900,  height: 383,  label: '2.35:1 封面' },
  { id: 'twitter',        width: 1200, height: 675,  label: '1.9:1 OG' },
  { id: 'douyin-cover',   width: 1080, height: 1920, label: '9:16 长竖' },
];

const SAMPLE = {
  title: 'AI 重塑创作',
  body: '从文案到配图，AI 改变内容工作流。',
  points: ['效率 10x', '零门槛', '增强而非替代'],
  source: '示例内容',
  badge: 'FEATURED',
  brand: 'Yuanfang',
};

function main() {
  const themes = listThemes();
  const html = fs.readFileSync(HTML_LAYOUT, 'utf-8');
  const baseCSS = fs.readFileSync(BASE_CSS, 'utf-8');

  const outDir = path.join(SCRIPT_DIR, 'output');
  fs.mkdirSync(outDir, { recursive: true });

  // Build iframe grid HTML
  const cells = [];
  for (const theme of themes) {
    for (const p of PLATFORMS) {
      const themeCSS = fs.readFileSync(path.join(DESIGN_DIR, 'themes', `${theme}.css`), 'utf-8');
      const fullHtml = `<!DOCTYPE html><html lang="zh-CN" data-theme="${theme}"><head><meta charset="utf-8"><style>${baseCSS}${themeCSS}body{margin:0;padding:0;width:${p.width}px;height:${p.height}px;overflow:hidden}.cover{width:${p.width}px;height:${p.height}px}</style></head><body>${html.replace(/\{\{(\w+)\}\}/g, (_, k) => SAMPLE[k.toLowerCase()] || '')}</body></html>`;
      const fileName = `${theme}_${p.id}.html`;
      fs.writeFileSync(path.join(outDir, fileName), fullHtml, 'utf-8');
      const aspect = (p.height / p.width).toFixed(2);
      cells.push(`<div class="cell"><div class="label">${theme} · ${p.label}</div><iframe src="output/${fileName}" style="aspect-ratio:${p.width}/${p.height}"></iframe></div>`);
    }
  }

  const showcase = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>Cover Showcase — 12 themes × 6 platforms</title>
<style>
body { font-family: system-ui, sans-serif; background: #f5f5f5; padding: 24px; }
h1 { font-size: 24px; margin-bottom: 24px; }
.grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; }
.cell { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
.label { font-size: 11px; padding: 6px 10px; background: #f0f0f0; color: #333; }
iframe { width: 100%; height: 200px; border: 0; display: block; }
</style>
</head>
<body>
<h1>Cover Showcase — ${themes.length} themes × ${PLATFORMS.length} platforms = ${themes.length * PLATFORMS.length}</h1>
<div class="grid">
${cells.join('\n')}
</div>
</body>
</html>`;

  fs.writeFileSync(path.join(SCRIPT_DIR, 'cover-showcase.html'), showcase, 'utf-8');
  console.log(`Generated ${themes.length * PLATFORMS.length} cells`);
  console.log(`Open: file://${path.join(SCRIPT_DIR, 'cover-showcase.html')}`);
}

if (require.main === module) main();
module.exports = { main };
```

- [ ] **Step 2: Run the generator**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
node yuanfang-design/showcase/generate.js
```

Expected: `Generated 72 cells`. File `cover-showcase.html` created.

- [ ] **Step 3: Open showcase in a browser**

```bash
echo "Open in browser: file://$(pwd)/yuanfang-design/showcase/cover-showcase.html"
```

(Manually verify: 72 iframes render, no broken cells.)

- [ ] **Step 4: Commit**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git add yuanfang-design/showcase/
git commit -m "feat(yuanfang-design): add cover-showcase with 12x6=72 iframe grid"
```

---

## Task 13: Write `authoring-guide.md`

**Files:**
- Create: `yuanfang-skills/yuanfang-design/references/authoring-guide.md`

- [ ] **Step 1: Create authoring-guide.md**

```markdown
# yuanfang-design Authoring Guide

Rules for adding new themes, layout-types, or modifying the design system.

## Core principle: tokens, not literals

Every visual property (color, font, size, decoration) must reference a CSS variable defined in `base.css`. **No hardcoded hex codes, font names, or pixel sizes in layout-type files or theme .cover rules.**

❌ Bad:
\`\`\`css
.cover__title { color: #4F46E5; font-size: 130px; }
\`\`\`

✅ Good:
\`\`\`css
.cover__title { color: var(--accent); font-size: var(--title-size-v); }
\`\`\`

## Adding a new theme

1. Copy `themes/_template.css` (or any existing theme) to `themes/<name>.css`
2. Override the tokens you need; leave the rest at base.css defaults
3. Required overrides: `--bg`, `--text`, `--accent` (at minimum)
4. Optional: `--decor-*`, `--accent-line/block`, `--seal`, etc.
5. Test: \`npm run render -- --theme <name> --layout cover --platforms all\`
6. Open the showcase and verify

## Adding a new layout-type

1. Create `layout-types/<name>.html` with `{{}}` placeholders for content
2. Add corresponding rules to `base.css` under `.layout-<name>` (or new file)
3. Reference only tokens, never literals
4. Add responsive `@media` queries for 6 aspect ratios
5. Test: \`npm run render -- --theme minimal-white --layout <name> --platforms all\`

## Token reference

See `base.css` for full token list. Most common:

- **Colors**: `--bg`, `--text`, `--accent`, `--secondary`, `--bg-alt`
- **Fonts**: `--font-title`, `--font-body`
- **Sizes** (per ratio): `--title-size-v/s/w/c`, `--content-size`, `--badge-size`
- **Space**: `--space-1` (8px) through `--space-4` (48px)
- **Decor**: `--decor-tl/tr/bl/br` (gradient or url)
- **Flags**: `--accent-line`, `--accent-block`, `--terminal-bar`, `--grid-bg`, `--seal`

## Don't

- Don't add new tokens to base.css unless multiple themes need them
- Don't override tokens in `cover.html` or other layout files
- Don't add new CSS classes inside theme files (themes only override tokens)
- Don't use `!important` (find the specificity issue instead)
```

- [ ] **Step 2: Commit**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git add yuanfang-design/references/authoring-guide.md
git commit -m "docs(yuanfang-design): authoring guide for themes and layout-types"
```

---

## Task 14: Update `yuanfang-html-image/SKILL.md`

**Files:**
- Modify: `yuanfang-skills/yuanfang-html-image/SKILL.md`

- [ ] **Step 1: Read the existing SKILL.md**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
head -30 yuanfang-html-image/SKILL.md
```

- [ ] **Step 2: Add dependency note + new CLI flags section**

Prepend to `yuanfang-html-image/SKILL.md`:

```markdown
## 依赖

本 skill 依赖同仓库 `yuanfang-design/` 共享设计库：
- `../yuanfang-design/base.css` — token CSS 变量
- `../yuanfang-design/themes/*.css` — 12 个主题
- `../yuanfang-design/layout-types/cover.html` — 布局块

如需独立部署，需复制整个 `yuanfang-skills/` 仓库。

## 新版 CLI

\`\`\`bash
# 推荐用法
node scripts/render.js --theme minimal-white --layout cover --platforms all

# 自动选主题（基于内容关键词）
node scripts/render.js --auto-theme --title "AI 数据报告" --platforms xiaohongshu-v

# 列出可用主题
node scripts/render.js --list-themes

# 列出可用布局
node scripts/render.js --list-layouts

# 输出 HTML 不截图（调试）
node scripts/render.js --preview --theme dark-gold --platforms wechat-cover
\`\`\`

## 旧版 CLI 兼容

`--template 1` 自动映射到 `--theme minimal-white --layout cover`。旧用法继续工作。

---

[原 SKILL.md 内容继续...]
```

- [ ] **Step 3: Commit**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git add yuanfang-html-image/SKILL.md
git commit -m "docs(yuanfang-html-image): document new CLI flags and yuanfang-design dependency"
```

---

## Task 15: Final 72-Image Re-Verify and Tag

**Files:**
- Output: 72 PNGs in regression run
- Tag: `v0.1.0`

- [ ] **Step 1: Re-run the 72-image regression**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
rm -rf /tmp/final-regression
mkdir -p /tmp/final-regression
for theme in $(node yuanfang-html-image/scripts/render.js --list-themes); do
  for platform in xiaohongshu-v moments bilibili-cover wechat-cover twitter douyin-cover; do
    node yuanfang-html-image/scripts/render.js \
      --file /tmp/regression/content.json \
      --theme "$theme" --layout cover \
      --platforms "$platform" \
      --output /tmp/final-regression/$theme 2>&1 | tail -1
  done
done
```

- [ ] **Step 2: Verify count**

```bash
find /tmp/final-regression -name "*.png" | wc -l
```

Expected: 72

- [ ] **Step 3: Verify all files non-empty**

```bash
find /tmp/final-regression -name "*.png" -size -1k
```

Expected: (no output; all files > 1KB)

- [ ] **Step 4: Verify no `{{TOKEN}}` leakage**

```bash
# Render with --preview and grep
mkdir -p /tmp/preview-check
node yuanfang-html-image/scripts/render.js \
  --file /tmp/regression/content.json \
  --theme minimal-white --layout cover \
  --platforms xiaohongshu-v \
  --preview \
  --output /tmp/preview-check
grep -o '{{[A-Z_]*}}' /tmp/preview-check/_preview_xiaohongshu-v.html || echo "no tokens leaked"
```

Expected: `no tokens leaked`

- [ ] **Step 5: Tag the release**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git tag -a v0.1.0 -m "yuanfang-design v0.1.0 — 1 layout-type, 12 themes, 72-image coverage"
```

- [ ] **Step 6: Commit tag**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git log --oneline | head -20
```

Expected: 10+ commits, all related to yuanfang-design and cover.

---

## Task 16: Update aics to Use New Repository (Optional in This Iteration)

**Files:**
- Delete: `aics/src/marketing/yuanfang-skills/yuanfang-html-image/` (after migration confirmed)
- **DO NOT delete**: `aics/src/marketing/yuanfang-skills/huashu-skills/` (stays in aics)

⚠️ This task is **optional** for this iteration. The aics project can continue to use the local `src/marketing/yuanfang-skills/yuanfang-html-image/` for now. Migration to the new repo can be a follow-up PR.

If you choose to do it now:

- [ ] **Step 1: Add yuanfang-skills as a path dependency (not npm yet)**

In aics, create a symlink or path reference:
```bash
cd /home/yf/workspace/opencode/aics/src/marketing
ln -s ../../../../yuanfang-skills yuanfang-skills  # if applicable
```

OR update `aics/src/marketing/yuanfang-skills/yuanfang-html-image/` to be a git submodule pointing to the new repo:

```bash
cd /home/yf/workspace/opencode/aics/src/marketing
rm -rf yuanfang-html-image  # only the html-image subdir
git submodule add https://github.com/<org>/yuanfang-skills.git yuanfang-html-image
# Note: huashu-skills/ is NOT touched
```

- [ ] **Step 2: Verify aics still builds/runs**

```bash
cd /home/yf/workspace/opencode/aics
# Run a quick render test using the new path
node src/marketing/yuanfang-skills/yuanfang-html-image/scripts/render.js --title test --platforms xiaohongshu-v
```

- [ ] **Step 3: Verify huashu-skills is untouched**

```bash
ls /home/yf/workspace/opencode/aics/src/marketing/yuanfang-skills/
```
Expected: `huashu-skills/` still present, `yuanfang-html-image/` is now a submodule (or symlink)

- [ ] **Step 4: Commit (in aics repo, not yuanfang-skills)**

```bash
cd /home/yf/workspace/opencode/aics
git add .gitmodules src/marketing/yuanfang-skills/yuanfang-html-image
git commit -m "refactor: switch yuanfang-html-image to git submodule pointing to yuanfang-skills repo (huashu-skills stays)"
```

---

## Task 17: Final Push and Summary

- [ ] **Step 1: Push the new repo to GitHub**

```bash
cd /home/yf/workspace/opencode/yuanfang-skills
git remote add origin https://github.com/<org>/yuanfang-skills.git
git push -u origin master
git push --tags
```

- [ ] **Step 2: Verify the GitHub repo is public-ready**

```bash
# Check README renders well on GitHub
cat README.md

# Check LICENSE is MIT
cat LICENSE | head -3

# Check .gitignore excludes output
cat .gitignore
```

- [ ] **Step 3: Write summary message**

Post the summary to the user:

```
✅ yuanfang-skills v0.1.0 ready

📦 New repo: /home/yf/workspace/opencode/yuanfang-skills/
   - README + LICENSE (MIT) + .gitignore
   - yuanfang-design/ — base.css (30+ tokens), 12 themes, cover.html
   - yuanfang-html-image/ — refactored render.js, 4 test files
   - huashu-skills stays in aics (not part of this repo)
   - 72-image regression passing
   - Showcase page at yuanfang-design/showcase/cover-showcase.html

🎨 12 themes × 6 platforms = 72 images verified
   - minimal-white, dark-gold, editorial, warm-handdrawn, tech-modern,
     bold-poster, data-infographic, eastern, magazine-cover,
     split-screen, minimal-white-editorial, list-ranking
   - Platforms: 3:4, 1:1, 16:9, 2.35:1, 1.9:1, 9:16

🔬 Tests: 12 unit tests across 5 files (all passing)
   - base.css token presence
   - render.js theme loading
   - render.js token replacement
   - render.js HTML assembly
   - render.js backward compat

📝 Next steps (separate PRs):
   - Add bullets, two-column, three-column, kpi-grid, stat-highlight layout-types
   - Integrate with aics via git submodule
   - Publish to npm as `yuanfang-skills`
```

---

## Self-Review Checklist (run before declaring done)

- [ ] All 17 tasks completed
- [ ] All 12 unit tests passing (`npm test`)
- [ ] 72 PNGs generated, all > 1KB, none contain `{{TOKEN}}` leakage
- [ ] Visual QA: at least 2 themes × 6 platforms reviewed by human
- [ ] `cover-showcase.html` renders 72 iframes
- [ ] Old `--template 1` still works (backward compat)
- [ ] README, LICENSE, .gitignore in place
- [ ] Git tagged `v0.1.0`
- [ ] (Optional) aics switched to submodule

---

## Out of Scope (for this plan)

- **Other 30 layout-types** (bullets, kpi-grid, etc.) — separate plan
- **Theme count expansion** to 36 — separate plan
- **Animation system** (data-anim + 15-20 CSS animations) — separate plan
- **Data visualization** (Chart.js) — separate plan
- **yuanfang-html-ppt** (PPT output skill) — separate plan
- **GitHub public release** (publishing, marketing) — separate plan
- **npm package publish** — separate plan

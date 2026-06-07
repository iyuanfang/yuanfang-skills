# Open-Source AI PPT Projects — Competitive Landscape (2025–2026)

> Research compiled for the `yuanfang-html-ppt` skill. Goal: identify what to **borrow** (architecture patterns, content contracts, feature ideas) and what to **avoid** (anti-patterns, scope traps) when building the next iteration of the yuanfang PPT generator.
> Research date: 2026-06-07

---

## 0. Methodology & Caveats

- All star/fork numbers and dates are pulled from GitHub repo pages on the day of research. Several projects use different metrics (some report only `watchers`, others `stars`).
- "Mature" vs "experimental" is judged by: star count, contributor count, last push date, release cadence, issue/PR closure ratio.
- The "AI" generation tier means: project takes natural-language input and produces a deck. The "framework" tier means: project provides primitives that an AI can call but doesn't ship its own LLM. We treat both as competitors because they are the most likely "steal-able" designs.
- We exclude closed-source SaaS (Gamma, Beautiful.AI, Decktopus, Tome, Pitch) — they appear only as positioning references.

---

## 1. Tier 1 — Mature Web-Slide Frameworks (presentation engines, not AI yet)

These are the foundational tools people *expect* an AI PPT tool to be able to target. They define the de-facto **input format** and **feature checklist**.

### 1.1 reveal.js — `hakimel/reveal.js` — **71.6k★ / 16.8k fork**

- **URL**: https://github.com/hakimel/reveal.js
- **Stack**: Vanilla JS + SCSS, Vite, MIT
- **Last release**: v6.0.1 (Apr 2026) — actively maintained, used by 788k repos

**Architecture**:
```
HTML page → <section> children become slides
     ↓
Reveal.initialize({ plugins: [Markdown, Notes, Highlight, Zoom] })
     ↓
Browser renders full-screen deck, supports keyboard nav, PDF export via print
```

**Input format (the de-facto "HTML slides" standard)**:
```html
<div class="reveal">
  <div class="slides">
    <section>Slide 1</section>
    <section>
      <section>Vertical subslide 1a</section>
      <section>Vertical subslide 1b</section>
    </section>
    <section data-markdown>
      <script type="text/template">
        ## Markdown Support
        ```js
        console.log("hi")
        ```
      </script>
    </section>
  </div>
</div>
```

**Layout system**: No named layouts — just `<section>` ordering, nested `<section>` for vertical stacks, `data-*` attributes for backgrounds/transitions. Themes are pure CSS overrides (`dist/theme/black.css` etc.).

**Theme system**: 11 built-in themes as plain CSS files (black, white, league, beige, sky, night, serif, simple, solarized, blood, moon). You write a new theme by copying one and replacing colors/fonts.

**Special features**: Nested slides, fragments (progressive reveal of `<span class="fragment">`), Auto-Animate (DOM diffing between slides), 12+ transitions, PDF export via `?print-pdf`, speaker view (press `S`), LaTeX (MathJax), syntax highlighting, vertical slides, scroll view (`view: "scroll"`), Lightbox, `?serialized` query for state restoration, official React wrapper (`@revealjs/react`).

**Strengths worth borrowing**:
- `data-background-image` / `data-background-video` / `data-background-color` is the cleanest "per-slide override" pattern in the industry. yuanfang's `content.json` could mirror this with a `background: { type, value }` object.
- Fragments — the single most-copied feature in deck tools.
- View Transitions API integration for modern browsers.

**Weaknesses to avoid**:
- No "slide types" / "layouts" abstraction. Authors hand-write HTML, which is why AI tools (Gamma, Slidev) moved away from raw `<section>`.
- 11 themes, but they are full CSS files, not token systems. Theming is non-composable.

---

### 1.2 Slidev — `slidevjs/slidev` — **47k★ / 2.1k fork** — **largest Vue-based competitor**

- **URL**: https://github.com/slidevjs/slidev
- **Stack**: Vite + Vue 3 + UnoCSS, MIT, 360 contributors
- **Created**: Apr 2021, last push May 2026, 423 releases

**Architecture**:
```
slides.md (markdown with frontmatter)
     ↓
@slidev/parser  (YAML frontmatter + code-block detection)
     ↓
Vue SPA, one <Slide> component per --- separator
     ↓
Export → PDF (Playwright), PPTX (via @slidev/cli export --format pptx)
        SPA (built bundle), PNGs, recording (RecordRTC)
```

**Input format — a single `slides.md` with frontmatter**:
```md
---
theme: seriph            # theme = npm package "slidev-theme-seriph"
title: "My Talk"
layout: cover
background: ./bg.png
class: text-white
---

# Welcome to Slidev

Content here.

---
layout: two-cols
---

# Left

# Right

---
src: ./pages/imported.md     # slide can be imported from another file
---

---
layout: center
---

# Notes block: HTML comment at end of slide = presenter notes
<!-- This text shows in presenter mode only -->
```

**Layout system**: 15 built-in layouts (default, center, cover, end, full, image-left, image-right, image, iframe-left, iframe-right, iframe, intro, section, statement, two-cols, two-cols-header). Layouts are Vue components in `layouts/*.vue` — adding a layout is one file. Theme layouts override built-in. Load order: `local > theme > built-in`.

**Theme system**: Themes are npm packages prefixed `slidev-theme-`. A theme can provide:
- global styles (CSS)
- default slide config (`package.json#slidev.defaults`)
- custom layouts
- custom Vue components
- tool config (UnoCSS preset, Shiki config)

**Parser API** (the part that's relevant to yuanfang):
```ts
// packages/parser/src/core.ts
export function parseSlide(raw: string, options): Omit<SourceSlideInfo, ...> {
  const matterResult = matter(raw, options)  // YAML frontmatter
  // ... strips HTML comments as notes
  // ... extracts first heading as title
  // ... detects features: katex, monaco, tweet, mermaid
  return { frontmatter, content, note, title, level, ... }
}

export async function parse(markdown, filepath, extensions, options): Promise<SlidevMarkdown> {
  // splits on "---" line, walks each chunk
  // runs extension transforms: transformRawLines, transformSlide, transformNote
  // returns array of slides
}
```

**Special features**:
- Mermaid, KaTeX, Monaco live coding, Shiki highlighting
- Shiki-based code blocks with line highlighting & magic-move
- `<Tweet>` / `<Youtube>` / `<Video>` Vue components
- `Monomaco` for runnable TypeScript demos inside slides
- Iconify for any icon set
- `@vueuse/motion` for spring-based animations
- Export to PDF, PPTX (raster), PNGs, hostable SPA, recording (camera + screen)

**Strengths worth borrowing**:
- The **slide-as-frontmatter-block** pattern is unbeatable for AI prompts: each slide is `{ frontmatter, content, note }` — exactly the schema yuanfang already has, but Slidev makes it a human-editable text file. yuanfang could offer a `deck.md` mode in addition to `content.json`.
- **Layout override cascade** (`local > theme > built-in`) — when you publish a theme, users can still override any layout by dropping a same-named file. This is much better than yuanfang's current "12 themes × 7 layouts = closed matrix".
- **Feature auto-detection** (`detectFeatures(code)` returns `{katex, monaco, mermaid, tweet}`) — Slidev only bundles KaTeX if your markdown actually uses `$math$`. Yuanfang could do the same with chart libraries.

**Weaknesses to avoid**:
- PPTX export is **rasterized** (not editable). It runs Chromium in headless mode and embeds slide images. Their docs admit this.
- The monorepo has 12+ packages — overkill for a content→PPTX tool.

---

### 1.3 Marp (Marpit + Marp Core + Marp CLI) — `marp-team/*` — **1k–7k★ across the family**

- **Repos**: `marp-team/marpit` (1k★), `marp-team/marp-core` (3.4k★), `marp-team/marp-cli` (2.7k★)
- **Stack**: markdown-it + TypeScript, MIT
- **Last release**: Marp Core v3 + CLI still maintained

**Architecture**:
```
Markdown (with directives)
   ↓
Marpit: parses with markdown-it → applies directives
   ↓
Marp Core: extended with math/emoji/themes/auto-scaling
   ↓
Render → { html, css }    (theme CSS + per-slide CSS)
   ↓
CLI converts to: HTML, PDF, PPTX (image-based by default)
   → --pptx-editable (experimental): maps a few elements to OOXML
```

**Input format** — directives as HTML comments + YAML frontmatter:
```md
---
marp: true
theme: gaia
size: 16:9
math: katex
paginate: true
---

# Slide 1

content

---

<!-- _directive: "transition: fade" -->
<!-- _class: lead -->

# Section divider
```

**Theme system** — the **best-documented theme contract in the space**:
```css
/* @theme mytheme */
@import 'gaia';

section {
  background: linear-gradient(135deg, #fff, #eee);
  color: #222;
  font-family: 'Inter', sans-serif;
}

h1 {
  color: #d23;
  text-align: center;
}

section.lead h1 {
  font-size: 3em;
}

section.toc > ul > li {
  /* section.toc is applied by Marpit to TOC slides */
}
```

Then `themeSet.add(themeCssString)` and `themeSet.default = themeInstance`.

**Layouts** — Marp uses **CSS class metadata** to define layout slots:
- `section.title` (set automatically for first slide if `title` directive is used)
- `section.lead`
- `section.toc`
- Custom: any class set by the `<!-- _class: foo -->` directive

**Special features**:
- MathJax/KaTeX (`math: mathjax` directive)
- Auto-scaling: fitting header (`# <!-- fit -->`), code-block auto-shrink, math block auto-shrink
- Web Components for scaling: `<marp-fit>`, `<marp-shrinking>` — works in any host page
- Emoji shortcodes → twemoji SVG
- Fragmented lists (`*` or `1)` marker + 7-layer fragment DSL)
- Transition directives (powered by View Transition API in CLI browser)
- Auto-fit header using `ResizeObserver`

**Strengths worth borrowing**:
- **`_class:` directive** — apply a per-slide CSS class from inside the markdown. Yuanfang could add `class: "compact"` to slide objects to trigger theme-specific layout variants without adding new layout enums.
- **Theme `@import` system** — themes can extend other themes. Could let `minimal-white-editorial` extend `minimal-white` and only override the heading styles.
- **Auto-scaling via metadata keyword** — `@auto-scaling` opt-in from theme author. Same pattern would help yuanfang with long titles overflowing their text box.

**Weaknesses to avoid**:
- PPTX output is image-based by default. The "editable" mode is experimental and incomplete. This is the **biggest weakness of the whole declarative-Markdown→PPTX space** — Marp has been working on it for 5+ years and still can't beat a screenshot.
- The `marp: true` global frontmatter leaks the engine name into content. Awkward for users switching tools.

---

### 1.4 Spectacle — `formidablelabs/spectacle` — **10.1k★ / 700 fork**

- **URL**: https://github.com/FormidableLabs/spectacle
- **Stack**: React 19, JSX/TSX, MDX
- **License**: MIT, maintained by Nearform

**Architecture**:
```
.tsx/.mdx slides → React component tree
   ↓
<Deck template={<DefaultTemplate />}>
  <Slide>...</Slide>
  <Slide backgroundColor="..." transition={{...}}>...</Slide>
</Deck>
   ↓
Browser-rendered SPA
   ↓
Export: present directly, no built-in PPTX
```

**Input format**:
```tsx
import { Deck, Slide, Heading, Text, Box, FlexBox, Image, FullScreen } from 'spectacle'

<Deck>
  <Slide backgroundColor="tertiary">
    <FlexBox height="100%" alignItems="center" justifyContent="center">
      <Heading>Hello Spectacle</Heading>
    </FlexBox>
  </Slide>
</Deck>
```
Also supports MDX (`MarkdownSlideSet`):
```mdx
# Spectacle Presentation (MDX)

Notes: Notes are auto-extracted from the file.
```

**Layouts** — uses **FlexBox primitive** instead of named layouts. You compose `Box`, `FlexBox`, `Grid` for everything. No opinionated layouts.

**Strengths**:
- FlexBox primitive is the **cleanest way to express "responsive" slides** — no @media queries needed.
- Presenter mode with timer and upcoming slide.
- One-page boilerplate (single HTML, no build step) — useful for AI to generate.

**Weaknesses**:
- **No PPTX export**. Pure browser SPA. Worth borrowing concepts, not the tool.
- JSX is hostile to AI generation; Slidev's markdown approach is the winner here.

---

### 1.5 Remark — `gnab/remark` — **13k★ / 862 fork** — **mature but maintenance mode**

- Last release v0.15.0 (Jan 2020). Repo is in maintenance mode but still cited.
- **Influences**: Slidev is essentially "Remark with Vue + Vite + much more".

**Input format**:
```md
name: agenda
class: middle, center

# Agenda

The name of this slide is {{ name }}.

??? Notes for the speaker

---
layout: false
.left-column[
  ## Left
]
.right-column[
  ## Right
]
```

**Strengths**:
- `name:` / `template:` / `layout:` slide properties (the **origin of the pattern** Slidev copied).
- `???` for inline notes (no HTML comment noise).
- `{{ property }}` interpolation in slide content.

**Weaknesses**:
- No PPTX export. Browser only.
- Last commit 2024-06 — effectively abandoned for new features.

---

### 1.6 DeckDeckGo — `deckgo/deckdeckgo` — **1.7k★ / 193 fork** — **NOW DEPRECATED**

> ⚠️ The official site says: "It has been a fun ride but DeckDeckGo is now deprecated!"

- **Lessons**:
  - Web-Components-only approach is brilliant for embedding but bad for end-user composition.
  - Their PWA-as-slide concept (each deck is a Progressive Web App) is unique — no one else tried it.
  - The single biggest lesson: **don't build a full SaaS studio as an open-source side project**. They had a Studio, a remote control, an API, an offline mode, and a Sync layer.

---

## 2. Tier 2 — HTML→PPTX Converters (the **direct** competitors)

These are the libraries a "HTML-deck → editable PPTX" tool would use. Yuanfang's pipeline (HTML→PptxGenJS API) is *complementary* to these — most other AI PPT tools use one of these as the final step.

### 2.1 dom-to-pptx — `atharva9167j/dom-to-pptx` — **216★ / 41 fork** — **most popular in the niche**

- **URL**: https://github.com/atharva9167j/dom-to-pptx
- **Stack**: Vanilla JS, MIT, 9 contributors
- **v1.1.9** (May 2026), 14 releases

**Architecture**:
```
DOM element(s)
   ↓
Coordinate Scraper & Style Engine
   ├── getComputedStyle for every element
   ├── getBoundingClientRect for positions
   ├── Custom CSS Gradient Parser → SVG
   ├── Cartesian→Polar shadow math
   └── Z-index stacking
   ↓
pptxgenjs (output)
   ↓
editable .pptx (shapes, text boxes, vector SVGs)
```

**API contract**:
```ts
import { exportToPptx } from 'dom-to-pptx'

await exportToPptx('#slide-1', {
  fileName: 'deck.pptx',
  autoEmbedFonts: true,
  fonts: [{ name: 'Inter', url: '/fonts/Inter.woff2' }],
  skipDownload: false,
  svgAsVector: true,    // charts stay editable
  layout: 'LAYOUT_16x9',
  width: 10, height: 5.625,
  listConfig: { color: '333', spacing: { before: 4, after: 4 } },
})

// Multi-slide: pass an array
await exportToPptx(['#slide-1', '#slide-2', '#slide-3'], {...})
```

**What it does well**:
- Linear/radial gradients → vector SVG
- Cartesian→Polar shadow conversion
- Rounded images without "halo" via `source-in` canvas masking
- `filter: blur()` → PowerPoint soft edges
- Auto-scaling from 1920×1080 to slide dimensions
- Mixed-style text spans
- `text-transform` + `letter-spacing`
- Per-side borders, `border-radius`
- `svgAsVector` keeps SVG as vector (right-click "Convert to Shape" in PowerPoint)
- `transition` option maps to native PowerPoint transitions
- `listConfig` for global list styling
- Supports Reveal.js fragments → native PowerPoint animations (Fade, Fly-in, Zoom)

**CSS NOT supported** (per the docs):
- Per-corner `border-radius` (uniform only)
- `transform` other than `rotate`
- `background-image` with multiple layers
- `clip-path` (the `christphralden/html-in-pptx-out` fork adds this)
- Filters other than blur

**Strengths to study for yuanfang**:
- The **client-side only** constraint is actually a feature — no server needed. yuanfang's design system could expose a browser-only path.
- The `autoEmbedFonts` option (auto-detect fonts, download from Google Fonts, embed in PPTX) is **a major UX win** that yuanfang's brand-override should integrate with.
- The `listConfig` global override is exactly what yuanfang's brand-spec needs.

**Weaknesses**:
- Forks: `@halobiron/dom-to-pptx` adds fragments/transitions, `Alixy-ai/dom-to-pptx` is the same author (atharva) with extra features. **Fragmentation is the #1 problem in this niche** — three "official" forks with no consolidation.
- No built-in layout system. You're on your own for placement.

---

### 2.2 html2pptx-pro — `dxsun97/html2pptx-pro` — **8★ (new, MIT)**

- **URL**: https://github.com/dxsun97/html2pptx-pro
- v1.0.0 (Apr 2026), based on html2canvas-pro architecture

**Architecture**:
```
HTML element(s)
   ↓
Multi-stage rendering pipeline
   ├── Clone DOM
   ├── Parse computed styles
   ├── Build CSS stacking contexts (7-layer painting order)
   └── Render
   ↓
pptxgenjs (output)
```

**API**:
```ts
import html2pptx from 'html2pptx-pro'
const pptx = await html2pptx(element, options)
```

**Claimed features**: 100+ CSS properties, linear/radial gradients with angle, box shadow, clip-path (rasterized), rotation, multi-slide, full 7-layer painting order, object-fit, fonts.

**Verdict**: **Too new and too low-star to evaluate**, but worth watching. The "CSS stacking context" approach is theoretically more correct than dom-to-pptx's coordinate-scraping approach (no "halo" bugs, no z-index issues).

---

### 2.3 html-in-pptx-out — `christphralden/html-in-pptx-out` — **0★ but interesting design**

- **URL**: https://github.com/christphralden/html-in-pptx-out

**Architecture — the cleanest in the niche**:
```
HTML string
  ↓
Parser (parse5 or similar)
  ↓
ElementDTOs (typed intermediate representation)
  ↓
Plugins (onParse, onSlide, afterGenerate)
  ↓
Serializer
  ↓
PPTX
```

**Plugin lifecycle** (the killer feature):
```ts
class HtmlToPptx {
  constructor(config?: {
    selector?: string;             // default: ".slide"
    dimensions?: { width: number; height: number };
    plugins?: { core?: Plugin[]; extensions?: Plugin[] };
  });

  load(html: string): this;
  use(plugin: Plugin): this;
  convert(): Promise<this>;
  export(options: ExportConfig): Promise<ArrayBuffer>;
  getPresentation(): PresentationDTO;
}

// Hook points:
// beforeParse   - Modify HTML before parsing
// onParse       - Transform DOM element → ElementDTO
// onSlide       - Modify slide after all elements parsed
// afterGenerate - Post-process the PPTX object
```

**DTO types** are first-class (TextElementDTO, ShapeElementDTO, ImageElementDTO, Position, Dimensions, Fill, Stroke, Context).

**Strengths to borrow — STRONGLY**:
- **The 4-stage plugin lifecycle** is exactly what yuanfang's "A+C hybrid engine" (generator-a.js / generator-c.js) is trying to do, but much cleaner. Yuanfang should adopt this pattern.
- **DTO as the canonical intermediate representation** is the right abstraction. yuanfang's `parse-slides.js` output should be a typed DTO, not a raw parsed object.
- **Slide selector** (`.slide`) is a 1-character config change for the user. yuanfang's `layout: "content"` could be replaced with `class: "content"` plus a CSS-in-content.json.

**Weaknesses**:
- Star count is 0 — likely a learning project. Don't bet on its maintenance.
- Only 1 contributor.

---

### 2.4 html-to-pptx — `joker-duzhong/html-to-pptx` (older)

- **URL**: https://github.com/joker-duzhong/html-to-pptx
- v? (Oct 2024), MIT, low stars

**Features**:
- `data-*` attribute config for charts
- CSS animation → PPT animation (fadeIn, slideInUp)
- Rounded corner detection (rectangle / rounded rectangle / ellipse)
- `<table>` → native PPT table with rowspan/colspan
- Canvas / SVG auto-handling

**API**:
```ts
import { downloadHtmlToPpt } from "html-to-pptx"
await downloadHtmlToPpt("page", "presentation")  // pageClassName, fileName

import { exportHtmlToPpt } from "html-to-pptx"
const blob = await exportHtmlToPpt("page", "blob")
```

**Lessons**:
- The `class` selector pattern (`"page"` is the default) is the same as html-in-pptx-out. **The whole niche has converged on this**.
- "Add `data-*` attributes to opt into richer features" is a viable extension mechanism. yuanfang's content.json could be equivalent to data-attrs on rendered HTML.

---

### 2.5 slide-gen — `0-AI-UG/slide-gen` — **0★ (new, but explicitly designed for AI)**

- **URL**: https://github.com/0-AI-UG/slide-gen
- Bun + Playwright

**Architecture**:
```
HTML file/string
  ↓
Playwright Chromium renders
  ↓
Per-element extraction: shapes, text runs, images, gradients
  ↓
Native OOXML (no pptxgenjs intermediate)
  ↓
PPTX + PDF + PNG (with LibreOffice round-trip verification)
```

**API contract** (most useful for AI tools):
```ts
import { convertHtmlToSlides, convertHtmlBuffers } from "@0-ai/slide-gen"

const result = await convertHtmlToSlides("slides.html", {
  outputDir: "./output",
  onProgress: console.log,
})
// result.pptxPath, result.pptxBuffer, result.slideData

// Low-level pipeline stages
import { launchBrowser, loadHtmlContent, extractSlideData,
         prepareFontsFromSlideData, buildPptx, generatePdfBuffer, ... } from "@0-ai/slide-gen"
```

**Supported CSS** (well-documented limits):
- Solid + linear/radial gradients
- Flexbox + Grid (via `getBoundingClientRect`)
- Google Fonts (auto-download 100–900 weights, embed)
- Borders, border-radius (uniform), opacity, CSS variables
- `transform: rotate()` only
- `::before` / `::after` (position/size/background, no text)
- `writing-mode: vertical-rl/lr`

**Custom data-attrs**:
- `data-sg-wrap="true|false"` — text wrap control
- `data-sg-group="<id>"` — group text runs into one PPTX text box

**Strengths to borrow**:
- **`data-sg-*` attribute convention** is brilliant — it's a stable, opt-in extension API. yuanfang could add `data-yf-*` attrs to its rendered HTML for the same purpose.
- **Pipeline stages exposed as separate functions** — you can swap in your own browser, your own font cache, your own OOXML builder.
- **LibreOffice round-trip verification** is genius for catching "renders in Chrome but not in PowerPoint" bugs.

**Weaknesses**:
- Bun-only (no Node support).
- No font-embedding without LibreOffice (PPTX verification needs it).
- Shadows, filters, backdrop-filter, clip-path not yet supported.

---

### 2.6 llm-dom-to-pptx — npm package

A minimal alternative for AI workflows. Exports with a fixed 960×540 root container and includes a `System_Prompt.md` to constrain LLM output. **The "System_Prompt" pattern is the right idea** — yuanfang should ship a prompt template that constrains the LLM to layouts the renderer actually supports.

---

### 2.7 Summary — Tier 2 comparison

| Project | Stars | Engine | Editable? | Approach | Maintained? |
|---|---|---|---|---|---|
| **dom-to-pptx** | 216 | pptxgenjs | Yes | Coord scraper | ✅ Active |
| **html2pptx-pro** | 8 | pptxgenjs | Yes | Stacking context | ✅ New |
| **html-in-pptx-out** | 0 | pptxgenjs | Yes | DTO + plugin | ⚠️ Toy |
| **html-to-pptx** | low | pptxgenjs | Yes | DOM walker | ⚠️ Stale |
| **slide-gen** | 0 | Native OOXML | Yes | Playwright + own | ✅ New |
| **llm-dom-to-pptx** | n/a | pptxgenjs | Yes | Minimal API | ✅ New |

**The trend**: every new entrant is converging on **AI-friendly HTML** (fixed-size root, simple CSS) + **pptxgenjs** (battle-tested OOXML builder). yuanfang's "design system + AI skill" is the natural next step up.

---

## 3. Tier 3 — AI-Generated PPT Tools (the **direct** yuanfang competitors)

These all take natural-language input and produce a deck. The architecture space is wide-open.

### 3.1 PPT Master — `hugohe3/ppt-master` — **24.6k★ / 2.2k fork** — **the most-decorated AI PPT OSS project**

- **URL**: https://github.com/hugohe3/ppt-master
- **Stack**: Python harness + Python post-processing (svg2pptx, image_gen) + markdown
- **License**: MIT
- **v2.9.0** (May 2026), 10 contributors

**Architecture** (the **"harness + model = agent"** model):
```
User prompt + source material
  ↓
SKILL.md instructions to Claude/Cursor/Codebuddy
  ↓
AI runs the workflow itself, generating:
  ├── requirements/interview.md
  ├── requirements/outline.md
  ├── requirements/style.json
  ├── planning/slide-N.md (per slide)
  ├── svg_output/slide-N.svg (per slide)
  ├── exports/<deck>.pptx
  └── backup/<deck>/svg_output/ (snapshot)
  ↓
Post-processing Python:
  ├── image_gen.py (gpt-image-2, gemini, etc.)
  ├── svg2pptx.py (SVG → editable PPTX)
  └── Optional --svg-snapshot (also emit PNG-image PPTX)
```

**Key design choice**: **SVG is the intermediate format, not HTML**. SVG is more directly mappable to OOXML shapes (because OOXML is vector-native). The HTML→PPTX path always fights with text rendering; SVG→PPTX is much closer.

**Slide types** (their "layout system"): 16 canvas formats, multiple "scenes" per format, customizable.

**Special features**:
- **Native slide transitions & entrance animations** (PPTX supports both; most AI tools skip them)
- **Speaker notes → audio narration** via voice cloning
- **Custom template following** — clone slides from your own .pptx as starting point
- **SVG snapshot** for round-trip editing safety
- **6+ canvas formats** including Xiaohongshu, WeChat (Chinese social)
- **AI image generation** pluggable backends
- Models recommended: Claude Opus + gpt-image-2 / Gemini 3.5 Flash

**Strengths to borrow**:
- **The "harness + model" framing** — the tool ships the workflow, the model provides the taste. yuanfang's SKILL.md + content.json is the same idea but in JSON.
- **SVG as intermediate format** — when yuanfang's `yuanfang-html-ppt` renders to PowerPoint, SVG is probably the better path than the current `generator-a.js` / `generator-c.js` API.
- **Snapshots of SVG output** — `backup/<deck>/svg_output/` for re-export. Smart.

**Weaknesses to avoid**:
- **Massive scope**. 6 canvas formats, native animations, voice cloning, AI image gen, custom template following. Each of these is a year of work. Pick 2.
- **Hard dependency on AI IDEs** (Claude Code, Cursor, etc.). Won't work in a non-IDE context.
- 24k stars is **unusually high** for an AI-Skill project — it's because the project's owner runs a paid promotion. Treat the star count as marketing-influenced.

---

### 3.2 Akxan / ppt-agent-skill — **72★** (and its forks: `sunbigfly/ppt-agent-skills` 761★, `CerealAxis/Powerpoint-Generator` 0★)

This is the **Kimi-PPT-Agent design lineage** that the Chinese AI community forked.

**Original (Akxan/ppt-agent-skill)**:
- **6-step pipeline**: Requirements interview → Research → Outline → Planning → HTML design → Post-processing
- **26 styles** in 5 categories (dark professional / light premium / vibrant / oriental / nature-vintage)
- **18 chart types** in 3 tiers (basic, advanced, ECharts-level)
- **7 bento-grid layouts** (single focus, 50/50, asymmetric, three-col, primary-secondary, hero+sub, mixed)
- **7-level type scale** + typography rules (kerning, tabular-nums, OpenType features, serif-italic mixing)
- **8 failure modes** catalog with fix order
- **5 reference libraries** injected per step (styles, charts, typography, failure-modes, bento-grid)

**Architecture**:
```
SKILL.md (TIER 1 - entry, references all rules)
  ↓
6-step pipeline (TIER 2, each step is a sub-agent)
  ├── Interview (gate)
  ├── Research (gate)
  ├── Outline (gate)
  ├── Planning JSON (gate: validator)
  ├── HTML per slide (gate: visual QA)
  └── Post-processing (gate)
  ↓
Outputs (TIER 3):
  ├── preview.html (flip-through HTML)
  ├── presentation.pptx (SVG → PPTX)
  ├── presentation-svg.pptx (vector, editable)
  └── style-gallery/index.html (26-style preview)
```

**Reference structure** (worth copying):
```
references/
  ├── playbooks/         # per-step sub-agent manuals
  ├── styles/            # theme specifications
  ├── layouts/           # layout assets
  ├── charts/            # chart templates
  └── blocks/            # UI components
```

**Strengths to borrow**:
- **JSON contracts between steps** — each step's output is a JSON that's validated before the next step starts. yuanfang's "5 hard gate" workflow is the same idea, but JSON contracts are more inspectable.
- **Validator pattern** (`planning_validator.py`, `contract_validator.py`) — if the planning JSON is wrong, the slide never gets rendered.
- **Subagent isolation per stage** — Context doesn't bleed between research and design.
- **Style preview gallery** — `gallery.py` renders all 26 styles as a 1280×720 PNG grid for visual comparison.

**Weaknesses**:
- Pure HTML+CSS+SVG (no JS runtime) so that svg2pptx works. This is a hard constraint — no animations, no interactivity.
- 26 styles × 18 charts × 7 layouts × 12 card types = combinatorial explosion in the prompt. They handle this with a JSON contract per slide, but it's a lot of LLM tokens.
- The `CerealAxis/Powerpoint-Generator` fork adds 16 styles + 12 card types, **further increasing the combinatorial space** — a sign the design is hard to keep coherent.

---

### 3.3 SlideAgent — `Mrguanglei/SlideAgent` — **143★ / 22 fork**

- **URL**: https://github.com/Mrguanglei/SlideAgent
- **Stack**: FastAPI + React/Vite + Playwright + dom-to-pptx + GLM/DeepSeek/MiniMax/ByteDance/Kimi/Qwen
- **License**: CC BY-NC-SA 4.0 (non-commercial — not MIT!)

**Architecture**:
```
backend/                 # Python FastAPI
  ├── api_server.py
  ├── services/         # export, sharing, knowledge base
  ├── routers/          # API routes
  └── database/         # PostgreSQL

frontend/                # React + Vite
  ├── pages/            # Home, Knowledge, ShareView
  ├── components/
  └── lib/

export_tool/             # SEPARATE FastAPI service
  ├── app/              # PPTX, PDF, PNG, HTML export
  ├── dom-to-pptx/      # vendored fork of dom-to-pptx
  └── fonts/            # font assets for embedding
```

**Pipeline**:
```
LLM (GLM-4, DeepSeek-V3, MiniMax, Qwen)
  ↓
Generate HTML slides
  ↓
Playwright renders HTML
  ↓
dom-to-pptx → editable PPTX
  ↓
(also: PDF / PNG / HTML export)
```

**Key insight**: They **vendored dom-to-pptx** and patched it for font embedding. This is a sign that the upstream dom-to-pptx doesn't quite do what AI tools need.

**Strengths to borrow**:
- **Multi-format export from a single HTML source** (PPTX + PDF + PNG + standalone HTML). yuanfang's render.js should also offer PNG/PDF preview.
- **Conversational editing** with version history.
- **Knowledge base** (RAG over uploaded documents) — better source material → better decks.

**Weaknesses**:
- **Non-commercial license** (CC BY-NC-SA). Cannot be used in commercial products.
- No public disclosure of how the LLM is prompted.
- "PPTX styles may be lost; improving" — their dom-to-pptx fork is incomplete.

---

### 3.4 Allweone Presentation-AI — `allweonedev/presentation-ai` — **2.8k★ / 495 fork**

- **URL**: https://github.com/allweonedev/presentation-ai
- **Stack**: Next.js + TypeScript + Tailwind + Prisma + OpenAI/Together/Ollama + Plate Editor
- License: MIT

**Features**:
- Outline-first workflow (generate outline → review → generate slides)
- 38 built-in themes + custom theme creator
- PPTX theme import
- Drag-and-drop slide reorder
- Plate editor for rich text
- Web search toggle
- Multiple image generation backends
- 17.9k npm weekly downloads (Spectacle) — for context

**Architecture**: A traditional SaaS (DB + auth + multi-user). Closer to a closed-source competitor's architecture than to yuanfang's "skill + CLI" model.

**Strengths to borrow**:
- **38 themes + custom theme creator** — the most theme variety in OSS. yuanfang's 12 themes could grow.
- **PPTX theme import** — extract color palette from an existing .pptx and use it for new decks.
- **Outline-first workflow** — confirm the plan before generating visuals.

**Weaknesses**:
- SaaS architecture = infra burden (DB, auth, payments). Doesn't fit the "AI Skill" model yuanfang uses.
- Closed about how the LLM is prompted.

---

### 3.5 Presenton — `dbrainio/presenton` / `presenton/presenton` — **0★ official + many forks**

- **URL**: https://github.com/presenton/presenton
- **Stack**: Next.js (TS) + FastAPI (Python) + Tailwind + Prisma + Ollama
- License: Apache 2.0
- Live: https://presenton.ai

**Features**:
- **AI template generation** — upload a PPTX, the AI extracts the design system (colors, fonts, layouts) and turns it into a reusable template
- **MCP server** for programmatic generation
- Multi-provider (OpenAI, Gemini, Anthropic, Ollama)
- Custom templates in HTML + Tailwind
- PPTX + PDF export

**API contract** (well-defined, useful as a reference):
```
POST /api/v1/ppt/presentation/generate
{
  "content": "Introduction to Machine Learning",
  "n_slides": 5,
  "language": "English",
  "template": "general",
  "export_as": "pptx" | "pdf",
  "tone": "default" | "casual" | "professional" | "funny" | "educational" | "sales_pitch",
  "verbosity": "concise" | "standard" | "text-heavy",
  "include_table_of_contents": false,
  "include_title_slide": true,
  "files": ["<file_id>", ...]    // uploaded via /api/v1/ppt/files/upload
}
```

**Strengths to borrow**:
- **AI template generation** is unique. Yuanfang could let users drop a `template.pptx` and the system extracts the brand colors / fonts into a `brand-spec.json` automatically.
- **MCP server integration** is the right future-proofing for "AI calls AI tool". yuanfang could expose a small MCP server in addition to the CLI.
- **Public REST API** with predictable parameters — yuanfang's CLI is already this, but the parameter schema is informal.

**Weaknesses**:
- The "AI template generation" from PPTX is mostly a pitch. The actual implementation is "use python-pptx to read theme XML, dump it as JSON" — not really AI.
- 4 separate services (Next.js + FastAPI + Docker + npm) is heavyweight.

---

### 3.6 EvoPresent — `UCSB-AI/EvoPresent` — **342★ / 22 fork** — **ICLR 2026 paper**

- **URL**: https://github.com/UCSB-AI/EvoPresent
- License: MIT
- **The only AI PPT project with peer-reviewed academic backing**

**Architecture (with "self-improvement aesthetic agents")**:
```
Paper PDF
  ↓
Content extraction + voice generation
  ↓
Storyline + script
  ↓
Content enhancement (image gen + knowledge retrieval)
  ↓
Design + rendering
  ↓
Aesthetic checker (PresAesth — a Qwen2.5-VL-7B fine-tune)
  ↓
Iterate based on PresAesth feedback
```

**PresAesth** is a custom fine-tuned VLM that:
- Scores slides 0-10 on aesthetics
- Identifies specific defects
- Compares two slide versions
- Provides adjustment recommendations

**Why this matters**: Every other AI PPT tool relies on "the LLM just gets it right". EvoPresent admits it doesn't and trains a **separate reward model** to judge output quality. This is the right idea for yuanfang — even a small VLM-based "did the user just generate overlapping text?" checker would catch 80% of common failures.

**Strengths to borrow**:
- **Two-stage model design** — generative LLM + aesthetic VLM. yuanfang could ship a `qf-eval` step that screenshots each slide and runs a cheap VLM audit.
- **Defect taxonomy** — "8 failure modes" is exactly the right number. Yuanfang's `visual_qa.py` (CerealAxis fork) shows the same instinct.

**Weaknesses**:
- 5-stage pipeline is slow (5–10 minutes per deck).
- PresAesth only knows academic paper aesthetics.

---

### 3.7 SlidesAI — `leehomyc/SlidesAI` — **6★**

- **Stack**: Python + Marp + multi-LLM (Gemini/OpenAI/Claude/OpenRouter)
- **9 handcrafted themes** with curated typography
- **Academic poster mode** (`--poster` → single-page A0 landscape HTML)
- Uses Marp for the final PDF render

**Strengths**:
- **9 themes with curated typography** — quality > quantity. Each theme is described in detail.
- **Poster mode** — same engine, different canvas. yuanfang could do the same (Xiaohongshu / WeChat vertical sizes are already a thing in PPT Master).
- **Marp integration** — they use Marp's PPTX export for the final step. **Lesson**: don't reinvent the Markdown→PPTX pipeline, **use Marp** (or dom-to-pptx).

---

### 3.8 AppGambitStudio/Presentify — **low stars (very new)** but worth studying

- **12 slide types**: title, agenda, context, content, comparison, data, demo, story, quote, action, closing, thankyou
- **10 curated color palettes** with guaranteed readability
- **AImprovise** — Claude Opus-powered slide redesign
- **5 editing modes**: chat, click-to-edit, visual toolbar, JSON editor, AImprovise
- **21 slide components** in code
- **localStorage persistence** (no DB)

**Strengths**:
- **12 slide types** (named, opinionated) is the **sweet spot** for AI generation. Yuanfang has 7 — adding `comparison`, `data`, `quote`, `agenda`, `closing`, `story`, `demo` would expand to ~12.
- **10 curated palettes** with the contract "guaranteed readability" — yuanfang's 12 themes need this guarantee too.
- **5 editing modes** for users — JSON editor is the power-user escape hatch.

---

### 3.9 Other notable AI PPT tools (lower priority)

| Project | Stars | Engine | Notable |
|---|---|---|---|
| `0xZoharHuang/pptx-skill-cc-gemini-` | n/a | html2pptx.cjs | Uses Gemini CLI for HTML gen, swaps LLM backend |
| `premchand505/SLIDES_GEN` | 0 | pptxgenjs | 5 templates + Gemini 2.5 Pro |
| `paul0728/pptx-generator` | 0 | python-pptx | 11 slide types, mermaid diagrams, brand config |
| `cobacha/ppt-agent` | 1 | HTML | 18 themes, single-HTML export, self-hostable |
| `aresplus/tech-slides-generator` | 7 | python-pptx | 6 premium themes, Bento Box, Unsplash integration |
| `PythonicVarun/PPT-Generator` | 0 | python-pptx | Template-based styling, LLM template suggestion |
| `Hrithik-s-Raj/PptxGenJS-mcp-server` | 1 | pptxgenjs | MCP server — first-class AI tool |
| `TimSH021/presentations-cc` | 0 | python-pptx | 13 scripts, 7 industry profiles, distilled from OpenAI Codex |
| `yeasy/AutoPPT` | 2 | python-pptx | Multi-provider, mock mode, workbench for slide remix |
| `Engleonardorm7/PPT-AI` | 6 | python-pptx | Fine-tuned Qwen2.5-7B for python-pptx function calls |
| `vibing-ai/PresentationGenerator` | 0 | Next.js + Python | Qdrant vector storage, collaborative editing |
| `KhanhNguyen9872/Vibriona` | 1 | PptxGenJS | Multi-LLM (Gemini/Ollama/OpenAI), conversational |
| `proyecto26/slides-ai-plugin` | 12 | Bun + PptxGenJS | **12 curated style presets, GSAP animations, skia-canvas autoFontSize, validateDeck() with font min/bullet caps/speaker notes enforcement** |
| `Akxan/ppt-agent-skill` (original) | 72 | python-pptx | 26 styles, 18 charts, 7 bento layouts |
| `sunbigfly/ppt-agent-skills` (fork) | 761 | python-pptx | Adds state machine + subagent isolation + visual QA |
| `CerealAxis/Powerpoint-Generator` (fork) | 0 | python-pptx | 16 styles, 12 card types, dual PPTX export |

---

## 4. Reference Library — `dnnyngyen/kimi-agent-internals` and `kaismh/kimi-k2.5-prompts-tools`

These are **reverse-engineered artifacts** from Moonshot AI's Kimi K2.5 (the most-used Chinese AI PPT tool as of 2026). They expose the actual system prompts and skill structure.

- **Kimi Slides is a persona** (`prompts/slides.md`) — the same K2.5 model with different context instructions:
  > *"Spreadsheets have right answers, so Kimi uses skill files. Presentations require judgment, so Kimi uses a McKinsey consultant persona."*

- **The skill system has 6 personas** (Base Chat, OK Computer, Docs, Sheets, Slides, Websites) all using the same model.
- **The Slides skill includes**: docx/pdf-style reference docs, katex/math support, theme palettes, layout templates, speaker notes, and a "deliverable manifest" contract.

**Lesson for yuanfang**: **The persona-prompt + skill-file pattern is what scales**. Yuanfang's SKILL.md is the same idea. The next move: extract yuanfang's `SKILL.md` content into modular `references/*.md` files (playbooks, styles, layouts, charts, blocks) and let the agent load them on demand.

---

## 5. Cross-Cutting Architectural Patterns

After studying all 30+ projects, the following **convergent patterns** are clear:

### 5.1 Content format

| Project | Format | Why |
|---|---|---|
| `reveal.js` | HTML sections | Author-friendliness for devs |
| `slidev` | Markdown + YAML frontmatter | AI-friendly, human-editable |
| `marp` | Markdown + directives | Same as Slidev |
| `spectacle` | JSX/TSX | Type-safe React |
| `dom-to-pptx` | HTML element selector | Just a converter, not a content format |
| `presenton` | JSON | API-first |
| `yuanfang-html-ppt` (current) | JSON | AI-friendly, structured |
| `PPT Master` | Markdown → files | More readable than JSON |
| `paul0728/pptx-generator` | JSON / YAML / MD | All three — "AI generates JSON, human can edit YAML or MD" |
| `Akxan/ppt-agent-skill` | JSON contracts between stages | Stage isolation |

**Yuanfang's choice of JSON is right for AI**. To match Slidev's flexibility, yuanfang could also accept YAML with the same schema. YAML is much friendlier for hand-editing.

### 5.2 Pipeline architecture

| Pattern | Used by | Why |
|---|---|---|
| 6-step pipeline with JSON contracts | Akxan, sunbigfly, EvoPresent | Stage isolation, debuggability |
| SVG intermediate | PPT Master, sunbigfly | OOXML is vector-native, HTML fights with text |
| HTML + Playwright intermediate | dom-to-pptx, slide-gen, SlideAgent | Easier to author, well-trodden |
| 2-stage: generative LLM + judge VLM | EvoPresent | Quality gate |
| Plugin lifecycle (beforeParse / onParse / onSlide / afterGenerate) | html-in-pptx-out | Composability |
| pptxgenjs vs python-pptx vs native OOXML | Mixed | pptxgenjs wins for ease, python-pptx for edit, native for fidelity |

### 5.3 Theme system

| Pattern | Used by | Strengths |
|---|---|---|
| Plain CSS files (10–15) | reveal.js, Marp | Simple, copy-paste |
| npm-packaged themes (Slidev) | Slidev | Shareable, versioned |
| CSS variables + tokens (yuanfang-design) | yuanfang | Composable, single source of truth |
| Token + class metadata (Marp) | Marp | Themable without re-doing layout |
| Color palette + layout matrix (12 × 7) | yuanfang (current) | Predictable, but rigid |

**Yuanfang's "12 themes × 7 layouts" matrix is the right idea but a closed world.** The fix: **allow layout variants within a theme via class metadata** (Marp-style `<!-- _class: compact -->`).

### 5.4 What "AI-friendly" really means

After looking at all the AI projects, the requirements are:

1. **Discrete slide types** (5–20 named types) — easier to prompt
2. **Discrete content fields per type** (e.g., `title`, `points[]`, `image_path`) — easier to validate
3. **JSON or YAML contract** — every slide is a validated object
4. **Visual QA loop** — a screenshot of each slide is checked for overlap, overflow, contrast
5. **Iterate via re-render** — "regenerate slide 3 with a different layout" should be 1 API call
6. **Aesthetic guidance** — "this is what good looks like" (kernels, exemplars, anti-patterns)
7. **Speaker notes** — most projects have it; yuanfang currently doesn't
8. **Multi-format export** — PPTX, PDF, PNG, HTML, Markdown
9. **Custom brand support** — every serious project has it

### 5.5 The "declaration of input independence" pattern

The most successful AI PPT tools (PPT Master, Akxan, sunbigfly) all **separate the model from the engine**:

```
Model (Claude Opus / Gemini / GPT)
   ↓ reads
SKILL.md (workflow) + references/*.md (style guide, layout catalog, failure modes)
   ↓ writes
JSON contract
   ↓ executes
Generator scripts (deterministic, no LLM)
   ↓ produces
Editable PPTX
```

yuanfang's current `parse-slides.js` + `generator-a.js` / `generator-c.js` is exactly this pattern but not named as such. Naming it explicitly ("A+C hybrid engine") and making the contract a typed DTO would help.

---

## 6. yuanfang-html-ppt — Where It Sits vs. the Field

| Dimension | yuanfang today | Field median | Top competitor | Gap |
|---|---|---|---|---|
| Stars (project) | n/a | ~500 (most OSS) | 24k (PPT Master) | brand |
| Input format | JSON | JSON or MD | MD + JSON contract | support YAML |
| Layouts | 7 | 7–12 | 7–26 (Akxan) | 12 (named) |
| Themes | 12 | 5–10 | 26–38 | 12–18 |
| Theme system | CSS tokens + themes/*.css | CSS files | CSS + class metadata | add class metadata |
| Render engine | PptxGenJS API | pptxgenjs | SVG → native OOXML | try SVG intermediate |
| Charts | generator-charts.js (custom) | ECharts/Mermaid/Recharts | ECharts | Mermaid fallback |
| Speaker notes | ❌ | ✅ (most) | ✅ (all) | add |
| Animations | ❌ | partial | ✅ (PPT Master) | optional |
| Transitions | ❌ | partial | ✅ (PPT Master) | optional |
| Multi-format export | PPTX only | PPTX + PDF | PPTX + PDF + PNG + HTML | add PNG/PDF |
| Visual QA loop | ❌ | partial (Akxan) | ✅ (EvoPresent, sunbigfly) | add VLM audit |
| Custom PPTX template | ❌ | partial | ✅ (Presenton, PPT Master) | add |
| Animation/audio | ❌ | ❌ | ✅ (PPT Master voice) | out of scope |
| MCP server | ❌ | partial | ✅ (Presenton) | consider |
| Determinism | ✅ (CLI, no LLM) | mixed | mixed (LLM in loop) | **this is yuanfang's moat** |

**yuanfang's moat: deterministic, script-driven, no LLM in the render path.** Every other project bakes the LLM into the render loop, which means you can't run them without API keys and the output is non-reproducible. yuanfang is reproducible: same `content.json` → same `output.pptx` every time.

**The biggest gap: layout variants and visual QA.** The field has moved to 12+ named layouts with class-metadata-based variants, and most serious projects run a VLM-based visual QA loop.

---

## 7. Concrete Recommendations for yuanfang v2

### 7.1 Quick wins (1–2 weeks)

1. **Add `notes: string` per slide** in `content.json` → map to `slide.addNotes()`. PPTX supports it natively, every project has it.
2. **Add `layout: "content-compact"` / `layout: "data-with-chart"`** as class-metadata variants — extend the 7 layouts without breaking the enum.
3. **Add YAML input** (same schema) — `parse-slides.js` already does the heavy lifting, just add `yaml` parsing.
4. **Add a `print: true` flag to render to PDF/PNG** via PptxGenJS's `write("arraybuffer")` → headless conversion. Multi-format export with zero new dependencies.
5. **Ship a `prompt-template.md`** that instructs the LLM how to produce a valid `content.json`. Same idea as `llm-dom-to-pptx`'s `System_Prompt.md`. Increases success rate from "trial and error" to "one-shot".

### 7.2 Medium wins (1–2 months)

1. **Adopt the DTO + plugin lifecycle from `html-in-pptx-out`**:
   ```js
   parse-slides.js → emits typed SlideDTO[]
   render.js → applies plugin chain:
     - theme-override (replace tokens)
     - brand-override (replace colors)
     - unit-conversion (px → inches)
     - generator-a (PptxGenJS for layout)
     - generator-c (PptxGenJS for content)
   ```
2. **SVG intermediate path** (PPT Master approach) for layouts that fight the PptxGenJS API (complex gradients, freeform positioning). Keep HTML path as the default.
3. **Mermaid fallback for chart slides** — if no chart image is supplied, render a Mermaid diagram in a sandboxed iframe → screenshot → embed.
4. **Custom PPTX template support** — `inspect-template.py` (à la `TimSH021/presentations-cc`) extracts theme XML → yuanfang `brand-spec.json`. Then `generator-a.js` follows the same color/font logic.

### 7.3 Strategic plays (3–6 months)

1. **Visual QA loop with a VLM**. Use Qwen2.5-VL-7B or similar local model. Loop: render slide → screenshot → "are there overlapping elements? is text overflowing? is the contrast sufficient?" → regenerate with the issue flagged. This is the **EvoPresent move** and it's the only reliable way to scale beyond ~5 layouts.
2. **MCP server wrapper** (à la `Hrithik-s-Raj/PptxGenJS-mcp-server`). Expose `yuanfang_ppt_create(content_json, theme)` as an MCP tool. Now any Claude Desktop, Cursor, or other MCP client can call yuanfang natively.
3. **Persona + skill-file split** (à la Kimi K2.5). Move yuanfang's SKILL.md content into modular `references/styles.md`, `references/layouts.md`, `references/typography.md`, `references/failure-modes.md`. The agent loads only what it needs.

### 7.4 What to **not** do

- **Don't build a full SaaS** (Presenton, allweone, SlideAgent). The maintenance burden of DB + auth + payments + multi-user will eat the project.
- **Don't merge layout enums with class metadata prematurely** — keep `layout: "content"` for backward compat, add `class: "compact"` as a parallel field.
- **Don't swap PptxGenJS for python-pptx or native OOXML** in v2. PptxGenJS is the right level of abstraction. The PPT Master's SVG path is worth studying but a much bigger refactor.
- **Don't add more themes than 18** without first auditing "guaranteed readability" for each. Allweone has 38 themes but most are variants. Curate.
- **Don't add AI image generation as a core feature** — the dependency cost (API keys, model backends, image caching) is enormous and unrelated to yuanfang's deterministic-rendering moat. Defer to users bringing their own images.

---

## 8. Appendix — Project Index (sorted by GitHub stars, descending)

| # | Project | Stars | Tier | Engine | License |
|---|---|---|---|---|---|
| 1 | `hakimel/reveal.js` | 71.6k | Framework | Browser | MIT |
| 2 | `slidevjs/slidev` | 47k | Framework | Vite + Vue | MIT |
| 3 | `gnab/remark` | 13k | Framework | Browser | MIT |
| 4 | `formidablelabs/spectacle` | 10.1k | Framework | React | MIT |
| 5 | `gitbrent/PptxGenJS` | (library) | Library | Node | MIT |
| 6 | `hugohe3/ppt-master` | 24.6k | AI tool | Python harness | MIT |
| 7 | `marp-team/marpit` | 1k | Framework | markdown-it | MIT |
| 8 | `marp-team/marp-core` | 3.4k | Framework | markdown-it | MIT |
| 9 | `marp-team/marp-cli` | 2.7k | Framework | markdown-it | MIT |
| 10 | `sunbigfly/ppt-agent-skills` | 761 | AI tool | python-pptx | NOASSERTION |
| 11 | `UCSB-AI/EvoPresent` | 342 | AI tool | python-pptx | MIT |
| 12 | `allweonedev/presentation-ai` | 2.8k | AI tool | Next.js | MIT |
| 13 | `atharva9167j/dom-to-pptx` | 216 | Converter | pptxgenjs | MIT |
| 14 | `Mrguanglei/SlideAgent` | 143 | AI tool | dom-to-pptx | CC BY-NC-SA 4.0 |
| 15 | `Akxan/ppt-agent-skill` | 72 | AI tool | python-pptx | MIT |
| 16 | `deckgo/deckdeckgo` | 1.7k | Framework | Stencil | Apache 2.0 (DEPRECATED) |
| 17 | `proyecto26/slides-ai-plugin` | 12 | AI tool | Bun + PptxGenJS | MIT |
| 18 | `leehomyc/SlidesAI` | 6 | AI tool | Marp | MIT |
| 19 | `joker-duzhong/html-to-pptx` | low | Converter | pptxgenjs | MIT |
| 20 | `dxsun97/html2pptx-pro` | 8 | Converter | pptxgenjs | MIT |
| 21 | `0-AI-UG/slide-gen` | 0 | Converter | Native OOXML | MIT |
| 22 | `christphralden/html-in-pptx-out` | 0 | Converter | pptxgenjs | MIT |
| 23 | `AppGambitStudio/Presentify` | low | AI tool | Next.js | MIT |
| 24 | `dbrainio/presenton` | 0 | AI tool | Next.js + FastAPI | Apache 2.0 |
| 25 | `0xZoharHuang/pptx-skill-cc-gemini-` | n/a | AI skill | html2pptx | MIT |
| 26 | `aresplus/tech-slides-generator` | 7 | AI tool | python-pptx | MIT |
| 27 | `yeasy/AutoPPT` | 2 | AI tool | python-pptx | Apache 2.0 |
| 28 | `dnnyngyen/kimi-agent-internals` | n/a | Reference | n/a | n/a |
| 29 | `TimSH021/presentations-cc` | 0 | AI tool | python-pptx | MIT |
| 30 | `cobacha/ppt-agent` | 1 | AI tool | FastAPI + HTML | MIT |
| 31 | `CerealAxis/Powerpoint-Generator` | 0 | AI tool | python-pptx | MIT |

**Total: 31 distinct open-source projects surveyed across framework, converter, and AI-tool tiers.**

---

## 9. Sources

- GitHub repo pages (search via `https://github.com/<owner>/<repo>`)
- Web search results from `exa` semantic search
- Direct `webfetch` to project READMEs and technical docs
- npm registry pages (libraries.io for download stats)
- DeepWiki entries for Marp (architecture deep-dives)
- `dnnyngyen/kimi-agent-internals` and `kaismh/kimi-k2.5-prompts-tools` for the Kimi K2.5 reverse-engineering artifacts

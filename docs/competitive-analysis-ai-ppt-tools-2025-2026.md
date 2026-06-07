# Commercial AI PPT Tools 2025-2026 — UX & Feature Analysis

**Date:** 2026-06-07
**Focus:** Patterns we can borrow in `yuanfang-html-ppt` (open-source CLI PPT generator)
**Complements:** `competitive-analysis-2026-06-07.md` (open-source HTML-to-PPTX engines)

---

## 0. TL;DR — What to steal for our CLI

1. **Outline-first generation** (Beautiful.ai, Gamma) — never jump from prompt → deck. Generate outline, let user confirm, then design.
2. **Multiple input modes** (Gamma, Decktopus, MagicSlides) — text prompt, paste-in outline, document upload (PDF/DOCX), URL, YouTube.
3. **Text-density control** (Gamma) — `brief | balanced | detailed` per slide.
4. **Remix/re-layout** (SlidesAI, Plus AI) — same content, swap layout without regenerating text.
5. **Editable PPTX export is non-negotiable** (Tome's pivot proved this) — `yuanfang-html-ppt` already does this, our key moat.
6. **Auto-generated speaker notes** (Presentations.AI, Decktopus) — low-effort high-value addition.
7. **Document-to-deck** (MagicSlides, Plus AI, Beautiful.ai) — `pdf/docx/md → content.json` pipeline is a high-frequency use case.
8. **Theme/layout as swappable JSON files** (Beautiful.ai "Smart Slides") — extend our existing 12-theme/7-layout system with "remix" CLI.
9. **No vendor lock-in** (lesson from Tome) — pure local CLI is a real differentiator; lean into it.
10. **Brand asset library** (Beautiful.ai, Pitch) — JSON-based brand-spec with `colors | fonts | logo | footer | palette_extraction`.

**Patterns to AVOID:**
- Card-based "scroll" decks (Gamma) — proprietary format, breaks PPTX export.
- Locked-in analytics & sharing — irrelevant for a local CLI.
- Interactive polls/word clouds (Sendsteps) — out of scope.
- "AI Sales Assistant" pivot (Tome's failure) — chasing enterprise = abandoning core users.

---

## 1. Tool-by-Tool Breakdown

### 1.1 Gamma.app — `gamma.app`

| Attribute | Value |
|---|---|
| **Input format** | Prompt, paste-in text, file (PDF/DOCX/PPT), URL, Notion doc |
| **Output** | Hosted web page (default), PPTX, PDF, PNG, Google Slides, embed |
| **Template/theme library** | 100+ themes; 20+ AI models for content/image generation |
| **AI capabilities** | Outline generation, full deck generation, "Gamma Agent" v3.0 (chat-based editing), AI image gen (Flux/Imagen/Ideogram/Leonardo), 65+ languages, web research, restyle/restructuring |
| **Layout system** | "Cards" not slides — flexible containers, not fixed 16:9. Smart Layouts: bullets, icons, timeline, arrows, funnel, pyramid, steps, etc. |
| **Editing experience** | Block-based editor, command bar (`/` to add), AI chat for revisions, real-time collaboration (paid), version history, analytics on views |
| **Export options** | PPTX, PDF, PNG, Google Slides, share link, embed, publish as website |
| **Unique strengths** | Fastest first draft (43s for 12-slide deck); most polished out-of-box design; huge integration ecosystem (Figma, Airtable, YouTube, Loom, etc.) |
| **Pricing** | Free: 400 one-time credits (~5-10 decks). Plus: $8/mo. Pro: $16/mo. Team: custom. |
| **Scale** | 50M+ users, 700K creations/day (as of 2025-08) |
| **Notable** | Card format doesn't translate to 16:9 PPTX cleanly — biggest weakness. |

**Lesson for CLI:** Outline-first + text-density control. PPTX export quality is still imperfect, which validates our "PPTX-native" positioning.

---

### 1.2 Beautiful.ai — `beautiful.ai`

| Attribute | Value |
|---|---|
| **Input format** | Prompt, full outline, document upload for context |
| **Output** | Native PPTX (best in class), PDF, share link |
| **Template/theme library** | 300+ "Smart Slide" layouts; pre-set themes; custom theme builder |
| **AI capabilities** | "Create with AI" workflow: prompt → outline (text-first) → design → refine. AI writing assistant (rephrase, tighten, expand). AI image gen. 100+ languages. Powered by Anthropic Claude. |
| **Layout system** | 300+ Smart Slides that auto-realign as you edit content. Two modes: Smart Slides (design-controlled) or Classic Slides (free). |
| **Editing experience** | Theme-bound; you can't pixel-push. But every change preserves design integrity. "Iterate slide-by-slide" — switch layouts while keeping copy. |
| **Export options** | Editable PPTX, PDF, share link |
| **Unique strengths** | Best design consistency without manual work. "Anti-fragile" design system — Smart Slides adapt to content changes. Brand guardrails (locked themes, shared libraries). |
| **Pricing** | Pro: $12/mo (annual). Team: $40/seat/mo. Enterprise: custom. 14-day free trial. One-off deck: $45. |
| **Notable** | "Powered by Anthropic" — Claude-based AI. |

**Lesson for CLI:** 300 layouts feel like overkill but the principle is right — provide enough layouts that the user doesn't need to manually position. Our 7 layouts cover the basics; adding `quote`, `timeline`, `process`, `compare` variants would help.

---

### 1.3 Tome.app — `tome.app` ⚠️ DEFUNCT

| Attribute | Value (before shutdown) |
|---|---|
| **Status** | **Presentation features discontinued April 30, 2025.** Pivoted to AI sales automation. Brand acquired by AngelList. Original team rebranded as Lightfield (CRM). |
| **Input** | Prompt, outline, document |
| **Output** | PDF only (no PPTX — fatal flaw) |
| **Templates** | 100+ |
| **AI capabilities** | GPT-based content gen, AI image gen (Stable Diffusion SDXL), AI text rewrite, AI personalization (Enterprise) |
| **Layout** | Tile-based (not slides) — broke slideshow format |
| **Pricing** | Free / Pro $16/mo / Enterprise custom |
| **Scale** | 20M users before pivot, $81.6M raised, $300M valuation → shut down at <$4M ARR |

**Critical lessons (from their failure):**
1. **No PPTX export = deal-breaker for business users.** Tome's tile format was innovative but unusable in corporate workflows.
2. **No slideshow mode** — they created "documents" not presentations.
3. **Proprietary format = lock-in risk** — when they shut down, users lost everything (no export option).
4. **Long-form text on tiles ≠ business presentations** — bullet points win in B2B.

**Lesson for CLI:** Validate the `yuanfang-html-ppt` approach even more. Editable PPTX + open file format + local execution = no lock-in. This is our moat.

---

### 1.4 SlidesAI.io — `slidesai.io`

| Attribute | Value |
|---|---|
| **Input format** | Text paste, topic, PDF/document upload, URL, YouTube link |
| **Output** | Native Google Slides (auto-saved to Drive), PPTX export, MP4 (coming) |
| **Templates** | Built-in themes (Corporate, Creative, Academic); 1.5M stock image library |
| **AI capabilities** | Text-to-slides, content summarization, paraphrasing, AI image gen, "Magic Write" (7 AI tools: paraphrase, image gen, citation search, icon search, etc.) |
| **Layout system** | Slides fixed into Google Slides layouts; "Remix" feature re-arranges a single slide |
| **Editing experience** | Inside Google Slides. "Edit Theme", "Remix Slides" (rearrange single slide), "Magic Write" sidebar. |
| **Export** | Google Slides (native), PPTX, MP4 (coming) |
| **Unique strengths** | Lives where users already work. Cheap. 15M+ installs on Workspace Marketplace. |
| **Pricing** | Free: 3 presentations/mo. Basic: $10/mo. Pro: $20/mo (annual). |
| **Rating** | 4.3/5 on Workspace Marketplace; 2.5-2.6/5 on Trustpilot |

**Lesson for CLI:** "Remix" a single slide = low-cost high-value feature. We can support `--remix slide.json --layout timeline` to re-layout a single slide without re-generating content. Users repeatedly complain that AI output needs "layout tweaking."

---

### 1.5 Plus AI — `plusai.com`

| Attribute | Value |
|---|---|
| **Input format** | Prompt, document upload (PDF/DOCX/TXT) |
| **Output** | **Native PPTX** (own Open XML renderer — they BUILD .pptx files, not convert from another format) |
| **Templates** | Custom themes + custom templates (Enterprise) |
| **AI capabilities** | Prompt-to-deck, doc-to-deck, "Remix" (reformat a slide into a 3-column, pro/con, etc.), AI rewrite, AI translate, AI image gen, brand kits |
| **Layout system** | Native Google Slides/PowerPoint layouts (not a proprietary editor) |
| **Editing experience** | Lives inside Google Slides / PowerPoint. "Rewrite", "Remix", brand kit applied automatically. "Plus Snapshots" for live data embeds. |
| **Export** | Native PPTX (their key differentiator) |
| **Unique strengths** | Native rendering — slides ARE real PPTX, not screenshots. The 2M+ installs, 4.6-star average. "Edit with Plus AI" rewrites in place. |
| **Pricing** | Basic: $10/mo. Pro: $20/mo. Team: $30/mo. Enterprise: custom. 7-day free trial. |
| **Notable** | Built own Open XML renderer — significant engineering investment. **This is closest to our philosophy.** |

**Lesson for CLI:** They built their own PPTX renderer to avoid "export issues." We use PptxGenJS which already produces native editable PPTX — same goal, easier path. Validate this is the right bet.

---

### 1.6 Presentations.AI — `presentations.ai`

| Attribute | Value |
|---|---|
| **Input format** | Prompt, file upload (PDF/Word/PPT), URL |
| **Output** | **PDF only on free; PPTX on Pro plan** |
| **Templates** | Theme-based gallery; multiple brand profiles |
| **AI capabilities** | "Clip-E" AI assistant; "zero-touch design" (auto layout/font/animation); "Remix/Transform"; AI image gen; live data connections; "Refresh Agent" (auto-update slides from data) |
| **Layout system** | Auto-formatting; 40+ features in 8 categories |
| **Editing experience** | "AI cannot add new slides to existing presentation" — fatal limitation per reviews |
| **Export** | PDF (free), PPTX (Pro, $198/yr), Google Slides |
| **Unique strengths** | Live data connections (slides auto-refresh from Sheets/databases). Anti-fragile design. |
| **Pricing** | Free: 200 credits (~40 slides), no export. Pro: $198/yr single user (5,000 credits). Business: $999/yr. Enterprise: custom. |
| **Notable** | PowerPoint export locked behind $198/yr paywall. |

**Lesson for CLI:** "Anti-fragile design" — our layouts should also auto-handle content overflow/shortage gracefully. "Live data connection" is interesting but out of CLI scope (user can pre-render with their data).

---

### 1.7 Decktopus.com — `decktopus.com`

| Attribute | Value |
|---|---|
| **Input format** | Form-based Q&A (not a prompt) — Decktopus asks audience/tone/goals/industry questions, then generates. Also paste-text and URL. |
| **Output** | PDF, PPTX, live link |
| **Templates** | Niche templates for specific use cases (lesson plans, business proposals) |
| **AI capabilities** | AI content, AI speaker notes, AI image gen, AI rewriter, AI Q&A coach (mock interview on your deck) |
| **Layout system** | Pre-designed templates; drag-and-drop editor |
| **Editing experience** | Form-first generation; "Regenerate slide" button; drag-and-drop |
| **Export** | PDF, PPTX, share link |
| **Unique strengths** | **Form-based input** (vs prompt) — guides users to better output. AI Q&A coaching mode. Audio narration. |
| **Pricing** | Free: 3-deck limit, 100 credits. Pro: $6/mo (unlimited). Business: $14.99/mo. |
| **Notable** | 3-deck free limit and 1.5/5 Trustpilot — refund complaints. No editing of content post-gen. |

**Lesson for CLI:** Form-based input is an interesting idea — we could ship a `ppt interactive` mode that asks clarifying questions before generating. But for CLI, a flag-based equivalent (`--audience execs --tone formal --purpose pitch`) might be more idiomatic.

---

### 1.8 MagicSlides.app — `magicslides.app`

| Attribute | Value |
|---|---|
| **Input format** | Text, YouTube URL, PDF, DOCX, website URL |
| **Output** | Google Slides (native), PPTX, PDF |
| **Templates** | 100+ language support; uses any PowerPoint as template |
| **AI capabilities** | Text→PPT, YouTube→PPT, PDF→PPT, URL→PPT, "AskPPT" (chat with presentation), AI image gen (addon), MCP support (Model Context Protocol) |
| **Layout system** | Fixed Google Slides layouts; 5 presentation types (General/Educational/Sales/Conference/Custom) |
| **Editing experience** | Inside Google Slides. "Clone Slide" (image → editable PPT). Telegram bot, Figma plugin, ChatGPT integration. |
| **Export** | Google Slides, PPTX, PDF |
| **Unique strengths** | **MCP (Model Context Protocol) integration** — can be invoked from Claude/AI agents. Telegram bot. Figma plugin. |
| **Pricing** | Free: 3 decks/mo, 10 slides, 2.5K chars. Pro: $6.7/mo. Premium: $12.4/mo. Lifetime: $359. |
| **Scale** | 2.3M users |

**Lesson for CLI:** **MCP integration is the future.** If we expose `yuanfang-html-ppt` as an MCP server, AI agents can call it directly. Multiple input sources (YouTube, URL) is a "low-cost high-value" addition.

---

### 1.9 Sendsteps.com — `sendsteps.com`

| Attribute | Value |
|---|---|
| **Input format** | Prompt, document upload (Word/PowerPoint/PDF/TXT) |
| **Output** | PowerPoint (native), PDF, Teams integration |
| **Templates** | Standard templates; PowerPoint add-in available |
| **AI capabilities** | GPT-3 based; content gen, AI rewrite, plagiarism check (99.9% original claim), live polls/quizzes/Q&A/word clouds |
| **Layout system** | Limited; can't change layout with prompt; doesn't generate images |
| **Editing experience** | Limited customization; can't apply custom branding/themes |
| **Export** | PPTX, PDF, live interactive mode |
| **Unique strengths** | **Interactive elements (live polls, word clouds, Q&A)** — unique to education. Works offline (SMS-based audience input). GDPR/ISO 27001. |
| **Pricing** | Free: 2 presentations, English only, 10-person audience. Starter: $9.50/mo. Pro: $19.50/mo. Enterprise: custom. |
| **Scale** | 2.5M users; customers: Harvard, UC |

**Lesson for CLI:** **Less relevant for our use case.** Interactive features are a UI thing, not a CLI thing. But: GPT-3-era quality is below current bar; users complain about inaccuracy and limited design.

---

### 1.10 Pitch.com — `pitch.com`

| Attribute | Value |
|---|---|
| **Input format** | Template selection (100+), AI prompt, file import (PPTX) |
| **Output** | Native PPTX, PDF, share link |
| **Templates** | 100+ expert-designed templates (Portfolio, Brand, Agency, Marketing, Proposal) |
| **AI capabilities** | "Pitch Agent" — AI deck generation (47s for 10-slide deck), brand kit enforcement, slide personalization for audience, AI text gen |
| **Layout system** | Designer-crafted; custom font/brand library; slide-level status tracking |
| **Editing experience** | **Real-time multi-user collaboration (Figma-class)**, live cursors, slide assignments, comments, version history, async video recordings on slides |
| **Export** | PPTX, PDF, share link with analytics |
| **Unique strengths** | **Best collaboration UX in the space.** Async video recording on slides (creator-economy use case). Engagement analytics per slide. |
| **Pricing** | Free: unlimited presentations, 5 members. Pro: €12/mo. Team: €18/seat/mo. Business: €24/seat/mo. |
| **Scale** | 1.7M+ teams; €100M+ raised (founded by Wunderlist creator) |
| **Notable** | NOT primarily an AI tool — AI features are supplementary; the product wins on collaboration + design. |

**Lesson for CLI:** Collaboration is out of scope, but: **slide-level assignments** (assign slide N to author X) could be a metadata feature in our content.json. Async video recording is irrelevant for our use case.

---

## 2. Cross-Cutting UX Patterns That Work

### 2.1 Input patterns (popularity & frequency)

| Input mode | Used by | CLI implementation |
|---|---|---|
| **Text prompt** | Gamma, Beautiful.ai, Tome, Plus AI, Presentations.AI, Sendsteps, Pitch | `--prompt "..."` |
| **Paste full outline** | Gamma, Beautiful.ai, Plus AI, Tome | `--file outline.md` |
| **Document upload (PDF/DOCX)** | Gamma, SlidesAI, Plus AI, Presentations.AI, MagicSlides, Sendsteps | `--file spec.pdf` (auto-parse) |
| **URL** | Gamma, SlidesAI, MagicSlides, Presentations.AI | `--from-url https://...` |
| **YouTube link** | SlidesAI, MagicSlides | `--from-youtube <id>` |
| **Existing PPTX import** | Decktopus, Plus AI, Beautiful.ai | `--from-deck old.pptx` (extract text) |
| **Form/Q&A input** | Decktopus | `--audience execs --tone formal` flags |

### 2.2 The "Outline First" Pattern (most validated)

Every positive review mentions this. Beautiful.ai makes it the centerpiece of their workflow:

```
Prompt → [AI generates text-only outline] → [User reviews/edits] → 
→ [User confirms] → [AI designs slides inside Smart Slides] → 
→ [User iterates slide-by-slide] → Export
```

Gamma does the same: "Gamma shows you a proposed outline before generating. This is your chance to add, remove, or reorder sections. Take a moment to adjust the outline — it is much faster to restructure at this stage than after generation."

**Why it works:** "The first output lottery" is the #1 pain point in AI tools. Users hate getting a beautiful deck that has the wrong structure.

**Our CLI opportunity:** A two-step generation mode:
1. `ppt draft outline.md --prompt "Q3 product update"` → outputs `outline.json`
2. User reviews/edits
3. `ppt render outline.json --theme dark-gold --output deck.pptx` → final PPTX

### 2.3 The "Remix" Pattern (high-leverage low-effort)

SlidesAI, Plus AI, Beautiful.ai all ship it: take an existing slide and try a different layout while keeping content.

**Our CLI opportunity:** Add `ppt remix content.json --slide 3 --layout timeline` to re-layout a single slide without changing text.

### 2.4 Text-Density Control (Gamma's differentiator)

User picks: `brief` | `balanced` | `detailed` — controls how much text per slide.

**Our CLI opportunity:** A `--density` flag that adjusts our `content` layout's point count limit (currently implicit).

### 2.5 The "First Output Lottery" Problem

Across all reviews, the #1 complaint is: "The AI generated something but it's not what I wanted." Solutions:
- **Outline-first** (Beautiful.ai, Gamma)
- **Clearer pre-generation controls** (text density, image source, style)
- **Iterative slide-by-slide editing** (Beautiful.ai)
- **Per-slide regeneration** (Tome, SlidesAI, Plus AI)

### 2.6 What users actually want (frequency in reviews)

| Feature | Mentioned in reviews | CLI relevance |
|---|---|---|
| Editable PPTX export | EVERY review (top complaint) | ✅ Already have |
| Custom branding that auto-applies | Frequent | ✅ Already have (brand-spec) |
| No watermarks | Universal | ✅ N/A (open source) |
| Speaker notes auto-gen | High | Easy add |
| Doc-to-deck conversion | High | Easy add |
| Outline-first generation | High | Easy add |
| Single-slide remix | Medium | Easy add |
| Sub-30s generation | High | ✅ N/A (instant) |
| Bulk operations (batch) | Niche but valued | Easy add |
| AI image generation | High | Optional |
| Analytics on views | Sales/marketing only | ❌ N/A |
| Real-time collaboration | Team only | ❌ N/A |
| No vendor lock-in (post-Tome) | Increasing | ✅ Strong moat |
| Offline / local execution | Increasing | ✅ Strong moat |
| Web/PPTX export | Medium | We do PPTX |

---

## 3. Recommendations for `yuanfang-html-ppt`

### 3.1 High-Impact, Low-Effort Adds (priority order)

| # | Feature | Effort | Why |
|---|---|---|---|
| 1 | **Outline-first mode** (`ppt draft --prompt "..."`) | Medium | Validated across 5+ tools. Removes "first output lottery." |
| 2 | **Remix single slide** (`ppt remix --slide N --layout L`) | Low | Three tools ship it. High user value. |
| 3 | **Speaker notes auto-gen** (`--speaker-notes`) | Low | Universal feature. Pure value-add. |
| 4 | **Doc import** (`ppt import spec.pdf → outline.json`) | Medium | High-frequency use case. |
| 5 | **URL/YouTube import** | Medium | Differentiates from Plus AI / SlidesAI. |
| 6 | **Density control** (`--density brief|balanced|detailed`) | Low | Trivial to add. |
| 7 | **More layouts** (timeline, process, compare, kpi-grid, table) | Medium | 7 → 12 layouts. Match Beautiful.ai's variety. |
| 8 | **MCP server wrapper** | Medium | Future-proof for AI-agent use. |
| 9 | **Batch mode** (`ppt batch --from-glob "*.md"`) | Low | Power-user feature. |
| 10 | **AI image generation** (`--images auto`) | High | Needs API key management. Optional. |

### 3.2 Architectural Patterns to Adopt

**A. JSON content schema as the source of truth.** All tools converge on this. Our `content.json` is correct; extend it with:
- `meta.audience`, `meta.tone`, `meta.purpose` (for downstream AI generation)
- `meta.outline_only: true` (generate outline, not full slides)
- `slides[].density` (per-slide override)
- `slides[].speakerNotes` (auto-gen or manual)
- `slides[].images[]` (with `source: stock|ai|upload|placeholder`)

**B. Theme/Layout as swappable files.** Beautiful.ai's "Smart Slides" and "Classic Slides" toggle is a hint. Our `themes/*.css` + `layouts/*.json` should be hot-swappable; add `ppt themes list`, `ppt layouts list`.

**C. "Anti-fragile" rendering.** Presentations.AI's "auto-adjusts to content" — our layouts should already handle bullet-count variation, but explicitly document & test edge cases.

**D. Render metadata in output.** Embed `meta.json` (generator version, schema version, theme hash) into the PPTX's custom properties. Helps with debugging & reproducibility.

**E. Multi-format export.** All competitors ship PPTX + PDF. We have PPTX. PDF is one extra PptxGenJS call (`pptx.write({ outputType: 'pdf' })` if available, or use LibreOffice headless). Worth adding.

### 3.3 Positioning Strategy (for README/marketing)

**Three angles where we uniquely win:**

1. **"Edit, not screenshot"** — vs Gamma/Tome (cards, not slides). We output real PPTX with real text/shapes.
2. **"Local, not cloud"** — vs every commercial tool. No data leaves your machine. No subscription.
3. **"Deterministic, not lucky"** — vs Beautiful.ai/Gamma. Same input → same output. Git-friendly JSON.

**One angle to avoid:** Don't compete on "AI generation quality." We don't have the GPU budget to train a better model than Anthropic/OpenAI. Better to be the **rendering layer** that AI agents call, not the AI itself.

### 3.4 Pricing Reference Table (commercial tools)

| Tool | Free Tier | Entry Paid | Pro Tier | Enterprise |
|---|---|---|---|---|
| Gamma | 400 one-time credits | $8/mo | $16/mo | Custom |
| Beautiful.ai | 14-day trial | $12/mo | $40/seat/mo | Custom |
| SlidesAI | 3 decks/mo | $10/mo | $20/mo | Custom |
| Plus AI | 7-day trial | $10/mo | $20/mo | $30/seat/mo |
| Presentations.AI | 200 credits (no export) | $198/yr | $999/yr | Custom |
| Decktopus | 3-deck limit | $6/mo | $14.99/mo | Custom |
| MagicSlides | 3/mo, 10 slides | $6.7/mo | $12.4/mo | $23.3/mo |
| Sendsteps | 2 decks, English | $9.50/mo | $19.50/mo | Custom |
| Pitch | 5 members unlimited | €12/mo | €18/seat/mo | €24/seat/mo |
| **yuanfang-html-ppt** | **MIT (free forever)** | **—** | **—** | **—** |

**Open-source is a feature, not just a price.** Tome's shutdown destroyed user data for 20M people. Our positioning: "The presentation tool your data outlives."

---

## 4. Appendix: Quick Reference of Specific Features

### 4.1 AI Models Referenced (as of late 2025/2026)

- **Text generation:** Anthropic Claude (Beautiful.ai), GPT-4 class (Tome, SlidesAI, Plus AI, MagicSlides), GPT-3 (Sendsteps — dated)
- **Image generation:** Flux, Imagen 3, Ideogram 3, Luma, Leonardo, DALL-E 3, Recraft, Stable Diffusion SDXL (Gamma offers 8+ models; user picks)
- **Speech/audio:** Some add audio narration (Decktopus)

### 4.2 Layout Counts (where published)

- Gamma: ~20+ "Smart Layouts" (bullets, icons, timeline, arrows, funnel, pyramid, steps, etc.) — within card system
- Beautiful.ai: 300+ Smart Slides
- Pitch: 100+ templates (each = a deck, not a single layout)
- Presentations.AI: 40+ features but layout count not published
- Decktopus: dozens of templates (slide count varies)
- Most others: 5–20 fixed layouts in their native format

### 4.3 Export Format Support Matrix

| Tool | PPTX | PDF | Google Slides | Web | Image | Video |
|---|---|---|---|---|---|---|
| Gamma | ✅ | ✅ | ✅ | ✅ (default) | ✅ PNG | ❌ |
| Beautiful.ai | ✅ (best) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Tome | ❌ | ✅ (only) | ❌ | ✅ | ❌ | ❌ |
| SlidesAI | ✅ | ❌ | ✅ (native) | ❌ | ❌ | ✅ (coming) |
| Plus AI | ✅ (native) | ❌ | ✅ (native) | ❌ | ❌ | ❌ |
| Presentations.AI | ✅ (paid) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Decktopus | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| MagicSlides | ✅ | ✅ | ✅ (native) | ❌ | ❌ | ❌ |
| Sendsteps | ✅ | ✅ | ❌ | ✅ (live) | ❌ | ❌ |
| Pitch | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ (video record) |
| **yuanfang-html-ppt** | ✅ (native) | ❌ | ❌ | ❌ | ❌ | ❌ |

**Gap to address:** Add PDF export. Use PptxGenJS if available, else LibreOffice headless (`soffice --headless --convert-to pdf`).

### 4.4 Input Source Support Matrix

| Tool | Prompt | Paste Text | File Upload | URL | YouTube | Existing PPTX |
|---|---|---|---|---|---|---|
| Gamma | ✅ | ✅ | ✅ PDF/DOCX/PPT | ✅ | ❌ | ✅ |
| Beautiful.ai | ✅ | ✅ | ✅ (context) | ❌ | ❌ | ✅ |
| SlidesAI | ✅ | ✅ | ✅ PDF/URL/YT | ✅ | ✅ | ❌ |
| Plus AI | ✅ | ✅ | ✅ PDF/DOCX/TXT | ❌ | ❌ | ❌ |
| Presentations.AI | ✅ | ✅ | ✅ PDF/Word/PPT | ✅ | ❌ | ✅ |
| Decktopus | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| MagicSlides | ✅ | ✅ | ✅ PDF/DOCX | ✅ | ✅ | ❌ |
| Sendsteps | ✅ | ❌ | ✅ Word/PPT/PDF/TXT | ❌ | ❌ | ✅ |
| Pitch | ✅ | ✅ | ✅ (PPTX) | ❌ | ❌ | ✅ |

**Opportunity:** Multi-source import is "table stakes" for AI PPT tools. Add `ppt import` to handle PDF, DOCX, URL, YouTube → `outline.json`.

---

## 5. Sources

Research conducted 2026-06-07 via web search. Key review sources:
- Gamma: 24slides.com, Kripesh Adwani (50+ deck test), Skywork.ai, ComputerTech.co, Effloow
- Beautiful.ai: official pricing page, beautiful.ai/ai-content-creation, beautiful.ai/smart-slides
- Tome: max-productive.ai (pivot documentation), tooljunction.io, autoppt.com (post-mortem), deckary.com
- SlidesAI: findyourbestai.com, softtooler.com, ikigaiteck.io, unite.ai, fahimai.com
- Plus AI: plusai.com, deckary.com, macsources.com, saasworthy.com
- Presentations.AI: official pricing, presentations.ai/solutions/features, deckary.com, aipedias.com, dokie.ai
- Decktopus: deckary.com, smartbottips.com, lunoo.com, slidegmm.ai, trustpilot.com
- MagicSlides: magicslides.app (official pricing), Google Workspace Marketplace listing
- Sendsteps: slidepeak.com, 24slides.com, aichief.com, sendsteps.com (official)
- Pitch: makerstack.co, megaoneai.com, aitoolscoop.com, fahimai.com, agent-finder.co, contentcreators.com

---

**End of report.** Next step: prioritize recommendations in `docs/competitive-analysis-2026-06-07.md` companion, then implement #1–#3 from §3.1.

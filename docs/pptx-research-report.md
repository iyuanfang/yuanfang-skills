# PPTX Format, Slide Design, and AI Generation — Research Report

Research compiled 2026-06-07 for the yuanfang-html-ppt project. Covers PPTX spec
details relevant to AI generation, slide design principles, JSON schemas used by
real AI PPT tools, common AI pitfalls, and 2025-2026 trends.

## 1. PPTX Specification Details Relevant to AI Generation

### 1.1 Slide XML Structure (ISO/IEC 29500 PresentationML)

A `.pptx` file is a ZIP package containing XML parts. The minimum viable
package requires these parts:

| Part                  | Content Type                                            | Purpose                              |
| --------------------- | ------------------------------------------------------- | ------------------------------------ |
| `presentation.xml`    | `...presentationml.presentation.main+xml`               | Slide list, master refs              |
| `slideMaster*.xml`    | `...presentationml.slideMaster+xml`                     | Master templates                     |
| `slideLayout*.xml`    | `...presentationml.slideLayout+xml`                     | Layouts inheriting from master       |
| `slide*.xml`          | `...presentationml.slide+xml`                           | Individual slide content             |
| `theme*.xml`          | `...drawingml.theme+xml`                                | Color/font/format scheme             |
| `notesSlide*.xml`     | `...presentationml.notesSlide+xml`                      | Speaker notes (optional)             |
| `chart*.xml`          | `...drawingml.chart+xml`                                | Chart data/structure (optional)      |

A slide's root element `<p:sld>` has this child structure:

```xml
<p:sld>
  <p:cSld>...</p:cSld>            <!-- Common slide data (shapes, background) -->
  <p:clrMapOvr>...</p:clrMapOvr>  <!-- Color map override -->
  <p:transition>...</p:transition> <!-- Slide transition (optional) -->
  <p:timing>...</p:timing>        <!-- Animations (optional) -->
  <p:extLst>...</p:extLst>        <!-- Extensions (optional) -->
</p:sld>
```

### 1.2 Master Slides, Layouts, and Theme References

The inheritance chain flows: **Theme -> Slide Master -> Slide Layout -> Slide**.

- **Theme** (`theme1.xml`): Defines `clrScheme` (12 colors: dk1, lt1, dk2, lt2,
  accent1-6, hlink, folHlink), `fontScheme` (major/minor fonts), and `fmtScheme`
  (fill, line, effect styles).
- **Slide Master** (`slideMaster1.xml`): Contains the `<p:clrMap>` element that
  maps theme color slots to actual usage roles:

  ```xml
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2"
            accent1="accent1" accent2="accent2" accent3="accent3"
            accent4="accent4" accent5="accent5" accent6="accent6"
            hlink="hlink" folHlink="folHlink"/>
  ```

- **Slide Layout** (`slideLayout1.xml`): Inherits from master; defines
  placeholder arrangement. A slide references its layout via a relationship:

  ```xml
  <!-- In slideN.xml.rels -->
  <Relationship Id="rId1" Type="...relationships/slideLayout"
                Target="../slideLayouts/slideLayout1.xml"/>
  ```

- **Slide** (`slideN.xml`): Contains only overrides; inherits everything else
  from its layout.

**AI implication**: When generating slides, either (a) reference an existing
layout and override only text/shapes, or (b) use a "blank" layout and define
everything inline. Option (a) produces smaller files and better Office
compatibility.

### 1.3 Chart Embedding

PPTX has native chart support via the `chartSpace` part (DrawingML chart schema,
namespace `http://schemas.openxmlformats.org/drawingml/2006/chart`).

**Key fact**: For Word and PowerPoint documents, chart data is **not stored in
the chart XML itself**. It lives in an embedded SpreadsheetML (XLSX) package,
referenced by `<c:externalData r:id="..."/>`.

Structure:

```xml
<c:chartSpace>
  <c:chart>
    <c:title>...</c:title>
    <c:plotArea>
      <c:layout/>
      <c:barChart>           <!-- or pieChart, lineChart, areaChart -->
        <c:barDir val="col"/>
        <c:grouping val="clustered"/>
        <c:ser>
          <c:tx><c:v>Revenue</c:v></c:tx>
          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$4</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>Sheet1!$B$2:$B$4</c:f></c:numRef></c:val>
        </c:ser>
      </c:barChart>
    </c:plotArea>
    <c:legend>...</c:legend>
  </c:chart>
  <c:externalData r:id="rId1"/>
</c:chartSpace>
```

The slide references the chart via a graphic frame:

```xml
<p:graphicFrame>
  <p:nvGraphicFramePr>
    <p:cNvPr id="4" name="Chart 3"/>
    <p:cNvGraphicFramePr/>
    <p:nvPr/>
  </p:nvGraphicFramePr>
  <p:xfrm><a:off x="1524000" y="1524000"/><a:ext cx="6096000" cy="3429000"/></p:xfrm>
  <a:graphic>
    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
      <c:chart r:id="rId1"/>
    </a:graphicData>
  </a:graphic>
</p:graphicFrame>
```

**AI implication**: Libraries like PptxGenJS abstract this complexity. The chart
data array format is:

```js
slide.addChart(pptx.ChartType.bar, [
  { name: "Revenue", labels: ["Q1","Q2","Q3","Q4"], values: [12, 18, 24, 30] },
  { name: "Cost",    labels: ["Q1","Q2","Q3","Q4"], values: [8, 10, 12, 15] }
], { x:1, y:1, w:8, h:3, title: "Quarterly Performance" });
```

### 1.4 Speaker Notes Storage

Speaker notes are stored in a **separate notes slide part** (`notesSlideN.xml`),
not inline in the main slide. The slide links to it via a relationship:

```xml
<!-- In slideN.xml.rels -->
<Relationship Id="rId2" Type="...relationships/notesSlide"
              Target="../notesSlides/notesSlide1.xml"/>
```

The notes slide uses a different root element (`<p:notes>` instead of
`<p:sld>`) and contains three base placeholders: slide image, notes body, and
slide number.

The actual notes text goes inside the notes placeholder's `<p:txBody>`:

```xml
<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="3" name="Notes Placeholder 2"/>
    <p:nvSpPr><a:spLocks noGrp="1"/></p:nvSpPr>
    <p:nvPr><p:ph type="body" idx="1"/></p:nvPr>
  </p:nvSpPr>
  <p:spPr/>
  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:r><a:rPr lang="en-US"/><a:t>Talk about Q3 revenue growth here.</a:t></a:r>
    </a:p>
  </p:txBody>
</p:sp>
```

**AI implication**: Notes are a separate part. When generating, you must
create the relationship, the notes slide XML, and optionally a notesMaster if
it doesn't exist. Most libraries (python-pptx, PptxGenJS) handle this
automatically via `slide.addNotes(text)`.

### 1.5 Animations

Animations are stored in `<p:timing>` (loosely based on SMIL). The structure is
a time-node tree with `<p:cTn>` (common time node), `<p:par>` (parallel),
`<p:seq>` (sequence), and effect elements:

- `p:animate` - generic property animation
- `p:animSet` - set effects
- `p:animMotion` - path-based
- `p:animRot` - rotation
- `p:animScale` - scaling
- `p:animClr` - color

Example (fade-in on shape id=2):

```xml
<p:timing>
  <p:tnLst>
    <p:par>
      <p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"/>
      <p:childTnLst>
        <p:seq concurrent="1" nextAc="seek">
          <p:cTn id="2" dur="indefinite" nodeType="mainSeq"/>
          <p:childTnLst>
            <p:par>
              <p:cTn id="3" fill="hold" nodeType="clickEffect">
                <p:stCondLst><p:cond delay="indefinite"/></p:stCondLst>
              </p:cTn>
              <p:animate calcmode="lin" valueType="number">
                <p:cBhvr>
                  <p:cTn id="4" dur="500ms"/>
                  <p:tgtEl><p:spTgt spid="2"/></p:tgtEl>
                  <p:attrNameLst><p:attrName>style.opacity</p:attrName></p:attrNameLst>
                </p:cBhvr>
                <p:by>0</p:by>
                <p:to>100000</p:to>
              </p:animate>
            </p:par>
          </p:childTnLst>
        </p:seq>
      </p:childTnLst>
    </p:par>
  </p:tnLst>
</p:timing>
```

**AI implication**: Full animation authoring is complex; most AI tools use
simpler approaches. The extension namespaces `p14:`, `p15:`, `p16:` add newer
effects like morph (`p:transition` with `<p15:morph/>`).

### 1.6 Transitions

Transitions live directly in `<p:transition>` within the slide. Transition
types: `fade`, `push`, `wipe`, `split`, `reveal`, `cut`, `randomBar`, `shape`,
`newsflash`, `ferris`, `warp`, `glitter`, `vortex`, `ripple`, `prism`,
`switch`, `shred`, `comb`, `zoom`, `pan`.

```xml
<p:transition spd="slow" advClick="1" advTm="3000">
  <p:randomBar dir="horz"/>
</p:transition>
```

Attributes:
- `spd`: `slow` | `med` | `fast`
- `advClick`: advance on click (boolean)
- `advTm`: auto-advance after N milliseconds
- `p14:dur`: explicit duration (in extension namespace)

For cross-version compatibility, use `mc:AlternateContent` with
`mc:Choice Requires="p14"` and `mc:Fallback` blocks.

## 2. Slide Design Principles

### 2.1 The 6x6 Rule

A widely cited guideline: **no more than 6 bullet points per slide, no more
than 6 words per bullet**. The goal is cognitive load reduction - slides are
visual aids, not documents.

**Reality check**: The 6x6 rule is a heuristic, not a law. Modern design
(2024-2026) has moved toward even more restrictive formats: "one idea per
slide" is now the dominant advice. Microsoft's own guidance: minimum 24pt
body text, 32pt+ headings - there's physically no room for 6 lines of 6 words
at that size on a 16:9 slide.

### 2.2 Aspect Ratios (2025-2026)

| Ratio  | Dimensions (inches) | Pixel Size  | Best For                                |
| ------ | ------------------: | ----------: | --------------------------------------- |
| 16:9   | 13.333 x 7.5        | 1920x1080   | Default since PowerPoint 2013           |
| 16:10  | 10 x 6.25           | 1920x1200   | Some MacBooks and enterprise monitors   |
| 4:3    | 10 x 7.5            | 1024x768    | Legacy projectors, iPad, print handouts |
| 1:1    | 7.5 x 7.5           | 1080x1080   | LinkedIn/Instagram carousels            |
| 9:16   | 7.5 x 13.333        | 1080x1920   | Stories, Reels, vertical mobile         |

**Current default**: 16:9, 13.333" x 7.5" in PowerPoint (matches 1920x1080 / 4K).

**Decision framework**:
- Projectors/TVs/webinars -> 16:9
- iPad 1:1 sales presentations -> 4:3
- Social media carousels -> 1:1 or 4:5
- Printed handouts -> A4/Letter landscape

**Safe zone**: Keep critical content within the inner 90-95% of the slide
(5% margin all sides) - older projectors may crop edges.

### 2.3 Color Theory and Contrast

**WCAG 2.1/2.2 standards** (the legally recognized accessibility baseline):
- Normal text: **4.5:1** contrast ratio (AA), 7:1 (AAA)
- Large text (18pt+ or 14pt bold): **3:1** (AA), 4.5:1 (AAA)
- Non-text/UI elements: **3:1** (SC 1.4.11)
- Charts, graph bars, legend swatches: **3:1**

**The 60-30-10 rule** for presentation palettes:
- 60% dominant (background)
- 30% secondary (structure, headings)
- 10% accent (emphasis, CTAs, key data)

**Professional palettes should have exactly 3-5 colors with defined roles**:
1. Background neutral (light or dark)
2. Text color (high contrast vs background)
3. Primary accent (brand)
4. Optional: secondary accent
5. Optional: alert/positive/negative (green/red, desaturated)

**Dark vs. Light backgrounds**:

| Factor              | Light (white/cream)        | Dark (navy/charcoal)           |
| ------------------- | -------------------------- | ------------------------------ |
| Bright rooms        | Better                     | Washes out                     |
| Dark rooms          | Eye strain                 | More comfortable                |
| Projector quality   | More forgiving             | Requires calibration           |
| Data density        | More readable              | Needs stricter contrast        |
| Screenshot/print    | Better                     | Inverted colors                |
| "Cinematic" feel    | More documentary           | More premium                    |

**Default to light** unless you control the room. Use dark deliberately for
pitches, keynotes, and visual-forward content.

**Concrete accessible palette** (from Extended Frames token analysis):

| Token           | Role            | Hex     | Use                                    |
| --------------- | --------------- | ------- | -------------------------------------- |
| `bg.default`    | Light background| #FFFFFF | Default background                     |
| `bg.inverse`    | Dark background | #111111 | Section dividers, dark mode            |
| `text.default`  | Body text       | #1A1A1A | Body copy (AA on both backgrounds)     |
| `text.inverse`  | Text on dark    | #FFFFFF | Body on dark bg                        |
| `accent.1`      | Primary         | #1D5BFF | Brand accent, headings                 |
| `accent.2`      | Secondary       | #1FA39B | Charts, secondary                      |
| `alert`         | Warning         | #D64545 | Errors, negative                       |
| `link.default`  | Hyperlink       | #1D5BFF | Underlined links                       |

**Common mistakes**:
- Light gray text on white (fails 4.5:1)
- Yellow text on white (fails badly, <2:1)
- Blue text on navy background (passes technically but strains eyes)
- Medium gray (#9ca3af) on white (~2.8:1 - fails)

### 2.4 Information Density

**Per-slide structure** (a 16:9 slide, 13.333" x 7.5"):

```
+---------------------------------------------+
| Title (36-48pt bold)                        |  ~10% height
+---------------------------------------------+
|                                             |
|  Body content area                          |  ~75% height
|  - 1 chart, OR                              |
|  - 1 image, OR                              |
|  - 3-4 bullet points, OR                    |
|  - 2-column comparison, OR                  |
|  - Large quote/statistic                    |
|                                             |
+---------------------------------------------+
| Footer / page number / logo (8-12pt)        |  ~10% height
+---------------------------------------------+
```

**Typography** (WCAG-aligned recommendations):
- H1/Title: 36-48pt (~42pt common for investor/board decks)
- H2/Section: 28-34pt
- Body: 20-28pt (minimum 18pt for projection)
- Captions/labels: 12-16pt (use sparingly, requires ~7:1 contrast)
- Line height: 1.4-1.6x for body, 1.1-1.3x for headings
- Line length: 45-65 characters per line

**Spacing tokens** (8/16/24/32 px rhythm):
- 8 px: within-cluster gaps
- 16 px: between bullets
- 24 px: between content blocks
- 32 px: section-level separation
- Reserve 20-35% negative space per slide

**Grid**: 12-column is the practical default. 6/6 split for two-column
comparison, 8/4 for sidebar layouts.

## 3. JSON Content Schemas from Real AI Tools

### 3.1 Gamma API (Public REST API)

The Gamma API is the most fully-documented example. Endpoints:
`POST /v1.0/generations` (from text) and
`POST /v1.0/generations/from-template` (from template).

**Generation request schema** (simplified from their OpenAPI spec):

```json
{
  "inputText": "Q3 product launch strategy",
  "title": "Q3 Board Update",
  "textMode": "generate",
  "format": "presentation",
  "numCards": 10,
  "cardSplit": "inputTextBreaks",
  "themeId": "th_abc123",
  "exportAs": "pptx",
  "textOptions": {
    "amount": "medium",
    "tone": "professional",
    "audience": "executives",
    "language": "en"
  },
  "imageOptions": {
    "source": "aiGenerated",
    "model": "imagen-4-pro",
    "style": "minimalist corporate photography, soft lighting"
  },
  "cardOptions": {
    "dimensions": "16x9",
    "headerFooter": {
      "topLeft": { "type": "image", "source": "themeLogo", "size": "sm" },
      "bottomRight": { "type": "cardNumber" },
      "hideFromFirstCard": true,
      "hideFromLastCard": true
    }
  },
  "sharingOptions": {
    "workspaceAccess": "edit",
    "externalAccess": "view"
  },
  "folderIds": ["fld_xyz"]
}
```

**Key fields**:
- `textMode`: `generate` (expand prompt) | `condense` (summarize) |
  `preserve` (keep as-is)
- `format`: `presentation` | `document` | `social` | `webpage`
- `imageOptions.source`: `aiGenerated` | `webFreeToUseCommercially` |
  `pictographic` | `giphy` | `pexels` | `placeholder` | `noImages` |
  `themeAccent`
- `cardOptions.dimensions`: `16x9` | `4x3` | `fluid` | `letter` | `a4` |
  `pageless` | `1x1` | `4x5` | `9x16`
- `textOptions.amount`: `brief` | `medium` | `detailed` | `extensive`

**Async response flow**:
```json
{ "generationId": "abc123xyz" }
```
-> Poll `GET /v1.0/generations/{id}` ->
```json
{
  "generationId": "abc123xyz",
  "status": "completed",
  "gammaId": "g_l0mf2jvf1fpmi1v",
  "gammaUrl": "https://gamma.app/docs/abc123",
  "exportUrl": "https://gamma.app/export/abc123.pdf",
  "credits": { "deducted": 15, "remaining": 485 }
}
```

### 3.2 Beautiful.ai API

Minimal, prompt-based:

```json
{
  "prompt": "A pitch deck for a seed-stage B2B SaaS startup selling HR software.",
  "themeId": "minimal"
}
```

**Response**:
```json
{
  "presentationId": "pres_abc123",
  "editorUrl": "https://beautiful.ai/editor/pres_abc123",
  "playerUrl": "https://beautiful.ai/view/pres_abc123"
}
```

Beautiful.ai deliberately returns a URL rather than raw slide content. Their
model: AI handles layout/spacing/animations, user reviews the editable deck.

### 3.3 Presenton (Open Source) - JSON-to-Deck

Most schema-rich open-source example. Uses a **layout + content pattern**
where each layout has its own JSON Schema:

```json
{
  "title": "Your Presentation Title",
  "template": "custom-20f600db-e55d-4f14-b373-5c43c1668170",
  "theme": "professional-dark",
  "export_as": "pdf",
  "slides": [
    {
      "layout": "custom-20f600db-e55d-4f14-b373-5c43c1668170:header-subtitle-decorative-illustration-slide",
      "content": {
        "title": "Introduction to Taco Bell",
        "subtitle": "Taco bell was a small shop opened by a small town guy..."
      }
    }
  ]
}
```

**Per-layout JSON Schema** (fetched from template definition):

```json
{
  "json_schema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "title": {
        "description": "Centered header text. Max 5 words",
        "type": "string",
        "minLength": 12,
        "maxLength": 32
      },
      "subtitle": {
        "description": "Centered subtitle text under the header. Max 16 words",
        "type": "string",
        "minLength": 40,
        "maxLength": 95
      }
    },
    "required": ["title", "subtitle"],
    "additionalProperties": false
  }
}
```

**Two-step workflow** (presenton also supports an outlines-first pattern):

1. `POST /api/v3/presentation/outlines/generate`:
   ```json
   {
     "content": "Quarterly product update for customers",
     "n_slides": 6,
     "language": "English",
     "tone": "professional",
     "verbosity": "standard"
   }
   ```
   Returns an array of Markdown-formatted outline strings (one per slide).

2. `POST /api/v3/presentation/generate`:
   ```json
   {
     "slides": [
       {
         "content": "## Quarterly Product Update\n\n- Q4 highlights...",
         "layout": null
       }
     ],
     "standard_template": "general",
     "export_as": "pdf"
   }
   ```

The `content` field uses Markdown (`##` for H2, `-` for bullets) which the
system maps to layout placeholders. `layout: null` lets the AI pick
automatically.

### 3.4 PptxGenJS Chart Data Format

While PptxGenJS is a library (not an API), its chart data shape is widely
emulated:

```js
slide.addChart(
  pptx.ChartType.bar,
  [
    {
      name: "Revenue",
      labels: ["Q1", "Q2", "Q3", "Q4"],
      values: [12, 18, 24, 30]
    },
    {
      name: "Cost",
      labels: ["Q1", "Q2", "Q3", "Q4"],
      values: [8, 10, 12, 15]
    }
  ],
  {
    x: 1, y: 1, w: 8, h: 3,
    title: "Quarterly Performance",
    showLegend: true,
    legendPos: "r",
    catAxisLabelFontSize: 12,
    valAxisLabelFontSize: 12,
    chartColors: ["1D5BFF", "1FA39B"]
  }
);
```

### 3.5 Common Patterns Across AI PPT Tools

| Tool          | Content Model                    | Layout Selection       | Chart Support          | Image Source          | Notes                  |
| ------------- | -------------------------------- | ---------------------- | ---------------------- | --------------------- | ---------------------- |
| Gamma         | `inputText` + `additionalInstructions` | AI auto + theme-bound | AI picks type          | 50+ image models      | Strongest API          |
| Beautiful.ai  | `prompt` (natural language)      | AI + 300+ smart slides  | Native                 | AI-generated          | No raw structure       |
| Presenton     | Per-layout JSON Schema           | Explicit layout ID     | Yes                    | Configurable          | Most schema-rich       |
| PptxGenJS     | Imperative API                   | Manual                 | Full (bar/line/pie/...) | Manual                | Developer-focused      |
| Slidebean     | Prompt                           | AI enforces pitch patterns | Yes                 | Curated               | Startup-focused        |
| Pitch         | Prompt + template                | Hybrid                 | Yes                    | Stock + AI            | Analytics-heavy        |
| Canva         | Prompt                           | Template-based         | Yes                    | 100M+ stock           | Cinematic effects      |
| Decktopus     | Prompt or CSV                    | AI + interactive       | Yes                    | AI + stock            | Forms/Q&A embedded     |
| PageOn.AI     | Prompt + modular blocks          | Block-based            | Interactive Plotly     | AI + stock            | Multi-modal            |

## 4. Common Pitfalls in AI-Generated PPTs

### 4.1 Text Overflow / Layout Clipping

The most-reported silent bug. The issue: AI generates slides that look fine
in the editor but overflow on:
- Different font rendering (Windows vs Mac vs web)
- Different aspect ratios (preview vs projector)
- PPTX export (line wrapping changes)
- Embedded code blocks, tables, or images that expand dynamically

**Detection heuristic** (from BinaryPH): render slides headless, measure
bounding boxes, flag content extending beyond container boundaries. Integrate
into CI to catch before export.

**Specific case (Spacing/Alignment analysis)**: A bar chart crammed
edge-to-edge, 18pt title, body labels at 12pt in low-contrast gray, legend
hugging the plot, footnote touching bottom edge. Fixes:
- Increase outer margins to 8-10%
- Title 36pt, line height ~1.2
- Chart area padding 24-32 px
- Data labels 14-16pt with 7:1 contrast
- Footnote constrained to safe zone

### 4.2 Layout Auto-Selection Mistakes

AI often picks the wrong layout because:
- **Text overload**: AI defaults to thoroughness; 5+ bullets on a
  "title + content" slide
- **Wrong density match**: A 200-word section forced into a 3-bullet layout
- **Repeating layouts**: Every slide becomes a "title + bullet list" even
  when comparison/chart layouts are appropriate

**Fix**: Constrain slide count in the prompt ("build an 8-slide deck"). Use
the "one idea per slide" rule. After generation, review in thumbnail view
and cut slides that don't earn their place.

### 4.3 Contrast Issues

| Mistake                                      | Contrast       | Fix                          |
| -------------------------------------------- | -------------: | ---------------------------- |
| Light gray (#9ca3af) on white                | ~2.8:1 (FAIL)  | Use #4b5563 or darker        |
| Yellow text on white                         | ~1.5:1 (FAIL)  | Use as accent on dark bg only|
| Dark blue text on navy                       | passes technically, but strains | Increase luminance gap |
| White on light gradient                      | varies, often fails | Use solid bg or overlay |
| Small text below 18pt with medium contrast   | 4.5:1 required | Enlarge to 18pt+             |

**Rule**: Design for 7:1 contrast on text and data values, not the 4.5:1 WCAG
minimum. Projection variability can reduce effective contrast by 30-40%.

### 4.4 Image Sizing

AI tools frequently produce:
- Images stretched to wrong aspect ratio (distortion)
- Hero images that dominate and push text off-slide
- Low-resolution images that pixelate on big screens
- Stock photos that don't match content (the "AI stock photo cliche")

**Fix**: Always use corner handles (proportional resize). For AI-generated
images, specify aspect ratio explicitly. For stock photos, use image search
filters that match content (e.g., "no people, abstract, blue gradient" for
tech backgrounds).

### 4.5 Brand/Color Scheme Issues That Look Amateur

**Common amateur patterns**:
- Default PowerPoint blue (#4472C4) everywhere
- Gradients with no purpose
- More than 5-6 distinct colors
- Saturated brand colors used for body text (legibility fails)
- Mismatched icon styles (flat + skeuomorphic mixed)
- Drop shadows on everything

**Professional approach**:
- Lock the master slide with brand colors/fonts
- Use the 60-30-10 rule strictly
- Map brand colors to Office theme slots (Accent 1-6, Text 1-2, Background 1-2)
- Test in grayscale to verify hierarchy works without color
- Save as a reusable `.thmx` theme file

### 4.6 Other Common AI Mistakes

From SlidesAI's audit of common failures:
- **Generic content** that doesn't reflect your specific context
- **Inconsistent layouts** (slide 3 has a different visual style than slide 5)
- **Overuse of AI-suggested visuals and animations** (random stock photos,
  distracting transitions)
- **Ignoring accessibility** (small text, poor contrast, no alt text)
- **Off-brand** (default fonts, colors, layouts not aligned to brand)
- **Vague prompts** -> vague output ("make a presentation about AI")
- **Skipped verification** (AI hallucinations in statistics/citations)
- **Too many slides** (20-slide deck when 8 would suffice)
- **Choppy flow** (slides that don't logically connect)

### 4.7 Accessibility Gaps (WCAG Alignment Checklist)

| Requirement                              | WCAG SC  | Threshold              |
| ---------------------------------------- | -------- | ---------------------- |
| Text contrast (normal)                   | 1.4.3    | >=4.5:1 (AA)           |
| Text contrast (large 18pt+ or 14pt bold) | 1.4.3    | >=3:1 (AA)             |
| Non-text contrast (UI, chart elements)   | 1.4.11   | >=3:1                  |
| Don't rely on color alone                | 1.4.1    | Use shape/label/position |
| Alt text for images/charts               | 1.1.1    | Required               |
| Reading order (logical)                  | 1.3.2    | Match visual order     |
| No flashing >3x/sec                      | 2.3.1    | Required               |
| Min font size                            | -        | 18pt body, 24pt+ ideal |
| Captions for media                       | 1.2.2    | Required               |
| Use built-in layouts                     | -        | Better reading order   |

## 5. 2025-2026 Trends

### 5.1 AI's Role in Design (Not Just Content)

The shift from 2024 to 2026: AI moved from "generate the text" to "design the
whole slide."

- **Moda** (2026): "Generative AI agent that operates the design tool on your
  behalf." WebGPU-powered vector canvas, Figma-level editing depth. Brand
  agent goes beyond logo/color uploads to understand tone, visual style,
  typography, and apply consistently.
- **Beautiful.ai Smart Slides**: 300+ layouts that auto-adapt as you
  add/remove content. Add a 4th bullet, layout adjusts. Swap image, text
  reflows.
- **Alai**: Generates 4 distinct layout variants per slide, giving real
  creative options rather than forcing a single AI decision.
- **Design polisher workflow** (10-15 min): AI generates -> human fixes
  contrast, spacing, reading order, alt text, brand compliance.

### 5.2 Real-Time Editing and AI Refinement

- **Clip-E conversational editing** (Presentations.ai): "Rewrite slide 5 in
  a more executive tone" or "restructure without touching other slides."
- **Claude Artifacts**: Generates fully interactive HTML-based slideshows with
  CSS, JavaScript navigation, embedded Chart.js or D3.js visualizations.
  Self-contained, runs in any browser. Strongest for data-rich technical
  presentations.
- **Smart slide-level engagement analytics**: Beautiful.ai and Pitch track
  where viewers drop off in a deck (per-slide view time, heatmaps).

### 5.3 Multi-Modal / Interactive Slides

The category is expanding beyond static slides:

- **PageOn.AI**: "Beyond static presentations." Live Plotly charts
  (interactive, not screenshots), embedded YouTube/audio, animated SVG
  graphics, geographic maps with real data.
- **Decktopus**: Embeds forms, Q&A sessions, response collection directly in
  the presentation. Webhook integrations for collecting response data.
- **Tome** (pivoted but instructive): "Fluid, web-like interface with
  drag-and-drop" instead of traditional slides. AI-generated narratives from
  a single prompt.
- **MCP servers for AI agents**: PptxGenJS MCP server (Model Context
  Protocol) lets any LLM create/modify/export `.pptx` files programmatically
  through tool calls.

### 5.4 Brand Kit Support (Now Table Stakes)

Every serious 2025-2026 AI PPT tool has brand kit features:

- **Upload logo/colors/fonts** -> automatically applied across all slides
- **Lock templates** for recurring use cases
- **Multiple brand kits** for sub-brands
- **Style enforcement** - once set, colors/fonts can't drift
- **Brand Sync** (Presentations.ai) - one-click brand application
- **Map to Office theme slots** - Accent 1-6, Text 1-2, Background 1-2
- **Export as `.thmx`** - PowerPoint theme file for reusability

### 5.5 Template Marketplace

- **Canva**: 250,000+ presentation templates
- **Prezent**: 35,000+ templates and slides, "expert-crafted storylines"
- **Slidesgo**: Free template library with AI generation
- **Gamma**: Template gallery + `from-template` API for programmatic adaptation
- **PptxGenJS-MCP**: Open source templates for coding agents

The pattern: design once as a template, then programmatically adapt via prompt
(swap content, change audience, restructure cards, lock specific cards).

### 5.6 Market Data (2025-2026)

- AI presentation tools market: **$2B in 2025**, projected **$10B by 2033**
- Beautiful.ai customers report being **up to 80% more efficient** vs
  PowerPoint
- A 12-slide deck in 15 minutes is the benchmark separating "lightweight
  copy-pasters" from "platforms that truly structure content"
- ~90% of desktop screens now use widescreen resolutions (16:9 is the safe
  default)

### 5.7 Key Trend: Convergence of Categories

The line between "presentation tool" and "AI platform" is blurring:
- Claude/ChatGPT can now generate presentation-quality HTML artifacts
- MCP servers turn any LLM into a deck generator
- Tools like Presenton open-source the entire stack
- Designer review (5-10 min) + AI generation (1 min) is the new workflow

### 5.8 What "Good" Looks Like in 2026

The winning formula (from designer reviews):
1. **Prompt + outline** (human shapes the story)
2. **Visual preferences** (theme, brand kit, image style)
3. **AI generates structured deck** (not just text)
4. **Conversational refinement** ("make slide 5 more visual")
5. **Automated accessibility check** (contrast, reading order, alt text)
6. **One human review pass** (data verification, brand polish)
7. **Multi-format export** (PPTX, PDF, link, embed)

Tools that skip steps 4-6 produce "AI-looking" decks. Tools that enforce all 7
produce work that doesn't look AI-generated at all.

## Appendix: Key Sources

### PPTX Spec
- Microsoft Learn: [Structure of a PresentationML document](https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document)
- Microsoft Learn: [Working with animation](https://learn.microsoft.com/en-us/office/open-xml/presentation/working-with-animation)
- Microsoft Learn: [Add Transitions between slides](https://learn.microsoft.com/en-us/office/open-xml/presentation/how-to-add-transitions-between-slides-in-a-presentation)
- ooxml.info: [Slide Part 13.3.8](https://ooxml.info/docs/13/13.3/13.3.8/), [Chart Part 14.2.1](https://ooxml.info/docs/14/14.2/14.2.1/), [Animation 19.5](https://ooxml.info/docs/19/19.5/)
- python-pptx docs: [Notes Slide](https://python-pptx.readthedocs.io/en/latest/dev/analysis/sld-notes-slide.html), [Chart - Embedded Worksheet](https://python-pptx.readthedocs.io/en/latest/dev/analysis/cht-access-xlsx.html)
- python-pptx: [Slide masters and layouts](https://scanny-python-pptx.mintlify.app/advanced/slide-masters)

### Accessibility Standards
- W3C: [WCAG 2.2 Understanding Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum)
- UC Merced: [Presentation Accessibility Checklist](https://accessibility.ucmerced.edu/digital-accessibility/creating-content-checklists/presentation-accessibility-checklist)
- Aims Community College: [In-Person Presentations](https://www.aims.edu/accessibility-learning-hub/accessibility-how-tos/presentations/person-presentations)
- Microsoft: [Make PowerPoint presentations accessible](https://support.microsoft.com/en-us/accessibility/powerpoint/make-your-powerpoint-presentations-accessible-to-people-with-disabilities)
- a1slides: [Accessible PowerPoint: WCAG Guide](https://a1slides.com/accessible-powerpoint-presentations-wcag-guide/)

### AI Tool APIs and Schemas
- Gamma: [POST /generations](https://developers.gamma.app/generations/create-generation.md), [Generate from text](https://developers.gamma.app/guides/generate-api-parameters-explained), [MCP tools](https://developers.gamma.app/mcp/mcp-tools-reference.md), [Generate from template](https://developers.gamma.app/guides/create-from-template-api-parameters-explained.md)
- Presenton: [Create from JSON](https://docs.presenton.ai/guide/create-presentation-from-json), [Generate Outlines](https://docs.presenton.ai/v3/guide/generate-outlines-for-presentation)
- Beautiful.ai: [API](https://support.beautiful.ai/hc/en-us/articles/43654071102605-Beautiful-ai-API), [Create with AI](https://support.beautiful.ai/hc/en-us/articles/12885226948109-Creating-a-presentation-with-AI), [Create presentation from outline](https://docs.beautiful.ai/reference/createpresentation-1)
- PptxGenJS: [Introduction](https://gitbrent.github.io/PptxGenJS/docs/introduction/), [gen-objects.ts](https://github.com/gitbrent/PptxGenJS/blob/master/src/gen-objects.ts), [pptxgenjs-jsx](https://github.com/artifact-kit/pptxgenjs-jsx/blob/main/README.md)
- PptxGenJS MCP: [Server repo](https://github.com/Hrithik-s-Raj/PptxGenJS-mcp-server)

### Design Principles
- PitchWorx: [PowerPoint Slide Size Explained](https://pitchworx.com/powerpoint-slide-size-explained-169-vs-43-vs-11/)
- Skywork AI: [Google Slides Aspect Ratio Guide](https://skywork.ai/blog/slide/google-slides-aspect-ratio-ultimate-guide/)
- Extended Frames: [Accessible Color Palettes](https://extendedframes.com/accessible-color-palettes-for-slides-tokens-contrast-themes/)
- SlidesMate: [Color Theory for Presentations](https://slidesmate.com/blog/color-theory-for-presentations)
- PresentationGO: [Best Colors for Presentations](https://www.presentationgo.com/article/best-colors-for-presentations/)
- SlidesCorner: [Color Contrast and Accessibility](https://slidescorner.com/color-contrast-and-accessibility-in-slide-design-2026-complete-guide/)
- ColorArchive: [Color Palette for Presentations](https://colorarchive.org/guides/color-palette-for-presentations/)

### AI Pitfalls
- SlidesAI: [Common Mistakes Using AI Presentation Makers](https://www.slidesai.io/blog/common-ai-presentation-mistakes)
- HiData: [AI PowerPoint Mistakes](https://hidata.ai/blog/ai-powerpoint-mistakes-prevention/), [AI Slide Design: Spacing, Alignment & Typography](https://hidata.ai/blog/ai-slide-design-spacing-alignment-typography/)
- BinaryPH: [The Silent Layout Bug in AI-Generated Slides](https://binary.ph/2026/01/19/the-silent-layout-bug-in-ai-generated-slides-detecting-overflow-and-visual-clipping/)
- Smallppt: [7 Most Common AI Slide Mistakes](https://smallppt.com/blog/basics/common-ai-slide-mistakes-tips)
- Presentations.ai: [7 Common AI Presentation Mistakes](https://www.presentations.ai/blog/7-common-ai-presentation-mistakes-and-how-to-fix-them)

### 2025-2026 Trends
- Ebaq Design: [Best AI Presentation Maker in 2026](https://www.ebaqdesign.com/blog/best-ai-presentation-maker-2026)
- Venngage: [Best AI Presentation Makers in 2026](https://venngage.com/blog/ai-presentation-makers/)
- Gamma: [2026 Guide to Choosing the Most Effective AI Presentation Tool](https://gamma.app/explore/content/guides/guide-to-choosing-the-best-ai-presentation-tool)
- Prezent: [AI Presentation Maker](https://www.prezent.ai/create/generate)
- Beautiful.ai vs Slidebean: [Comparison](https://www.beautiful.ai/comparison/beautiful-ai-vs-slidebean)
- Beautiful.ai vs Tome: [Comparison](https://designerbot.com/comparison/beautiful-ai-vs-tome)
- PageOn.AI: [Interactive AI Slides](https://www.pageon.ai/)

# dom-to-pptx Fidelity Research & Fixes

**Branch:** `research/html-ppt-competitive`
**Date:** 2026-06-07

## Findings — dom-to-pptx 1.1.10 quirks discovered

### 1. `<ul>` wrapping cards collapses to one shape (CRITICAL)

**Symptom:** Content layout with `<ul class="grid g1"><li class="card">...</li></ul>` produced 1 single shape in PPTX instead of N cards. Card backgrounds, borders, and per-item positioning all lost.

**Root cause:** dom-to-pptx treats the `<ul>` element as a single container; all child `<li>` items get merged into one text run.

**Fix:** Use `<div>` instead of `<ul>/<li>`. Same `class="card"` and structure, but each card becomes a distinct PPTX shape.

**Before vs After:**
- Before: 1 shape for 3 cards
- After: 13 shapes (1 background + 1 kicker + 1 h2 + 1 lede + 3 cards + 3 numbers + 3 text)

### 2. `border` + `border-top` combo drops the border (CRITICAL)

**Symptom:** Card with `border: 1px solid var(--border); border-top: 4px solid var(--accent);` produced a PPTX shape with `border=False` (no `<a:ln>` element).

**Root cause:** dom-to-pptx sees conflicting border declarations and outputs an empty `<a:ln/>` element. Single declaration works:
- ✅ `border: 1px solid #000` (all sides)
- ❌ `border: 1px solid; border-top: 4px solid` (mixed)
- ❌ `border-top: 4px solid` alone

**Fix:** Use only `border: 1px solid var(--border)` (no border-top) and add a separate `<div class="card-line">` element as an absolute-positioned 4px tall accent line at the top of the card. The card-line becomes its own PPTX shape.

### 3. Cards get their own PPTX shape with class-based CSS

**Verified:** `.card { background, border, border-radius }` with `<div class="card">` produces a `roundRect` shape with solid fill and `<a:ln>` border.

### 4. `<div>` for inline content (number + text) gets separate shapes

**Verified:** Inside a card, `<div class="row"><div>01</div><div>text</div></div>` produces:
- Row container: ignored
- Number "01": its own rect shape with color
- Text: its own rect shape with color

### 5. Pills, kicker, h2 all get their own shapes

**Verified:** Class-based styling works for:
- `.kicker`, `.h2`, `.lede` (text with color)
- `.pill`, `.pill-accent` (background pill)
- `.divider-accent` (colored thin bar)
- `.card` (rounded rect with white background)
- `.grid g1/g2/g3/g4` (layout via flex — invisible to dom-to-pptx but gives correct positions)

## PPTX Verification Script (used during research)

```js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.resolve('path/to.html'), { waitUntil: 'networkidle' });
  await page.addScriptTag({ path: 'node_modules/dom-to-pptx/dist/dom-to-pptx.bundle.js' });
  const uint8 = await page.evaluate(async () => {
    const slides = Array.from(document.querySelectorAll('.slide'));
    const blob = await domToPptx.exportToPptx(slides, {
      returnBuffer: true, width: 10, height: 5.625
    });
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  fs.writeFileSync('out.pptx', Buffer.from(uint8));
  await browser.close();
})();
```

## Inspection Script (PPTX shape analysis)

```python
import zipfile, re
z = zipfile.ZipFile('file.pptx')
content = z.read('ppt/slides/slide1.xml').decode('utf-8')
shapes = re.findall(r'<p:sp>(.*?)</p:sp>', content, re.DOTALL)
for s in shapes:
    off = re.search(r'<a:off x="(\d+)" y="(\d+)"/><a:ext cx="(\d+)" cy="(\d+)"/>', s)
    fill = re.search(r'<a:solidFill><a:srgbClr val="([^"]+)"/>', s)
    border = re.search(r'<a:ln[^>]*>(.*?)</a:ln>', s, re.DOTALL)
    text = re.findall(r'<a:t>([^<]+)</a:t>', s)
    # print positions, sizes, fills, borders, text
```

## Current Visual Fidelity Status

| Element | HTML | PPTX (before) | PPTX (after fix) |
|---|---|---|---|
| Slide background | ✅ | ✅ | ✅ |
| Kicker (text + color) | ✅ | ✅ | ✅ |
| H2 title | ✅ | ✅ | ✅ |
| Lede paragraph | ✅ | ✅ | ✅ |
| **Card background** | ✅ white | ❌ lost | ✅ white roundRect |
| **Card border** | ✅ subtle | ❌ lost | ✅ black/gray `<a:ln>` |
| **Accent top line** | ✅ blue 4px | ❌ lost | ✅ blue rect shape |
| **Number "01"** | ✅ blue | ❌ lost | ✅ blue rect |
| **Body text** | ✅ dark | ✅ (wrong layout) | ✅ dark rect, full width |
| Pill (cover slide) | ✅ | ✅ | ✅ |
| KPI grid (data layout) | ✅ | ✅ | ✅ |
| Section divider | ✅ | ✅ | ✅ |
| Thanks / closing | ✅ | ✅ | ✅ |

## Files Modified

- `yuanfang-html-ppt/scripts/render-html-pptx.js` — contentLayout + twoColumnLayout + baseStyles
- `yuanfang-html-ppt/tests/visual-baselines/*.pptx` — 22 regenerated files (11 themes × 2 content sets)

## Open Issues

- `box-shadow` on cards: not yet verified to translate (may still be lost)
- `text-shadow`: not used in any of our layouts
- `linear-gradient` on backgrounds: should work (in whitelist) but not currently used in our layouts
- `border-radius`: works (cards become roundRect)

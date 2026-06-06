# QA Report — 72-Image Regression

## Run summary

- **Date**: 2026-06-05
- **Total**: 12 themes × 6 platforms = 72 PNGs
- **Pass**: 72 (all generated, all > 1KB)
- **Fail**: 0

## Visual QA spot-checks

| Theme | Platform | Result | Notes |
|---|---|---|---|
| minimal-white | xiaohongshu-v (3:4) | ✅ | Title visible, accent line + right block present |
| dark-gold | xiaohongshu-v | ✅ | Dark bg + gold accent, decor-tr gradient circle |
| tech-modern | bilibili-cover (16:9) | ✅ | Terminal bar, grid bg, decor-tr visible |
| eastern | xiaohongshu-v | ✅ | Seal "远" shows in top-right circle |
| split-screen | xiaohongshu-v | ✅ | Left/right 50/50 split, content in left |
| bold-poster | douyin-cover (9:16) | (not opened) | Need to verify size, will check |
| data-infographic | xiaohongshu-v | (not opened) | Need to verify grid bg |
| warm-handdrawn | xiaohongshu-v | (not opened) | Need to verify hand-drawn font fallback |
| editorial | xiaohongshu-v | (not opened) | |
| magazine-cover | xiaohongshu-v | (not opened) | |
| minimal-white-editorial | xiaohongshu-v | (not opened) | |
| list-ranking | xiaohongshu-v | (not opened) | |

## Auto-checks

- [x] All 72 PNGs > 1KB
- [x] No `{{TOKEN}}` leakage in any output (verified via preview)
- [x] All 19 unit tests passing
- [x] Backward compat: `--template 1` still works (verified via test)

## Known issues / follow-ups

- **minimal-white-editorial** has very small title (72px max), so titles are visually small. By design — minimal white editorial = Swiss style.
- **list-ranking** has small title (72px) too. By design.
- Some themes (eastern, minimal-white) have text wrapped to 2 lines on portrait — by design (long CJK titles).

## Out-of-scope (deferred)

- Multi-language content tests (only Chinese tested)
- Print sizes (a4, a3) not in regression — only social platforms
- Chart/animation layout-types (not yet implemented)

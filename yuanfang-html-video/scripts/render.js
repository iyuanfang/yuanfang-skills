#!/usr/bin/env node
// yuanfang-html-video/render.js (2026) — Hyperframes-style video pipeline.
//
// Architecture:
//   reuse assembleHTML from yuanfang-html-image (CSS layout + ANIMATION_PRESETS)
//   → inject WAAPI pause + __hf seek protocol
//   → single Playwright browser, one page load
//   → frame loop: seek → screenshot JPEG → pipe to ffmpeg stdin
//   → streaming encode (no temp frame files)
//
// Compared to v1 (per-frame npx playwright + PNG + sharp convert):
//   ~50× faster, no disk I/O for frames, streaming encode.
//
// Dependencies (already in package.json):
//   playwright, sharp (via html-image reuse)
//   ffmpeg: soft dep (ffmpeg-static or system PATH)
//
// Usage:
//   node scripts/render.js --file content.json --platform douyin --duration 15
//   node scripts/render.js --file content.json --platform bilibili --duration 30 --fps 30 --bgm /path/to/music.mp3

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

// ── Reuse from yuanfang-html-image ───────────────────────────────────────────

const IMAGE_RENDER = path.join(__dirname, '..', '..', 'yuanfang-html-image', 'scripts', 'render.js');
const {
  assembleHTML, loadTheme, loadLayout, loadBaseCSS,
  loadParamsCSS, parseArgs, resolveTemplate, resolvePlatforms,
  findBrandSpec, mergeBrandSpec, buildBrandOverrideCss,
} = require(IMAGE_RENDER);
const { preflight } = require('../../scripts/preflight');

// ── Platform specs (video) ───────────────────────────────────────────────────

const PLATFORMS = {
  'douyin':        { width: 1080, height: 1920, ratio: '9:16',  label: '抖音' },
  'shipinhao':     { width: 1080, height: 1920, ratio: '9:16',  label: '视频号' },
  'wechat-video':  { width: 1080, height: 1920, ratio: '9:16',  label: '视频号 (alias)' },
  'moments-video': { width: 1080, height: 1080, ratio: '1:1',   label: '朋友圈视频' },
  'xhs-video':     { width: 1080, height: 1440, ratio: '3:4',   label: '小红书视频' },
  'bilibili':      { width: 1920, height: 1080, ratio: '16:9',  label: 'B站' },
  'youtube':       { width: 1920, height: 1080, ratio: '16:9',  label: 'YouTube' },
};

const VIDEO_PLATFORM_KEYS = new Set(Object.keys(PLATFORMS));

// ── ffmpeg detection ─────────────────────────────────────────────────────────

const FFMPEG = (() => {
  try { return require('ffmpeg-static'); } catch { return null; }
})();

function detectFfmpeg() {
  if (FFMPEG && fs.existsSync(FFMPEG)) return FFMPEG;
  try {
    require('child_process').execSync('ffmpeg -version', { stdio: 'ignore' });
    return 'ffmpeg';
  } catch {
    return null;
  }
}

// ── HTML building ────────────────────────────────────────────────────────────

// Calculate the max end time (delay + duration) across all CSS-animated
// elements in the assembled HTML. This determines how far into the animation
// time-line the video's progress-1 (end) maps to.
//
// Simple approach: hardcode a generous ceiling that covers all ANIMATION_PRESETS
// including text-reveal (max delay 1.8s + duration 2.4s = 4.2s).
const MAX_ANIM_END_MS = 5000;

/**
 * Build video HTML from content + platform config.
 * Injects:
 *   1) CSS override: pause all CSS animations immediately
 *   2) <script>: pauses WAAPI animations, exposes window.__hf seek protocol
 */
function buildVideoHTML({ content, platform, videoDuration }) {
  const baseHtml = assembleHTML({
    themeName: content.__theme || 'minimal-white',
    themeCSS: content.__themeCSS || '',
    baseCSS: content.__baseCSS || '',
    layoutHTML: content.__layoutHTML || '',
    content,
    width: platform.width,
    height: platform.height,
    brandOverrideCss: content.__brandCss || '',
    params: content.__params || {},
  });

  const injectBlock = `<style>
/* Pause all CSS animations immediately so WAAPI seek drives them */
.is-animating * { animation-play-state: paused !important; }
.is-animating--text-reveal .cover__points li { animation-play-state: paused !important; }
</style>
<script>
(function(){
'use strict';
var totalAnimMs = ${MAX_ANIM_END_MS};
var dur = ${videoDuration};

function init() {
  var all = document.getAnimations();
  for (var i = 0; i < all.length; i++) { try { all[i].pause(); } catch(e) {} }

  window.__hf = {
    duration: dur,
    seek: function(t) {
      var p = Math.min(1, Math.max(0, t / dur));
      var targetMs = p * totalAnimMs;
      var anims = document.getAnimations();
      for (var i = 0; i < anims.length; i++) {
        try { anims[i].currentTime = targetMs; } catch(e) {}
      }
    }
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
})();
</script>`;

  return baseHtml.replace('</head>', injectBlock + '</head>');
}

// ── Video renderer ───────────────────────────────────────────────────────────

/**
 * Main render function.
 *
 * @param {object} opts
 * @param {object}  opts.content       — Content object (title, body, points, ...)
 * @param {string}  opts.platformKey   — 'douyin', 'bilibili', etc.
 * @param {number}  opts.duration      — Video duration in seconds
 * @param {number}  [opts.fps=24]
 * @param {string}  [opts.bgm]         — Path to background music file
 * @param {string}  [opts.output]      — Output path for mp4
 * @param {object}  [opts.htmlResources] — Pre-loaded theme/layout resources
 * @returns {Promise<string>} resolved with output path
 */
async function renderVideo(opts) {
  const {
    content, platformKey, duration: videoDuration,
    fps = 24, bgm, output: outputArg,
    htmlResources,
  } = opts;

  const platform = PLATFORMS[platformKey];
  if (!platform) throw new Error(`Unknown video platform: ${platformKey}`);

  // ── Resolve HTML resources ──────────────────────────────────────────────
  // Caller can pass pre-loaded resources to avoid re-loading per-frame.
  const themeName = htmlResources?.themeName || content.__theme || 'minimal-white';
  let themeCSS  = content.__themeCSS;
  let baseCSS   = content.__baseCSS;
  let layoutHTML = content.__layoutHTML;
  let brandCss  = content.__brandCss;
  let params    = content.__params;

  if (!themeCSS || !baseCSS || !layoutHTML) {
    // Load from disk (first call; populate content for reuse)
    themeCSS  = loadTheme(themeName);
    baseCSS   = loadBaseCSS();
    layoutHTML = htmlResources?.layoutHTML || loadLayout('cover');
    const spec = findBrandSpec(content, {});
    const merged = mergeBrandSpec(content, spec);
    if (merged) Object.assign(content, merged);
    brandCss = buildBrandOverrideCss(spec, themeName);
    params = content.__params || {};
    // Cache back so next call with same opts skips disk
    content.__theme = themeName;
    content.__themeCSS = themeCSS;
    content.__baseCSS = baseCSS;
    content.__layoutHTML = layoutHTML;
    content.__brandCss = brandCss;
    content.__params = params;
  }

  // ── Pre-flight check ────────────────────────────────────────────────────
  const check = preflight(themeCSS, params, { platform });
  for (const w of check.warnings) console.error('  ⚠', w);
  if (check.errors.length) {
    for (const e of check.errors) console.error('  ✗', e);
    throw new Error(`Pre-flight failed for ${themeName} × ${platformKey}`);
  }

  // ── Build HTML ──────────────────────────────────────────────────────────
  const html = buildVideoHTML({
    content: { ...content, __theme: themeName, __themeCSS: themeCSS, __baseCSS: baseCSS, __layoutHTML: layoutHTML, __brandCss: brandCss, __params: params },
    platform,
    videoDuration,
  });

  // ── Resolve output path ──────────────────────────────────────────────────
  const outDir = outputArg
    ? path.resolve(outputArg)
    : path.join(__dirname, '..', 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const safeBase = (content.title || 'video').replace(/[^\w一-龥]/g, '_').slice(0, 40);
  const outPath = path.join(outDir, `${safeBase}_${platformKey}.mp4`);

  // ── Frame count ──────────────────────────────────────────────────────────
  const totalFrames = Math.round(videoDuration * fps);

  // ── ffmpeg pipeline ──────────────────────────────────────────────────────
  const ffmpeg = detectFfmpeg();
  if (!ffmpeg) {
    console.error('yuanfang-html-video: ffmpeg not found.');
    console.error('');
    console.error('Install one of:');
    console.error('  macOS:   brew install ffmpeg');
    console.error('  Ubuntu:  sudo apt install ffmpeg');
    console.error('  Win:     choco install ffmpeg');
    console.error('  npm:     npm install ffmpeg-static');
    process.exit(1);
  }

  const ffArgs = [
    '-y',
    '-f', 'image2pipe',
    '-framerate', String(fps),
    '-i', '-',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '23',
  ];
  if (bgm) {
    ffArgs.push('-i', bgm, '-c:a', 'aac', '-shortest');
  }
  ffArgs.push(outPath);

  const ffProc = spawn(ffmpeg, ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });

  // ── Playwright capture ───────────────────────────────────────────────────
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: platform.width, height: platform.height },
    });

    const tmpHtml = path.join(outDir, `_vid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.html`);
    fs.writeFileSync(tmpHtml, html, 'utf-8');
    await page.goto(`file://${tmpHtml}`, { waitUntil: 'networkidle' });

    await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));

    await page.evaluate(t => { if (window.__hf) window.__hf.seek(t); }, 0);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));

    const frameTime = videoDuration / totalFrames;
    const frameRate = fps;
    let written = 0;

    for (let i = 0; i < totalFrames; i++) {
      const t = i * frameTime;

      await page.evaluate(t => {
        if (window.__hf) window.__hf.seek(t);
      }, t);

      // double rAF to ensure browser has composited the new animation state
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

      const jpgBuf = await page.screenshot({ type: 'jpeg', quality: 88 });
      ffProc.stdin.write(jpgBuf);
      written++;

      if (i % 30 === 0 || i === totalFrames - 1) {
        const pct = ((i + 1) / totalFrames * 100).toFixed(0);
        process.stderr.write(`\r  Frames: ${i + 1}/${totalFrames} (${pct}%)`);
      }
    }

    // ── Cleanup ────────────────────────────────────────────────────────────
    ffProc.stdin.end();
    fs.unlinkSync(tmpHtml);

    await new Promise((resolve, reject) => {
      ffProc.on('close', code => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
      ffProc.on('error', reject);
    });

    process.stderr.write('\n');
    return outPath;
  } finally {
    if (browser) await browser.close();
  }
}

// ── CLI entry point ──────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  // ── Help shortcut ─────────────────────────────────────────────────────────
  if (args.help || args.h) {
    console.log(`
Usage:
  node scripts/render.js --file content.json --platform douyin --duration 15 [options]

Options:
  --file <path>       JSON content file (title, body, points, ...)
  --platform <key>    Video platform: ${Object.keys(PLATFORMS).join(', ')}
  --duration <sec>    Video length (default: 15)
  --fps <n>           Frames per second (default: 24)
  --bgm <path>        Background music (aac/mp3)
  --output <dir>      Output directory (default: ./output)
  --theme <name>      yuanfang theme name
  --help              Show this help
`);
    return;
  }

  const platformKey = args.platform || 'douyin';
  if (!VIDEO_PLATFORM_KEYS.has(platformKey)) {
    console.error(`Unknown platform: ${platformKey}`);
    console.error(`Available video platforms: ${Object.keys(PLATFORMS).join(', ')}`);
    process.exit(1);
  }

  const content = args.file
    ? JSON.parse(fs.readFileSync(args.file, 'utf-8'))
    : {
        title: args.title || '',
        body: args.body || '',
        points: (args.points || '').split('|').filter(Boolean),
      };

  if (args.animation) content.animation = args.animation;
  if (args.theme)     content.__theme   = args.theme;

  const duration = parseInt(args.duration, 10) || 15;
  const fps = parseInt(args.fps, 10) || 24;

  console.log(`yuanfang-html-video render`);
  console.log(`  Platform: ${PLATFORMS[platformKey].label} (${PLATFORMS[platformKey].width}x${PLATFORMS[platformKey].height})`);
  console.log(`  Duration: ${duration}s @ ${fps}fps = ${duration * fps} frames`);
  console.log(`  Content:  ${content.title || '(no title)'}`);

  const outPath = await renderVideo({
    content,
    platformKey,
    duration,
    fps,
    bgm: args.bgm || null,
    output: args.output || null,
  });

  console.log(`\n[OK] ${outPath}`);
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  renderVideo,
  buildVideoHTML,
  PLATFORMS,
  VIDEO_PLATFORM_KEYS,
};

// ── CLI runner ───────────────────────────────────────────────────────────────

if (require.main === module) {
  main().catch(err => {
    console.error('FAIL:', err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  });
}

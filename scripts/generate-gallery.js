#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '..');
const RENDER_MODULE = require(path.join(REPO_ROOT, 'yuanfang-html-image/scripts/render.js'));
const { listThemes, loadTheme, loadBaseCSS, loadLayout, assembleHTML } = RENDER_MODULE;

const OUTPUT_DIR = path.join(REPO_ROOT, 'yuanfang-design', 'gallery');
const PREVIEWS_DIR = path.join(OUTPUT_DIR, 'previews');

const PREVIEW_SIZE = 540;

const ACCENTS = [
  { name: 'indigo',  color: '#4F46E5' },
  { name: 'emerald', color: '#059669' },
  { name: 'rose',    color: '#E11D48' },
  { name: 'amber',   color: '#D97706' },
  { name: 'slate',   color: '#475569' },
];

const SAMPLE_CONTENT = {
  title: '示例标题',
  body: '从文案到配图，AI 重塑内容创作',
  points: ['AI 文案', '智能配图', '数据驱动'],
  source: 'yuanfang · 2026',
};

function buildAccentOverrideCss(color) {
  return `[data-theme] {\n  --accent: ${color};\n  --accent-container: color-mix(in srgb, ${color} 15%, var(--bg));\n}\n`;
}

async function renderOne(page, themeName, accent) {
  const themeCSS = loadTheme(themeName);
  const baseCSS = loadBaseCSS();
  const layoutHTML = loadLayout('cover');
  const html = assembleHTML({
    themeName,
    themeCSS,
    baseCSS,
    layoutHTML,
    content: SAMPLE_CONTENT,
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    brandOverrideCss: buildAccentOverrideCss(accent.color),
  });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: path.join(PREVIEWS_DIR, `${themeName}__${accent.name}.png`),
    type: 'png',
    clip: { x: 0, y: 0, width: PREVIEW_SIZE, height: PREVIEW_SIZE },
  });
}

async function main() {
  console.log('🎨 Yuanfang Theme Gallery Generator\n');
  fs.rmSync(PREVIEWS_DIR, { recursive: true, force: true });
  fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

  const themes = listThemes();
  console.log(`📦 ${themes.length} themes × ${ACCENTS.length} accents = ${themes.length * ACCENTS.length} PNGs`);
  console.log(`📂 Output: ${path.relative(REPO_ROOT, OUTPUT_DIR)}/\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: PREVIEW_SIZE, height: PREVIEW_SIZE },
  });

  let done = 0;
  const total = themes.length * ACCENTS.length;
  for (const theme of themes) {
    for (const accent of ACCENTS) {
      await renderOne(page, theme, accent);
      done++;
    }
    console.log(`  ${theme.padEnd(28)} ${done}/${total}`);
  }
  await browser.close();

  const sections = [];
  for (const theme of themes) {
    const cards = ACCENTS.map(accent => {
      const filename = `previews/${theme}__${accent.name}.png`;
      return `
        <a class="card" href="${filename}" target="_blank" title="open full size">
          <div class="label">
            <span class="accent-name">${accent.name}</span>
          </div>
          <div class="frame">
            <img src="${filename}" loading="lazy" alt="${theme} × ${accent.name}">
          </div>
        </a>
      `;
    }).join('');
    sections.push(`
      <section class="theme-section">
        <h2>${theme}</h2>
        <div class="grid">${cards}</div>
      </section>
    `);
  }

  const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>Yuanfang Theme Gallery</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
      background: #f5f5f5;
      padding: 32px 24px;
      margin: 0;
      color: #0F172A;
    }
    h1 { margin: 0 0 8px; font-size: 24px; }
    .note { color: #64748B; font-size: 14px; margin: 0 0 24px; }
    .theme-section {
      background: white;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .theme-section h2 {
      margin: 0 0 16px;
      font-size: 14px;
      color: #475569;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }
    .card {
      display: block;
      background: white;
      border-radius: 8px;
      padding: 8px;
      text-decoration: none;
      color: inherit;
      transition: transform 0.15s ease;
    }
    .card:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .label {
      margin-bottom: 6px;
    }
    .accent-name {
      font-size: 10px;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
    }
    .frame {
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      overflow: hidden;
      background: white;
      aspect-ratio: 1;
    }
    .frame img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }
  </style>
</head>
<body>
  <h1>Yuanfang Theme Gallery</h1>
  <p class="note">${themes.length} themes × ${ACCENTS.length} accent colors = ${total} PNGs. Click any tile to view full size.</p>
  ${sections.join('\n')}
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexHtml, 'utf-8');

  console.log(`\n✅ ${total} PNGs generated`);
  console.log(`   Open:  ${path.relative(REPO_ROOT, path.join(OUTPUT_DIR, 'index.html'))}`);
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});

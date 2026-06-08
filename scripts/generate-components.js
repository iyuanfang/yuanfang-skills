#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const RENDER_MODULE = require(path.join(__dirname, '..', 'yuanfang-html-image', 'scripts', 'render.js'));
const { loadTheme, loadBaseCSS, loadLayout, assembleHTML } = RENDER_MODULE;

const THEME = process.argv[2] || 'minimal-white';
const OUT_DIR = path.join(__dirname, '..', 'yuanfang-design', 'themes', THEME);
const OUT_PATH = path.join(OUT_DIR, 'components.html');
const PREVIEWS_DIR = path.join(OUT_DIR, 'preview');

fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

const VARIANTS = [
  { label: 'Default (indigo + sans + normal + bold)', params: {} },
  { label: 'Emerald accent', params: { accent: 'emerald' } },
  { label: 'Serif type', params: { type: 'serif' } },
  { label: 'Airy density (more whitespace)', params: { density: 'airy' } },
  { label: 'Plain decor (no line/block)', params: { decor: 'plain' } },
  { label: 'Combined: rose + dense + subtle', params: { accent: 'rose', density: 'dense', decor: 'subtle' } },
];

const SAMPLE_CONTENT = {
  title: '示例标题',
  body: '从文案到配图，AI 重塑内容创作',
  points: ['AI 文案', '智能配图', '数据驱动'],
  source: 'yuanfang · 2026',
};

const themeCSS = loadTheme(THEME);
const baseCSS = loadBaseCSS();
const layoutHTML = loadLayout('cover');

const cards = VARIANTS.map((v, i) => {
  const html = assembleHTML({
    themeName: THEME,
    themeCSS,
    baseCSS,
    layoutHTML,
    content: SAMPLE_CONTENT,
    width: 540,
    height: 540,
    params: v.params,
  });
  const filename = `variant-${String(i).padStart(2, '0')}.html`;
  fs.writeFileSync(path.join(PREVIEWS_DIR, filename), html, 'utf-8');
  return `
    <div class="card">
      <div class="label">${v.label}</div>
      <iframe src="preview/${filename}" loading="lazy" title="${v.label}"></iframe>
    </div>
  `;
});

const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${THEME} — Components</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
      background: #f5f5f5;
      padding: 32px 24px;
      margin: 0;
      color: #0F172A;
    }
    h1 { margin: 0 0 8px; font-size: 24px; font-family: ui-monospace, "SF Mono", Menlo, monospace; }
    .note { color: #64748B; font-size: 14px; margin: 0 0 24px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .card {
      background: white;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .label {
      font-size: 11px;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
      margin-bottom: 8px;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
    }
    iframe {
      width: 100%;
      aspect-ratio: 1;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      display: block;
    }
  </style>
</head>
<body>
  <h1>${THEME} — Components</h1>
  <p class="note">6 个参数变体对比。所有变体都基于同一个 recipe（结构），只改 accent/type/density/decor。</p>
  <div class="grid">${cards.join('')}</div>
</body>
</html>`;

fs.writeFileSync(OUT_PATH, indexHtml, 'utf-8');
console.log(`✅ ${OUT_PATH}`);
console.log(`   ${VARIANTS.length} variants in ${PREVIEWS_DIR}/`);

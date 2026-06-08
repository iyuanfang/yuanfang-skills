#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const RENDER_MODULE = require(path.join(REPO_ROOT, 'yuanfang-html-image/scripts/render.js'));
const { listThemes, loadTheme, loadBaseCSS, loadLayout, assembleHTML } = RENDER_MODULE;

const OUTPUT_DIR = path.join(REPO_ROOT, 'yuanfang-design', 'gallery');
const PREVIEWS_DIR = path.join(OUTPUT_DIR, 'previews');

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

const PREVIEW_SIZE = 540;

function buildAccentOverrideCss(accentColor) {
  return `[data-theme] {\n  --accent: ${accentColor};\n  --accent-container: color-mix(in srgb, ${accentColor} 15%, var(--bg));\n}\n`;
}

function buildPreviewHtml(themeName, accentColor) {
  const themeCSS = loadTheme(themeName);
  const baseCSS = loadBaseCSS();
  const layoutHTML = loadLayout('cover');
  return assembleHTML({
    themeName,
    themeCSS,
    baseCSS,
    layoutHTML,
    content: SAMPLE_CONTENT,
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    brandOverrideCss: buildAccentOverrideCss(accentColor),
  });
}

function main() {
  console.log('🎨 Yuanfang Theme Gallery Generator\n');

  fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

  const themes = listThemes();
  console.log(`📦 ${themes.length} themes × ${ACCENTS.length} accents = ${themes.length * ACCENTS.length} previews`);
  console.log(`📂 Output: ${OUTPUT_DIR}\n`);

  const sections = [];
  let successCount = 0;
  let errorCount = 0;

  for (const theme of themes) {
    const cards = [];
    for (const accent of ACCENTS) {
      const filename = `${theme}__${accent.name}.html`;
      try {
        const html = buildPreviewHtml(theme, accent.color);
        fs.writeFileSync(path.join(PREVIEWS_DIR, filename), html, 'utf-8');
        successCount++;
      } catch (e) {
        console.error(`  ✗ ${theme} × ${accent.name}: ${e.message}`);
        errorCount++;
        continue;
      }
      cards.push(`
        <div class="card">
          <h3>${accent.name}</h3>
          <div class="frame">
            <iframe src="previews/${filename}" loading="lazy" title="${theme} × ${accent.name}"></iframe>
          </div>
          <code>--theme ${theme} --accent ${accent.name}</code>
        </div>
      `);
    }
    sections.push(`
      <section class="recipe-section">
        <h2>${theme}</h2>
        <div class="grid">${cards.join('')}</div>
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
    .recipe-section {
      background: white;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .recipe-section h2 {
      margin: 0 0 16px;
      font-size: 14px;
      color: #475569;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .card h3 {
      margin: 0;
      font-size: 11px;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
    }
    .frame {
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      overflow: hidden;
      background: white;
    }
    iframe {
      width: 100%;
      aspect-ratio: 1;
      border: 0;
      display: block;
    }
    code {
      font-size: 10px;
      color: #94A3B8;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  </style>
</head>
<body>
  <h1>Yuanfang Theme Gallery</h1>
  <p class="note">${themes.length} themes × ${ACCENTS.length} accent colors = ${successCount} previews (${errorCount} failed). 选你喜欢的告诉我。</p>
  ${sections.join('\n')}
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexHtml, 'utf-8');

  const relativePath = path.relative(REPO_ROOT, path.join(OUTPUT_DIR, 'index.html'));
  console.log(`\n✅ Gallery: ${relativePath}`);
  console.log(`   ${successCount} previews generated, ${errorCount} errors`);
  console.log(`   Open:  xdg-open ${relativePath}  (or just cd to it)`);
}

main();

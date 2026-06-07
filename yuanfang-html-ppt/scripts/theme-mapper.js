'use strict';
const fs = require('node:fs');
const path = require('node:path');

const PX_TO_PT = 0.75;

function parseCSSVariables(css) {
  const vars = {};
  const re = /--([a-zA-Z0-9-_]+)\s*:\s*([^;]+?)\s*(?:;|$)/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    vars[`--${m[1]}`] = m[2].trim();
  }
  return vars;
}

function pxToPt(px) {
  if (typeof px !== 'string') return px;
  const m = px.match(/^([\d.]+)\s*px$/);
  if (m) return parseFloat(m[1]) * PX_TO_PT;
  return px;
}

function mapToPptxTheme(tokens) {
  const get = (k) => tokens[k];
  return {
    bg: get('--bg'),
    text: get('--text'),
    textSecondary: get('--secondary') || get('--text'),
    accent: get('--accent'),
    secondary: get('--secondary') || get('--accent'),
    bgAlt: get('--bg-alt'),
    fontBody: get('--font-body'),
    fontTitle: get('--font-title') || get('--font-body'),
    sizeBase: pxToPt(get('--content-size')),
    sizeH1: pxToPt(get('--title-size-w')),
    sizeH2: pxToPt(get('--title-size-s')),
    sizeH3: pxToPt(get('--title-size-c')),
    titleSizeV: pxToPt(get('--title-size-v')),
    sizeSm: pxToPt(get('--source-size')),
    badgeSize: pxToPt(get('--badge-size')),
    space1: pxToPt(get('--space-1')),
    space2: pxToPt(get('--space-2')),
    space3: pxToPt(get('--space-3')),
    space4: pxToPt(get('--space-4')),
    spacing: pxToPt(get('--space-2')),
    rectRadius: pxToPt(get('--radius')),
    shadow: get('--shadow'),
    seal: get('--seal'),
    decorTL: get('--decor-tl'),
    decorTR: get('--decor-tr'),
    decorBL: get('--decor-bl'),
    decorBR: get('--decor-br'),
    accentLine: get('--accent-line'),
    accentBlock: get('--accent-block'),
    terminalBar: get('--terminal-bar'),
    gridBg: get('--grid-bg'),
  };
}

function listThemes(designDir) {
  const dir = path.join(designDir, 'themes');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.css'))
    .map(f => f.replace(/\.css$/, ''))
    .sort();
}

function loadTheme(themeName, designDir) {
  const basePath = path.join(designDir, 'base.css');
  const themePath = path.join(designDir, 'themes', `${themeName}.css`);
  if (!fs.existsSync(themePath)) {
    const available = listThemes(designDir);
    throw new Error(
      `❌ 主题 '${themeName}' 不存在. 可用: ${available.join(', ') || '(无)'}`
    );
  }
  const baseTokens = fs.existsSync(basePath) ? parseCSSVariables(fs.readFileSync(basePath, 'utf8')) : {};
  const themeTokens = parseCSSVariables(fs.readFileSync(themePath, 'utf8'));
  const merged = { ...baseTokens, ...themeTokens };
  return mapToPptxTheme(merged);
}

module.exports = { parseCSSVariables, mapToPptxTheme, loadTheme, listThemes, pxToPt, PX_TO_PT };

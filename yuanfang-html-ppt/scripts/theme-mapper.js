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
    sizeSm: pxToPt(get('--source-size')),
    spacing: pxToPt(get('--space-2')),
    rectRadius: pxToPt(get('--radius')),
    shadow: get('--shadow'),
  };
}

function loadTheme(themeName, designDir) {
  const basePath = path.join(designDir, 'base.css');
  const themePath = path.join(designDir, 'themes', `${themeName}.css`);
  const baseTokens = fs.existsSync(basePath) ? parseCSSVariables(fs.readFileSync(basePath, 'utf8')) : {};
  const themeTokens = fs.existsSync(themePath) ? parseCSSVariables(fs.readFileSync(themePath, 'utf8')) : {};
  const merged = { ...baseTokens, ...themeTokens };
  return mapToPptxTheme(merged);
}

module.exports = { parseCSSVariables, mapToPptxTheme, loadTheme, pxToPt, PX_TO_PT };

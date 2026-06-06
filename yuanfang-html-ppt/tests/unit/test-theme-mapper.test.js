const test = require('node:test');
const assert = require('node:assert');
const { parseCSSVariables, mapToPptxTheme } = require('../../scripts/theme-mapper');

test('parseCSSVariables extracts --name: value pairs', () => {
  const css = `
    /* a comment */
    :root {
      --color-bg-primary: #ffffff;
      --font-size-h1: 32px;
      --spacing-unit: 8px;
    }
    body { color: red; }
  `;
  const vars = parseCSSVariables(css);
  assert.strictEqual(vars['--color-bg-primary'], '#ffffff');
  assert.strictEqual(vars['--font-size-h1'], '32px');
  assert.strictEqual(vars['--spacing-unit'], '8px');
  assert.strictEqual(vars['color'], undefined);
});

test('mapToPptxTheme converts px to pt (1px = 0.75pt) using real yuanfang-design tokens', () => {
  const tokens = {
    '--bg': '#ffffff',
    '--text': '#111111',
    '--accent': '#4f46e5',
    '--secondary': '#64748b',
    '--bg-alt': '#f8fafc',
    '--font-body': 'system-ui',
    '--font-title': 'Georgia, serif',
    '--content-size': '38px',
    '--title-size-w': '88px',
    '--title-size-s': '96px',
    '--title-size-c': '64px',
    '--source-size': '14px',
    '--space-2': '16px',
    '--radius': '12px',
  };
  const theme = mapToPptxTheme(tokens);
  assert.strictEqual(theme.bg, '#ffffff');
  assert.strictEqual(theme.text, '#111111');
  assert.strictEqual(theme.accent, '#4f46e5');
  assert.strictEqual(theme.bgAlt, '#f8fafc');
  assert.strictEqual(theme.fontBody, 'system-ui');
  assert.strictEqual(theme.fontTitle, 'Georgia, serif');
  assert.strictEqual(theme.sizeBase, 28.5);
  assert.strictEqual(theme.sizeH1, 66);
  assert.strictEqual(theme.sizeH2, 72);
  assert.strictEqual(theme.sizeH3, 48);
  assert.strictEqual(theme.sizeSm, 10.5);
  assert.strictEqual(theme.spacing, 12);
  assert.strictEqual(theme.rectRadius, 9);
});

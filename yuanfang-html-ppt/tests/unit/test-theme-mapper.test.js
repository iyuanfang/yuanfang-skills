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

test('mapToPptxTheme converts px to pt (1px = 0.75pt)', () => {
  const tokens = {
    '--color-bg-primary': '#ffffff',
    '--color-text-primary': '#111111',
    '--color-accent': '#4f46e5',
    '--font-family-base': 'system-ui',
    '--font-family-heading': 'Georgia, serif',
    '--font-size-base': '16px',
    '--font-size-h1': '32px',
    '--font-size-h2': '24px',
    '--font-size-sm': '14px',
    '--font-weight-bold': '700',
    '--font-weight-normal': '400',
    '--line-height-base': '1.5',
    '--spacing-unit': '8px',
    '--border-radius-base': '8px',
  };
  const theme = mapToPptxTheme(tokens);
  assert.strictEqual(theme.bg, '#ffffff');
  assert.strictEqual(theme.text, '#111111');
  assert.strictEqual(theme.accent, '#4f46e5');
  assert.strictEqual(theme.fontBody, 'system-ui');
  assert.strictEqual(theme.fontTitle, 'Georgia, serif');
  assert.strictEqual(theme.sizeBase, 12);
  assert.strictEqual(theme.sizeH1, 24);
  assert.strictEqual(theme.sizeH2, 18);
  assert.strictEqual(theme.sizeSm, 10.5);
  assert.strictEqual(theme.weightBold, 700);
  assert.strictEqual(theme.spacing, 6);
  assert.strictEqual(theme.rectRadius, 6);
});

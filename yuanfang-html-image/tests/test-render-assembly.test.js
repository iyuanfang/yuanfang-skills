const test = require('node:test');
const assert = require('node:assert');
const { assembleHTML } = require('../scripts/render');

test('assembles full HTML with data-theme attribute', () => {
  const result = assembleHTML({
    themeName: 'minimal-white',
    themeCSS: '[data-theme="minimal-white"] { --bg: #FFF; }',
    baseCSS: ':root { --bg: #FFF; --text: #000; }',
    layoutHTML: '<div class="cover">{{TITLE}}</div>',
    content: { title: 'Hello' },
  });
  assert.ok(result.includes('data-theme="minimal-white"'));
  assert.ok(result.includes('--bg: #FFF'));
  assert.ok(result.includes('Hello'));
});

test('sets viewport meta with width/height', () => {
  const result = assembleHTML({
    themeName: 'minimal-white',
    themeCSS: '',
    baseCSS: ':root {}',
    layoutHTML: '<div></div>',
    content: {},
    width: 1080,
    height: 1440,
  });
  assert.ok(result.includes('width=1080'));
  assert.ok(result.includes('height=1440'));
});

test('brand: with image renders <img>', () => {
  const result = assembleHTML({
    themeName: 'minimal-white', themeCSS: '', baseCSS: '', layoutHTML: '{{BRAND}}',
    content: { brandImage: 'data:image/png;base64,abc', brand: 'X' },
  });
  assert.ok(result.includes('<img'));
  assert.ok(result.includes('class="cover__brand-img"'));
});

test('brand: without image renders nothing (no text fallback)', () => {
  const result = assembleHTML({
    themeName: 'minimal-white', themeCSS: '', baseCSS: '', layoutHTML: '{{BRAND}}',
    content: { brand: 'ShouldNotRender' },
  });
  assert.ok(!result.includes('ShouldNotRender'));
  assert.ok(!result.includes('<img'));
});

test('brand: empty content renders nothing', () => {
  const result = assembleHTML({
    themeName: 'minimal-white', themeCSS: '', baseCSS: '', layoutHTML: '{{BRAND}}',
    content: {},
  });
  assert.ok(!result.includes('<img'));
});

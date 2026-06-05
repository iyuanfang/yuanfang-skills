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
